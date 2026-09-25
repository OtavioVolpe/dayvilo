import { criarPoolBanco } from '../src/db.js';
import { lerMigracoes, executarMigracoes } from '../src/migrations.js';

let poolBanco;
let conexao;
try {
  poolBanco = criarPoolBanco();
  const migracoes = await lerMigracoes();
  conexao = await poolBanco.getConnection();
  await conexao.query("SET time_zone = '+00:00'");
  await executarMigracoes(conexao, migracoes);
} catch (erro) {
  console.error(erro.code ? `Não foi possível aplicar as migrações (${erro.code}). Confira a conexão e as permissões do banco.` : erro.message);
  process.exitCode = 1;
} finally {
  conexao?.release();
  await poolBanco?.end();
}
