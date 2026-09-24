import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

const defaultDirectory = new URL('../migrations/', import.meta.url);

export async function readMigrations(directory = defaultDirectory) {
  const names = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  const versions = new Set();
  return Promise.all(names.map(async name => {
    const version = name.slice(0, 3);
    if (versions.has(version)) throw new Error(`Número de migração duplicado: ${version}.`);
    versions.add(version);
    const sql = (await readFile(new URL(name, directory), 'utf8')).replace(/\r\n/g, '\n');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

export function pendingMigrations(migrations, records) {
  const files = new Map(migrations.map(migration => [migration.name, migration]));
  for (const record of records) {
    if (record.state !== 'applied') {
      throw new Error(`Migração incompleta: ${record.name}. Verifique o banco antes de tentar novamente.`);
    }
    const file = files.get(record.name);
    if (!file) throw new Error(`Arquivo de migração aplicada não encontrado: ${record.name}.`);
    if (file.checksum !== record.checksum) {
      throw new Error(`Migração já aplicada foi alterada: ${record.name}. Crie uma nova migração.`);
    }
  }
  const applied = new Set(records.map(record => record.name));
  const latest = records.map(record => record.name).sort().at(-1);
  const pending = migrations.filter(migration => !applied.has(migration.name));
  if (latest && pending.some(migration => migration.name < latest)) {
    throw new Error('Existe uma migração nova anterior às já aplicadas. Use uma numeração posterior.');
  }
  return pending;
}

export async function runMigrations(connection, migrations, log = console.log) {
  const [[{ databaseName }]] = await connection.query('SELECT DATABASE() AS databaseName');
  if (!databaseName || ['mysql', 'sys', 'information_schema', 'performance_schema'].includes(databaseName.toLowerCase())) {
    throw new Error('Selecione uma base própria da aplicação para executar as migrações.');
  }
  const lockName = `dayvilo:${createHash('sha256').update(databaseName).digest('hex').slice(0, 40)}`;
  const [[{ acquired }]] = await connection.execute('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
  if (acquired !== 1) throw new Error('Outra execução de migrações está em andamento.');
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      state ENUM('started', 'applied') NOT NULL,
      applied_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [records] = await connection.query('SELECT name, checksum, state FROM schema_migrations ORDER BY name');
    const pending = pendingMigrations(migrations, records);
    for (const migration of pending) {
      // MySQL confirma DDL implicitamente. Uma falha fica registrada para inspeção,
      // sem tentar repetir automaticamente uma alteração parcialmente executada.
      await connection.execute("INSERT INTO schema_migrations (name, checksum, state) VALUES (?, ?, 'started')", [migration.name, migration.checksum]);
      await connection.query(migration.sql);
      await connection.execute("UPDATE schema_migrations SET state = 'applied', applied_at = CURRENT_TIMESTAMP WHERE name = ?", [migration.name]);
      log(`Aplicada: ${migration.name}`);
    }
    log(pending.length ? `${pending.length} migração(ões) aplicada(s).` : 'Banco já atualizado.');
    return pending.length;
  } finally {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
  }
}
