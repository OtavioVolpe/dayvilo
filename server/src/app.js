import express from 'express';
import { criarTarefasRepetidas } from './servicos/repeticao.js';
import { validarPeriodoHistorico } from './historico.js';
import { obterSemana } from './semana.js';
import { criarRepositorioTarefas } from './repositorio-tarefas.js';
import { ErroValidacao, obterDataHoje, validarData, validarId, validarNovaTarefa, validarObjeto } from './validacao-tarefas.js';

export function criarAplicacao({ banco, usuario, porta = 3001 }) {
  const aplicacao = express();
  const tarefas = criarRepositorioTarefas(banco);
  const origens = new Set([`http://127.0.0.1:${porta}`, `http://localhost:${porta}`, 'http://127.0.0.1:5173', 'http://localhost:5173']);
  aplicacao.disable('x-powered-by');
  // Acesso local: protege contra páginas externas até existir autenticação.
  aplicacao.use((requisicao, resposta, proximo) => {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(requisicao.hostname)
      || (requisicao.headers.origin && !origens.has(requisicao.headers.origin))) {
      return resposta.status(403).json({ erro: 'Origem não permitida.' });
    }
    proximo();
  });
  aplicacao.use(express.json({ limit: '32kb' }));
  aplicacao.get('/api/health', (_requisicao, resposta) => resposta.json({ status: 'ok', service: 'dayvilo-api' }));
  aplicacao.get('/api/perfil', (_requisicao, resposta) => resposta.json({
    nome: usuario.nome, fuso_horario: usuario.fuso_horario, data_hoje: obterDataHoje(usuario.fuso_horario),
  }));
  aplicacao.get('/api/tarefas/atrasadas', async (_requisicao, resposta) => {
    const hoje = obterDataHoje(usuario.fuso_horario);
    resposta.json({ hoje, tarefas: await tarefas.listarAtrasadas(usuario.id, hoje) });
  });
  aplicacao.patch('/api/tarefas/:id/situacao', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['situacao']);
    if (!['pendente', 'concluida', 'pulada'].includes(requisicao.body.situacao)) throw new ErroValidacao('Situação inválida.');
    const tarefa = await tarefas.definirSituacao(usuario.id, id, requisicao.body.situacao);
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.patch('/api/tarefas/:id/agendamento', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['data_prevista']);
    const tarefa = await tarefas.reagendar(usuario.id, id, validarData(requisicao.body.data_prevista));
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.get('/api/tarefas/historico', async (requisicao, resposta) => {
    const periodo = validarPeriodoHistorico(requisicao.query.inicio, requisicao.query.fim, obterDataHoje(usuario.fuso_horario));
    resposta.json({ ...periodo, tarefas: await tarefas.listarPeriodo(usuario.id, periodo.inicio, periodo.fim) });
  });
  aplicacao.get('/api/tarefas/semana', async (requisicao, resposta) => {
    const semana = obterSemana(requisicao.query.data ?? obterDataHoje(usuario.fuso_horario));
    resposta.json({ ...semana, tarefas: await tarefas.listarPeriodo(usuario.id, semana.inicio, semana.fim) });
  });
  aplicacao.get('/api/tarefas', async (requisicao, resposta) => {
    const data = requisicao.query.data === undefined
      ? obterDataHoje(usuario.fuso_horario) : validarData(requisicao.query.data);
    resposta.json({ tarefas: await tarefas.listar(usuario.id, data) });
  });
  aplicacao.post('/api/tarefas/repetidas', async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    resposta.status(201).json(await criarTarefasRepetidas(tarefas, usuario.id, requisicao.body));
  });
  aplicacao.post('/api/tarefas', async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    const dados = validarNovaTarefa(requisicao.body);
    const tarefa = await tarefas.criar(usuario.id, dados);
    resposta.status(201).json({ tarefa });
  });
  aplicacao.put('/api/tarefas/:id/serie', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['titulo', 'observacao', 'horario', 'prioridade']);
    const dados = validarNovaTarefa(requisicao.body);
    const referencia = await tarefas.buscar(usuario.id, id);
    if (!referencia?.serie_id) return resposta.status(404).json({ erro: 'Série não encontrada para esta tarefa.' });
    const hoje = obterDataHoje(usuario.fuso_horario);
    const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
    const quantidade = await tarefas.editarProximas(usuario.id, referencia.serie_id, inicio, dados);
    resposta.json({ quantidade, inicio });
  });
  aplicacao.patch('/api/tarefas/:id/serie/encerramento', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, []);
    const referencia = await tarefas.buscar(usuario.id, id);
    if (!referencia?.serie_id) return resposta.status(404).json({ erro: 'Série não encontrada para esta tarefa.' });
    const hoje = obterDataHoje(usuario.fuso_horario);
    const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
    const quantidade = await tarefas.encerrarProximas(usuario.id, referencia.serie_id, inicio);
    resposta.json({ quantidade, inicio });
  });
  aplicacao.put('/api/tarefas/:id', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['titulo', 'observacao', 'horario', 'prioridade', 'data_prevista']);
    if (Object.hasOwn(requisicao.body, 'data_prevista')) validarData(requisicao.body.data_prevista);
    const tarefa = await tarefas.editar(usuario.id, id, validarNovaTarefa(requisicao.body));
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.delete('/api/tarefas/:id', async (requisicao, resposta) => {
    if (!await tarefas.excluir(usuario.id, validarId(requisicao.params.id))) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ excluida: true });
  });
  aplicacao.patch('/api/tarefas/:id/conclusao', async (requisicao, resposta) => {
    const id = validarId(requisicao.params.id);
    validarObjeto(requisicao.body, ['concluida']);
    if (typeof requisicao.body.concluida !== 'boolean') throw new ErroValidacao('Informe se a tarefa foi concluída.');
    const tarefa = await tarefas.definirConclusao(usuario.id, id, requisicao.body.concluida);
    if (!tarefa) return resposta.status(404).json({ erro: 'Tarefa não encontrada.' });
    resposta.json({ tarefa });
  });
  aplicacao.use((_requisicao, resposta) => resposta.status(404).json({ erro: 'Recurso não encontrado.' }));
  aplicacao.use((erro, _requisicao, resposta, _proximo) => {
    const status = erro.status === 400 ? 400 : erro.status === 413 ? 413 : 500;
    const mensagem = erro instanceof ErroValidacao ? erro.message
      : status === 400 ? 'JSON inválido.' : status === 413 ? 'Conteúdo muito grande.'
        : 'Não foi possível acessar suas tarefas. Tente novamente.';
    if (status === 500) console.error(`Falha na API: ${erro.code || 'erro interno'}`);
    resposta.status(status).json({ erro: mensagem });
  });
  return aplicacao;
}
