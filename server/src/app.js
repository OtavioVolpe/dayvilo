import { ordenarTarefas } from './servicos/ordenacao.js';
import { criarEntregaLocal } from './servicos/email-local.js';
import { instalarContas } from './rotas-contas.js';
import { ErroConta } from './servicos/autenticacao.js';
import express from 'express';
import { criarTarefasRepetidas } from './servicos/repeticao.js';
import { validarPeriodoHistorico } from './historico.js';
import { obterSemana } from './semana.js';
import { criarRepositorioTarefas } from './repositorio-tarefas.js';
import { ErroValidacao, obterDataHoje, validarData, validarId, validarNovaTarefa, validarObjeto } from './validacao-tarefas.js';

export function criarAplicacao({ banco, porta = 3001, modoEmail = 'local', enviarEmail = criarEntregaLocal(), urlAplicacao = 'http://127.0.0.1:5173/' }) {
  const aplicacao = express();
  const tarefas = criarRepositorioTarefas(banco);
  const origens = new Set([`http://127.0.0.1:${porta}`, `http://localhost:${porta}`, 'http://127.0.0.1:5173', 'http://localhost:5173']);
  aplicacao.disable('x-powered-by');
  // Acesso local: mantém a API restrita ao computador durante o uso local.
  aplicacao.use((requisicao, resposta, proximo) => {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(requisicao.hostname)
      || (requisicao.headers.origin && !origens.has(requisicao.headers.origin))) {
      return resposta.status(403).json({ erro: 'Origem não permitida.' });
    }
    proximo();
  });
  aplicacao.use(express.json({ limit: '32kb' }));
  aplicacao.get('/api/health', (requisicao, resposta) => resposta.json({ status: 'ok', service: 'dayvilo-api' }));
  instalarContas(aplicacao, banco, { enviarEmail, urlAplicacao, modoEmail });
  aplicacao.get('/api/perfil', (requisicao, resposta) => resposta.json({
    nome: requisicao.usuario.nome, fuso_horario: requisicao.usuario.fuso_horario, data_hoje: obterDataHoje(requisicao.usuario.fuso_horario),
  }));
  aplicacao.get('/api/tarefas/atrasadas', async (requisicao, resposta) => {
    const hoje = obterDataHoje(requisicao.usuario.fuso_horario);
    resposta.json({ hoje, tarefas: await tarefas.listarAtrasadas(requisicao.usuario.id, hoje) });
  });
  aplicacao.patch('/api/tarefas/:id/situacao', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['situacao']);
    if (!['pendente', 'concluida', 'pulada'].includes(requisicao.body.situacao)) throw new ErroValidacao('Situação inválida.');
    const tarefa = await tarefas.definirSituacao(requisicao.usuario.id, id, requisicao.body.situacao);
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.patch('/api/tarefas/:id/agendamento', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['data_prevista']);
    const tarefa = await tarefas.reagendar(requisicao.usuario.id, id, validarData(requisicao.body.data_prevista));
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.get('/api/tarefas/historico', async (requisicao, resposta) => {
    const periodo = validarPeriodoHistorico(requisicao.query.inicio, requisicao.query.fim, obterDataHoje(requisicao.usuario.fuso_horario));
    resposta.json({ ...periodo, tarefas: await tarefas.listarPeriodo(requisicao.usuario.id, periodo.inicio, periodo.fim) });
  });
  aplicacao.get('/api/tarefas/semana', async (requisicao, resposta) => {
    const semana = obterSemana(requisicao.query.data ?? obterDataHoje(requisicao.usuario.fuso_horario));
    resposta.json({ ...semana, tarefas: await tarefas.listarPeriodo(requisicao.usuario.id, semana.inicio, semana.fim) });
  });
  aplicacao.get('/api/tarefas', async (requisicao, resposta) => {
    const data = requisicao.query.data === undefined
      ? obterDataHoje(requisicao.usuario.fuso_horario) : validarData(requisicao.query.data);
    resposta.json({ tarefas: await tarefas.listar(requisicao.usuario.id, data) });
  });
  aplicacao.patch('/api/tarefas/ordem', async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    resposta.json(await ordenarTarefas(banco, requisicao.usuario.id, requisicao.body));
  });
  aplicacao.post('/api/tarefas/repetidas', async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    resposta.status(201).json(await criarTarefasRepetidas(tarefas, requisicao.usuario.id, requisicao.body));
  });
  aplicacao.post('/api/tarefas', async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    const dados = validarNovaTarefa(requisicao.body);
    const tarefa = await tarefas.criar(requisicao.usuario.id, dados);
    resposta.status(201).json({ tarefa });
  });
  aplicacao.put('/api/tarefas/:id/serie', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade']);
    const dados = validarNovaTarefa(requisicao.body);
    const referencia = await tarefas.buscar(requisicao.usuario.id, id);
    if (!referencia?.serie_id) return resposta.status(404).json({ erro: 'Série não encontrada para esta tarefa.' });
    const hoje = obterDataHoje(requisicao.usuario.fuso_horario);
    const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
    const quantidade = await tarefas.editarProximas(requisicao.usuario.id, referencia.serie_id, inicio, dados);
    resposta.json({ quantidade, inicio });
  });
  aplicacao.patch('/api/tarefas/:id/serie/encerramento', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, []);
    const referencia = await tarefas.buscar(requisicao.usuario.id, id);
    if (!referencia?.serie_id) return resposta.status(404).json({ erro: 'Série não encontrada para esta tarefa.' });
    const hoje = obterDataHoje(requisicao.usuario.fuso_horario);
    const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
    const quantidade = await tarefas.encerrarProximas(requisicao.usuario.id, referencia.serie_id, inicio);
    resposta.json({ quantidade, inicio });
  });
  aplicacao.put('/api/tarefas/:id', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade', 'data_prevista']);
    if (Object.hasOwn(requisicao.body, 'data_prevista')) validarData(requisicao.body.data_prevista);
    const tarefa = await tarefas.editar(requisicao.usuario.id, id, validarNovaTarefa(requisicao.body));
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.delete('/api/tarefas/:id', async (requisicao, resposta) => {
    if (!await tarefas.excluir(requisicao.usuario.id, validarId(requisicao.params.id))) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ excluida: true });
  });
  aplicacao.patch('/api/tarefas/:id/conclusao', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['concluida']);
    if (typeof requisicao.body.concluida !== 'boolean') throw new ErroValidacao('Informe se a tarefa foi concluída.');
    const tarefa = await tarefas.definirConclusao(requisicao.usuario.id, id, requisicao.body.concluida);
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.use((requisicao, resposta) => resposta.status(404).json({ erro: 'Recurso não encontrado.' }));
  aplicacao.use((erro, _requisicao, resposta, _proximo) => {
    const status = erro instanceof ErroConta ? erro.status : erro.status === 400 ? 400 : erro.status === 413 ? 413 : 500;
    const mensagem = erro instanceof ErroValidacao || erro instanceof ErroConta ? erro.message
      : status === 400 ? 'JSON inválido.' : status === 413 ? 'Conteúdo muito grande.'
        : 'Não foi possível acessar suas tarefas. Tente novamente.';
    if (status === 500) console.error(`Falha na API: ${erro.code || 'erro interno'}`);
    resposta.status(status).json({ erro: mensagem });
  });
  return aplicacao;
}
