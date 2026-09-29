import { configurarEmail } from './servicos/email.js';
import { criarAplicacao } from './app.js';
import { criarPoolBanco } from './db.js';

let banco;
try {
  const porta = Number(process.env.PORT || 3001);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT inválida.');
  const endereco = process.env.HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(endereco) || process.env.NODE_ENV === 'production') {
    throw new Error('Este modo de acesso é exclusivo para execução local.');
  }
  const entrega = configurarEmail();
  banco = criarPoolBanco();
  await banco.execute('SELECT id FROM contas LIMIT 0');
  const aplicacao = criarAplicacao({ banco, porta, ...entrega, urlAplicacao: process.env.URL_APLICACAO || 'http://127.0.0.1:5173/' });
  const servidor = aplicacao.listen(porta, endereco, () => console.log(`Dayvilo API: http://${endereco}:${porta}`));
  servidor.on('error', async erro => { console.error(`Não foi possível iniciar a API (${erro.code}).`); await banco.end(); process.exitCode = 1; });
  for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => servidor.close(async () => { await banco.end(); process.exit(0); }));
} catch (erro) {
  console.error(erro.code ? `Não foi possível iniciar o Dayvilo (${erro.code}). Confira a conexão com MySQL.` : erro.message);
  await banco?.end();
  process.exitCode = 1;
}
