import { ordenarTarefas } from './ordenacao.js';
import { criarTarefasRepetidas } from './repeticao.js';
import { validarPeriodoHistorico } from '../validacoes/historico.js';
import { obterSemana } from './semana.js';
import { criarRepositorioTarefas } from '../repositorios/tarefas.js';
import { ErroValidacao, obterDataHoje, validarData, validarId, validarNovaTarefa, validarObjeto } from '../validacoes/tarefas.js';
import { ErroAplicacao } from '../erros/aplicacao.js';

export function criarServicoTarefas(banco) {
  const tarefas = criarRepositorioTarefas(banco);
  return {
    async atrasadas(usuario) {
      const hoje = obterDataHoje(usuario.fuso_horario);
      return { hoje, tarefas: await tarefas.listarAtrasadas(usuario.id, hoje) };
    },
    async situacao(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['situacao']);
      if (!['pendente', 'concluida', 'pulada'].includes(entrada.situacao)) throw new ErroValidacao('Situação inválida.');
      const tarefa = await tarefas.definirSituacao(usuario.id, id, entrada.situacao);
      if (!tarefa) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      return { tarefa };
    },
    async reagendar(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['data_prevista']);
      const tarefa = await tarefas.reagendar(usuario.id, id, validarData(entrada.data_prevista));
      if (!tarefa) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      return { tarefa };
    },
    async historico(usuario, entrada) {
      const periodo = validarPeriodoHistorico(entrada.inicio, entrada.fim, obterDataHoje(usuario.fuso_horario));
      return { ...periodo, tarefas: await tarefas.listarPeriodo(usuario.id, periodo.inicio, periodo.fim) };
    },
    async semana(usuario, entrada) {
      const semana = obterSemana(entrada.data ?? obterDataHoje(usuario.fuso_horario));
      return { ...semana, tarefas: await tarefas.listarPeriodo(usuario.id, semana.inicio, semana.fim) };
    },
    async listar(usuario, entrada) {
      const data = entrada.data === undefined
        ? obterDataHoje(usuario.fuso_horario) : validarData(entrada.data);
      return { tarefas: await tarefas.listar(usuario.id, data) };
    },
    async ordenar(usuario, entrada) {
      return await ordenarTarefas(banco, usuario.id, entrada);
    },
    async repetir(usuario, entrada) {
      return await criarTarefasRepetidas(tarefas, usuario.id, entrada);
    },
    async criar(usuario, entrada) {
      const dados = validarNovaTarefa(entrada);
      const tarefa = await tarefas.criar(usuario.id, dados);
      return { tarefa };
    },
    async editarSerie(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade']);
      const dados = validarNovaTarefa(entrada);
      const referencia = await tarefas.buscar(usuario.id, id);
      if (!referencia?.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
      const hoje = obterDataHoje(usuario.fuso_horario);
      const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
      const quantidade = await tarefas.editarProximas(usuario.id, referencia.serie_id, inicio, dados);
      return { quantidade, inicio };
    },
    async encerrarSerie(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, []);
      const referencia = await tarefas.buscar(usuario.id, id);
      if (!referencia?.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
      const hoje = obterDataHoje(usuario.fuso_horario);
      const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
      const quantidade = await tarefas.encerrarProximas(usuario.id, referencia.serie_id, inicio);
      return { quantidade, inicio };
    },
    async editar(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade', 'data_prevista']);
      if (Object.hasOwn(entrada, 'data_prevista')) validarData(entrada.data_prevista);
      const tarefa = await tarefas.editar(usuario.id, id, validarNovaTarefa(entrada));
      if (!tarefa) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      return { tarefa };
    },
    async excluir(usuario, entrada, parametroId) {
      if (!await tarefas.excluir(usuario.id, validarId(parametroId))) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      return { excluida: true };
    },
    async concluir(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['concluida']);
      if (typeof entrada.concluida !== 'boolean') throw new ErroValidacao('Informe se a tarefa foi concluída.');
      const tarefa = await tarefas.definirConclusao(usuario.id, id, entrada.concluida);
      if (!tarefa) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      return { tarefa };
    },
  };
}
