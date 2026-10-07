import { readFile, writeFile, mkdir, mkdtemp, rm, rename, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import mysql from 'mysql2/promise';
import { configurarBanco } from '../src/db.js';

// Apenas exporta. Nunca restaura nem executa migrações no banco de origem.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pasta = resolve(repo, '../dayvilo-backups');
const executavel = process.env.MYSQLDUMP_PATH || 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe';
const escapar = valor => '"' + String(valor).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r') + '"';
let temporario;
let conexao;
try {
  // Não herda MYSQL_* do terminal: a origem é explicitamente .env.aiven.
  const ambiente = parseEnv(await readFile(join(repo, 'server/.env.aiven'), 'utf8'));
  if (ambiente.MYSQL_SSL !== 'true' || !ambiente.MYSQL_HOST?.endsWith('.aivencloud.com')) throw new Error('Use a configuração Aiven com MYSQL_SSL=true.');
  if (!/^[a-zA-Z0-9_]+$/.test(ambiente.MYSQL_DATABASE || '')) throw new Error('Nome de banco inválido.');
  await stat(executavel);
  const config = configurarBanco(ambiente);
  conexao = await mysql.createConnection(config);
  const [tabelas] = await conexao.query('SELECT TABLE_NAME AS nome, ENGINE AS engine, TABLE_TYPE AS tipo FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [ambiente.MYSQL_DATABASE]);
  if (!tabelas.length || tabelas.some(t => t.engine !== 'InnoDB' || t.tipo !== 'BASE TABLE')) throw new Error('Esperadas apenas tabelas InnoDB em um banco não vazio.');
  await mkdir(pasta, { recursive: true, mode: 0o700 });
  temporario = await mkdtemp(join(pasta, '.conexao-'));
  const campos = { host: ambiente.MYSQL_HOST, port: ambiente.MYSQL_PORT || 3306, user: ambiente.MYSQL_USER, password: ambiente.MYSQL_PASSWORD, 'ssl-mode': 'VERIFY_IDENTITY' };
  if (config.ssl.ca) {
    campos['ssl-ca'] = join(temporario, 'ca.pem').replaceAll('\\', '/');
    await writeFile(campos['ssl-ca'], config.ssl.ca, { mode: 0o600 });
  }
  const arquivoConfig = join(temporario, 'cliente.cnf');
  await writeFile(arquivoConfig, '[client]\n' + Object.entries(campos).map(([k, v]) => `${k}=${escapar(v)}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  const destino = join(pasta, `dayvilo-online-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}.sql`);
  const parcial = destino + '.partial';
  await new Promise((ok, falha) => {
    const processo = spawn(executavel, [`--defaults-file=${arquivoConfig}`, '--single-transaction', '--quick', '--skip-lock-tables', '--no-tablespaces', '--set-gtid-purged=OFF', '--column-statistics=0', '--hex-blob', '--skip-add-drop-table', '--default-character-set=utf8mb4', `--result-file=${parcial}`, ambiente.MYSQL_DATABASE], { windowsHide: true, timeout: 120000, stdio: ['ignore', 'ignore', 'pipe'] });
    // Não imprime diagnósticos do cliente: podem incluir dados da conexão.
    let diagnostico = '';
    processo.stderr.on('data', parte => { if (diagnostico.length < 4000) diagnostico += parte.toString(); });
    processo.on('error', () => falha(new Error('Não foi possível iniciar mysqldump.')));
    processo.on('close', codigo => {
      if (codigo === 0) return ok();
      if (process.env.BACKUP_DIAGNOSTICO === 'true') {
        for (const valor of [ambiente.MYSQL_PASSWORD, ambiente.MYSQL_HOST, ambiente.MYSQL_USER, ambiente.MYSQL_DATABASE].filter(Boolean)) diagnostico = diagnostico.replaceAll(valor, '[oculto]');
        console.error(diagnostico);
      }
      falha(new Error(`mysqldump falhou (código ${codigo}); preserve .partial apenas para diagnóstico privado.`));
    });
  });
  if (!(await stat(parcial)).size) throw new Error('Backup vazio.');
  const hash = createHash('sha256');
  for await (const parte of createReadStream(parcial)) hash.update(parte);
  await writeFile(destino + '.sha256', hash.digest('hex') + '\n', { flag: 'wx', mode: 0o600 });
  await rename(parcial, destino);
  console.log(`Backup online criado: ${destino}`);
  console.log(`${tabelas.length} tabelas. Arquivo privado; não enviar ao GitHub. Recuperação precisa ser testada separadamente.`);
} catch (erro) {
  const codigos = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ER_ACCESS_DENIED_ERROR'];
  console.error(codigos.includes(erro.code) ? `Conexão indisponível (${erro.code}). Confira Aiven Running e a configuração privada.` : erro.code ? `Falha no backup (${erro.code}). Confira arquivos e conexão.` : erro.message);
  process.exitCode = 1;
} finally {
  await conexao?.end();
  // Somente o diretório temporário criado nesta execução, nunca os backups.
  if (temporario) {
    const relativo = relative(pasta, resolve(temporario));
    if (!relativo.startsWith('.conexao-') || relativo.includes('/') || relativo.includes('\\')) throw new Error('Diretório de limpeza fora do esperado.');
    await rm(temporario, { recursive: true, force: true });
  }
}
