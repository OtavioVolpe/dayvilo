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
  const usuarioId = Number(process.env.USUARIO_LOCAL_ID);
  if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) throw new Error('Execute npm run db:perfil para configurar o perfil local.');
  banco = criarPoolBanco();
  const [[usuario]] = await banco.execute('SELECT id, nome, fuso_horario FROM usuarios WHERE id = ?', [usuarioId]);
  if (!usuario) throw new Error('Perfil local não encontrado. Confira USUARIO_LOCAL_ID.');
  const aplicacao = criarAplicacao({ banco, usuario, porta });
  const servidor = aplicacao.listen(porta, endereco, () => console.log(`Dayvilo API: http://${endereco}:${porta}`));
  servidor.on('error', async erro => { console.error(`Não foi possível iniciar a API (${erro.code}).`); await banco.end(); process.exitCode = 1; });
  for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => servidor.close(async () => { await banco.end(); process.exit(0); }));
} catch (erro) {
  console.error(erro.code ? `Não foi possível iniciar o Dayvilo (${erro.code}). Confira a conexão com MySQL.` : erro.message);
  await banco?.end();
  process.exitCode = 1;
}
