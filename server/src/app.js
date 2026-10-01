import express from 'express';
import { criarEntregaLocal } from './servicos/email-local.js';
import { instalarContas } from './rotas/contas.js';
import { criarRotasTarefas } from './rotas/tarefas.js';
import { restringirOrigemLocal } from './middlewares/origem-local.js';
import { instalarTratamentoErros } from './middlewares/erros.js';

export function criarAplicacao({ banco, porta = 3001, modoEmail = 'local', enviarEmail = criarEntregaLocal(), urlAplicacao = 'http://127.0.0.1:5173/' }) {
  const aplicacao = express();
  aplicacao.disable('x-powered-by');
  aplicacao.use(restringirOrigemLocal(porta));
  aplicacao.use(express.json({ limit: '32kb' }));
  aplicacao.get('/api/health', (requisicao, resposta) => resposta.json({ status: 'ok', service: 'dayvilo-api' }));
  // Contas instala a sessão e a proteção antes das rotas privadas.
  instalarContas(aplicacao, banco, { enviarEmail, urlAplicacao, modoEmail });
  aplicacao.use('/api', criarRotasTarefas(banco));
  instalarTratamentoErros(aplicacao);
  return aplicacao;
}
