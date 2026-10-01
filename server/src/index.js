import { lerConfiguracao } from './configuracao/ambiente.js';
import { configurarEmail } from './servicos/email.js';
import { criarAplicacao } from './app.js';
import { criarPoolBanco } from './db.js';

let banco;
try {
  const configuracao = lerConfiguracao();
  const { porta, endereco } = configuracao;
  const entrega = configurarEmail();
  banco = criarPoolBanco();
  await banco.execute('SELECT id FROM contas LIMIT 0');
  const aplicacao = criarAplicacao({ banco, ...configuracao, ...entrega });
  const servidor = aplicacao.listen(porta, endereco, () => console.log(`Dayvilo API: http://${endereco}:${porta}`));
  servidor.on('error', async erro => { console.error(`Não foi possível iniciar a API (${erro.code}).`); await banco.end(); process.exitCode = 1; });
  for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => servidor.close(async () => { await banco.end(); process.exit(0); }));
} catch (erro) {
  console.error(erro.code ? `Não foi possível iniciar o Dayvilo (${erro.code}). Confira a conexão com MySQL.` : erro.message);
  await banco?.end();
  process.exitCode = 1;
}
