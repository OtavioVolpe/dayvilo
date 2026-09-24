import { criarPoolBanco } from '../src/db.js';

let poolBanco;
try {
  poolBanco = criarPoolBanco();
  await poolBanco.execute('SELECT 1');
  console.log('Conexão com MySQL validada. Nenhum dado foi modificado.');
} catch (erro) {
  console.erro(erro.code ? `Não foi possível conectar ao MySQL (${erro.code}). Confira server/.env.` : erro.message);
  process.exitCode = 1;
} finally {
  await poolBanco?.end();
}
