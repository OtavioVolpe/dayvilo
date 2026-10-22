import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { protegerProducao } from './middlewares/producao.js';
import express from 'express';
import { instalarSeo } from './seo.js';
import { criarRotasAtalhos } from './rotas/atalhos.js';
import { criarRotasFeedback } from './rotas/feedback.js';
import { criarEntregaLocal } from './servicos/email-local.js';
import { instalarContas } from './rotas/contas.js';
import { criarRotasTarefas } from './rotas/tarefas.js';
import { criarRotasTreinos } from './rotas/treinos.js';
import { criarRotasFinanceiro } from './rotas/financeiro.js';
import { criarRotasLeitura } from './rotas/leitura.js';
import { criarRotasAlimentacao } from './rotas/alimentacao.js';
import { restringirOrigemLocal } from './middlewares/origem-local.js';
import { instalarTratamentoErros } from './middlewares/erros.js';

export function criarAplicacao({ banco, porta = 3001, modoEmail = 'local', enviarEmail = criarEntregaLocal(), urlAplicacao = 'http://127.0.0.1:5173/', producao = false, proxySaltos = 0, analyticsId = '', cadastroAberto = !producao, pastaInterface = fileURLToPath(new URL('../../client/dist/', import.meta.url)) }) {
  const aplicacao = express();
  aplicacao.disable('x-powered-by');
  aplicacao.set('trust proxy', producao ? proxySaltos : false);
  aplicacao.use('/api', (req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow'); next(); });
  // A sonda de disponibilidade não consulta dados nem exige sessão.
  aplicacao.get('/api/health', (requisicao, resposta) => resposta.json({ status: 'ok', service: 'dayvilo-api' }));
  aplicacao.use(producao ? protegerProducao(urlAplicacao, Boolean(analyticsId)) : restringirOrigemLocal(porta));
  aplicacao.use((requisicao, resposta, proximo) => { resposta.locals.cookieSeguro = producao; proximo(); });
  if (producao) {
    if (!existsSync(join(pastaInterface, 'index.html'))) throw new Error('Interface não compilada. Execute npm run build antes de iniciar.');
    instalarSeo(aplicacao, { pastaInterface, urlAplicacao, cadastroAberto, analyticsId });
    const servirInterface = express.static(pastaInterface, { dotfiles: 'deny', maxAge: 0 });
    aplicacao.use((requisicao, resposta, proximo) => {
      if (requisicao.path === '/api' || requisicao.path.startsWith('/api/')) return proximo();
      return servirInterface(requisicao, resposta, proximo);
    });
  }
  aplicacao.use('/api/treinos', express.json({ limit: '128kb' }));
  aplicacao.use(express.json({ limit: '32kb' }));
  // Contas instala a sessão e a proteção antes das rotas privadas.
  instalarContas(aplicacao, banco, { enviarEmail, urlAplicacao, modoEmail, cadastroAberto });
  aplicacao.use('/api/atalhos', criarRotasAtalhos(banco));
  aplicacao.use('/api/feedback', criarRotasFeedback(banco));
  aplicacao.use('/api', criarRotasTarefas(banco));
  aplicacao.use('/api/treinos', criarRotasTreinos(banco));
  aplicacao.use('/api/financeiro', criarRotasFinanceiro(banco));
  aplicacao.use('/api/alimentacao', criarRotasAlimentacao(banco));
  aplicacao.use('/api/leitura', criarRotasLeitura(banco));
  instalarTratamentoErros(aplicacao);
  return aplicacao;
}
