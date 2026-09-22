import { createDatabasePool } from '../src/db.js';

let pool;
try {
  pool = createDatabasePool();
  await pool.execute('SELECT 1');
  console.log('Conexão com MySQL validada. Nenhum dado foi modificado.');
} catch (error) {
  console.error(error.code ? `Não foi possível conectar ao MySQL (${error.code}). Confira server/.env.` : error.message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
