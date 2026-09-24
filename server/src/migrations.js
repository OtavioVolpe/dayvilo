import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

const diretorioPadrao = new URL('../migrations/', import.meta.url);

export async function lerMigracoes(diretorio = diretorioPadrao) {
  const nomes = (await readdir(diretorio)).filter(nome => /^\d{3}_[a-z0-9_]+\.sql$/.test(nome)).sort();
  const versoes = new Set();
  return Promise.all(nomes.map(async nome => {
    const versao = nome.slice(0, 3);
    if (versoes.has(versao)) throw new Error(`Número de migração duplicado: ${versao}.`);
    versoes.add(versao);
    const sql = (await readFile(new URL(nome, diretorio), 'utf8')).replace(/\r\n/g, '\n');
    return { nome, sql, assinatura: createHash('sha256').update(sql).digest('hex') };
  }));
}

export function selecionarMigracoesPendentes(migracoes, registros) {
  const arquivos = new Map(migracoes.map(migracao => [migracao.nome, migracao]));
  for (const registro of registros) {
    if (registro.estado !== 'aplicada') {
      throw new Error(`Migração incompleta: ${registro.nome}. Verifique o banco antes de tentar novamente.`);
    }
    const arquivo = arquivos.get(registro.nome);
    if (!arquivo) throw new Error(`Arquivo de migração aplicada não encontrado: ${registro.nome}.`);
    if (arquivo.assinatura !== registro.assinatura) {
      throw new Error(`Migração já aplicada foi alterada: ${registro.nome}. Crie uma nova migração.`);
    }
  }
  const aplicadas = new Set(registros.map(registro => registro.nome));
  const ultima = registros.map(registro => registro.nome).sort().at(-1);
  const pendentes = migracoes.filter(migracao => !aplicadas.has(migracao.nome));
  if (ultima && pendentes.some(migracao => migracao.nome < ultima)) {
    throw new Error('Existe uma migração nova anterior às já aplicadas. Use uma numeração posterior.');
  }
  return pendentes;
}

export async function executarMigracoes(conexao, migracoes, log = console.log) {
  const [[{ nomeBanco }]] = await conexao.query('SELECT DATABASE() AS nomeBanco');
  if (!nomeBanco || ['mysql', 'sys', 'information_schema', 'performance_schema'].includes(nomeBanco.toLowerCase())) {
    throw new Error('Selecione uma base própria da aplicação para executar as migrações.');
  }
  const nomeBloqueio = `dayvilo:${createHash('sha256').update(nomeBanco).digest('hex').slice(0, 40)}`;
  const [[{ obtido }]] = await conexao.execute('SELECT GET_LOCK(?, 10) AS obtido', [nomeBloqueio]);
  if (obtido !== 1) throw new Error('Outra execução de migrações está em andamento.');
  try {
    const [tabelasAntigas] = await conexao.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users', 'tasks', 'schema_migrations')",
      [nomeBanco],
    );
    if (tabelasAntigas.length) {
      throw new Error('Esta base contém a estrutura antiga em inglês. Preserve os dados e planeje a conversão antes de continuar.');
    }
    await conexao.query(`CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
      nome VARCHAR(255) NOT NULL PRIMARY KEY,
      assinatura CHAR(64) NOT NULL,
      estado ENUM('iniciada', 'aplicada') NOT NULL,
      aplicada_em TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [registros] = await conexao.query('SELECT nome, assinatura, estado FROM migracoes_aplicadas ORDER BY nome');
    const pendentes = selecionarMigracoesPendentes(migracoes, registros);
    for (const migracao of pendentes) {
      // MySQL confirma DDL implicitamente. Uma falha fica registrada para inspeção,
      // sem tentar repetir automaticamente uma alteração parcialmente executada.
      await conexao.execute("INSERT INTO migracoes_aplicadas (nome, assinatura, estado) VALUES (?, ?, 'iniciada')", [migracao.nome, migracao.assinatura]);
      await conexao.query(migracao.sql);
      await conexao.execute("UPDATE migracoes_aplicadas SET estado = 'aplicada', aplicada_em = CURRENT_TIMESTAMP WHERE nome = ?", [migracao.nome]);
      log(`Aplicada: ${migracao.nome}`);
    }
    log(pendentes.length ? `${pendentes.length} migração(ões) aplicada(s).` : 'Banco já atualizado.');
    return pendentes.length;
  } finally {
    await conexao.execute('SELECT RELEASE_LOCK(?)', [nomeBloqueio]);
  }
}
