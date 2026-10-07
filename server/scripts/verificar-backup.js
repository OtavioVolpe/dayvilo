import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Windows: servidor descartável, sem TCP, isolado do MySQL instalado e do Aiven.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pasta = resolve(repo, '../dayvilo-backups');
const bin = process.env.MYSQL_BIN || 'C:/Program Files/MySQL/MySQL Server 8.0/bin';
let temporario, servidor, argumentosCliente;
function executar(nome, args, entrada) {
  return new Promise((ok, falha) => {
    const p = spawn(join(bin, nome + '.exe'), args, { windowsHide: true, timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
    let saida = '';
    p.stdout.on('data', parte => { saida += parte; });
    p.stderr.resume(); // Nunca imprimir conteúdo de SQL ou credenciais.
    p.on('error', () => falha(new Error(`Não foi possível executar ${nome}.`)));
    p.on('close', codigo => codigo === 0 ? ok(saida) : falha(new Error(`${nome} falhou (${codigo}).`)));
    p.stdin.on('error', () => {});
    if (entrada) { const fluxo = createReadStream(entrada); fluxo.on('error', falha); fluxo.pipe(p.stdin); } else p.stdin.end();
  });
}
try {
  if (process.platform !== 'win32' || !process.argv[2]) throw new Error('Uso no Windows: node server/scripts/verificar-backup.js caminho.sql');
  const arquivo = resolve(process.argv[2]);
  const sql = await readFile(arquivo);
  const hash = createHash('sha256').update(sql).digest('hex');
  if (hash !== (await readFile(arquivo + '.sha256', 'utf8')).trim().toLowerCase()) throw new Error('SHA-256 não confere.');
  // Aceita somente o formato de exportação de um banco, sem trocar o destino.
  if (/^\s*(USE\s|CREATE\s+DATABASE|DROP\s+DATABASE|SOURCE\s|\\!)/im.test(sql.toString())) throw new Error('Backup contém comandos fora do banco de teste.');
  await mkdir(pasta, { recursive: true });
  temporario = await mkdtemp(join(pasta, '.restauracao-'));
  const datadir = join(temporario, 'dados');
  await mkdir(datadir);
  await executar('mysqld', ['--no-defaults', '--initialize-insecure', `--datadir=${datadir}`]);
  const canal = 'dayvilo_' + randomBytes(12).toString('hex');
  servidor = spawn(join(bin, 'mysqld.exe'), ['--no-defaults', `--datadir=${datadir}`, '--skip-networking', '--shared-memory', `--shared-memory-base-name=${canal}`, '--mysqlx=OFF'], { windowsHide: true, stdio: 'ignore' });
  servidor.on('error', () => {});
  const args = ['--no-defaults', '--protocol=MEMORY', `--shared-memory-base-name=${canal}`, '--user=root', '--skip-password', '--default-character-set=utf8mb4'];
  argumentosCliente = args;
  let pronto = false;
  for (let i = 0; i < 30; i++) {
    try { await executar('mysql', [...args, '--execute=SELECT 1']); pronto = true; break; } catch { await new Promise(r => setTimeout(r, 500)); }
  }
  if (!pronto) throw new Error('O servidor de teste não iniciou.');
  await executar('mysql', [...args, '--execute=CREATE DATABASE recuperacao CHARACTER SET utf8mb4']);
  await executar('mysql', [...args, '--binary-mode', 'recuperacao'], arquivo);
  const reexportado = await executar('mysqldump', [...args, '--no-tablespaces', '--set-gtid-purged=OFF', '--column-statistics=0', '--hex-blob', '--skip-add-drop-table', 'recuperacao']);
  const inserts = texto => texto.split(/\r?\n/).filter(linha => linha.startsWith('INSERT INTO ')).join('\n');
  if (inserts(sql.toString()) !== inserts(reexportado)) throw new Error('Dados restaurados não conferem com a exportação original.');
  const tabelas = texto => [...texto.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map(m => m[1]).sort();
  if (JSON.stringify(tabelas(sql.toString())) !== JSON.stringify(tabelas(reexportado))) throw new Error('As tabelas restauradas não conferem.');
  await writeFile(arquivo + '.verificado.json', JSON.stringify({ verificadoEm: new Date().toISOString(), sha256: hash, tabelas: tabelas(reexportado).length, restauracao: 'aprovada', dadosReexportados: 'iguais', destino: 'MySQL descartável local, sem TCP' }, null, 2) + '\n');
  console.log(`Recuperação aprovada: ${tabelas(reexportado).length} tabelas e dados reexportados iguais. Relatório: ${arquivo}.verificado.json`);
} catch (erro) { console.error(erro.code ? `Falha na verificação (${erro.code}).` : erro.message); process.exitCode = 1; }
finally {
  // No Windows mysqld pode criar um filho: shutdown encerra a instância inteira.
  if (argumentosCliente) {
    try { await executar('mysqladmin', [...argumentosCliente.filter(a => !a.startsWith('--default-character-set')), 'shutdown']); }
    catch { console.error('Não foi possível confirmar o encerramento da instância temporária.'); process.exitCode = 1; }
  }
  if (servidor && servidor.exitCode === null) {
    const terminou = new Promise(r => servidor.once('close', r));
    servidor.kill(); await terminou;
  }
  if (temporario) {
    const relativo = relative(pasta, resolve(temporario));
    if (!relativo.startsWith('.restauracao-') || relativo.includes('/') || relativo.includes('\\')) throw new Error('Diretório de limpeza fora do esperado.');
    try { await rm(temporario, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 }); }
    catch { console.error('Limpeza temporária pendente; mantenha a pasta de backups privada.'); process.exitCode = 1; }
  }
}
