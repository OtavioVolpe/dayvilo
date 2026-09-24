import { createDatabasePool } from '../src/db.js';
import { readMigrations, runMigrations } from '../src/migrations.js';

let pool;
let connection;
try {
  pool = createDatabasePool();
  const migrations = await readMigrations();
  connection = await pool.getConnection();
  await connection.query("SET time_zone = '+00:00'");
  await runMigrations(connection, migrations);
} catch (error) {
  console.error(error.code ? `Não foi possível aplicar as migrações (${error.code}). Confira a conexão e as permissões do banco.` : error.message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool?.end();
}
