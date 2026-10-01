import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { protegerProducao } from './middlewares/producao.js';
import express from 'express';
import { criarEntregaLocal } from './servicos/email-local.js';
import { instalarContas } from './rotas/contas.js';
import { criarRotasTarefas } from './rotas/tarefas.js';
import { restringirOrigemLocal } from './middlewares/origem-local.js';
import { instalarTratamentoErros } from './middlewares/erros.js';

export function criarAplicacao({ banco, porta = 3001, modoEmail = 'local', enviarEmail = criarEntregaLocal(), urlAplicacao = 'http://127.0.0.1:5173/', producao = false, proxySaltos = 0, cadastroAberto = !producao, pastaInterface = fileURLToPath(new URL('../../client/dist/', import.meta.url)) }) {
  const aplicacao = express();
  aplicacao.disable('x-powered-by');
  aplicacao.set('trust proxy', producao ? proxySaltos : false);
  // A sonda de disponibilidade não consulta dados nem exige sessão.
  aplicacao.get('/api/health', (requisicao, resposta) => resposta.json({ status: 'ok', service: 'dayvilo-api' }));
  aplicacao.use(producao ? protegerProducao(urlAplicacao) : restringirOrigemLocal(porta));
  aplicacao.use((requisicao, resposta, proximo) => { resposta.locals.cookieSeguro = producao; proximo(); });
  if (producao) {
    if (!existsSync(join(pastaInterface, 'index.html'))) throw new Error('Interface não compilada. Execute npm run build antes de iniciar.');
    const servirInterface = express.static(pastaInterface, { dotfiles: 'deny', maxAge: 0 });
    aplicacao.use((requisicao, resposta, proximo) => {
      if (requisicao.path === '/api' || requisicao.path.startsWith('/api/')) return proximo();
      return servirInterface(requisicao, resposta, proximo);
    });
    aplicacao.get('/', (requisicao, resposta) => resposta.sendFile(join(pastaInterface, 'index.html')));
  }
  aplicacao.use(express.json({ limit: '32kb' }));
  // Contas instala a sessão e a proteção antes das rotas privadas.
  instalarContas(aplicacao, banco, { enviarEmail, urlAplicacao, modoEmail, cadastroAberto });
  aplicacao.use('/api', criarRotasTarefas(banco));
  instalarTratamentoErros(aplicacao);
  return aplicacao;
}
