import { transacionar } from './autenticacao.js';
import { ordenarTarefas } from './ordenacao.js';
import { criarTarefasRepetidas, prepararRepeticao } from './repeticao.js';
import { validarPeriodoHistorico } from '../validacoes/historico.js';
import { obterSemana } from './semana.js';
import { criarRepositorioTarefas } from '../repositorios/tarefas.js';
import { ErroValidacao, obterDataHoje, validarData, validarId, validarNovaTarefa, validarObjeto } from '../validacoes/tarefas.js';
import { ErroAplicacao } from '../erros/aplicacao.js';

export function criarServicoTarefas(banco) {
  const tarefas = criarRepositorioTarefas(banco);
  async function alterar(usuario, id, permitidas, executar) {
    return transacionar(banco, async conexao => {
      const repositorio = criarRepositorioTarefas(conexao);
      const atual = await repositorio.buscar(usuario.id, id, true);
      if (!atual) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      if (!permitidas.includes(atual.situacao)) throw new ErroAplicacao(409, 'Restaure a tarefa para pendente antes de realizar esta ação.');
      return executar(repositorio, atual);
    });
  }
  return {
    async atrasadas(usuario) {
      const hoje = obterDataHoje(usuario.fuso_horario);
      return { hoje, tarefas: await tarefas.listarAtrasadas(usuario.id, hoje) };
    },
    async situacao(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['situacao']);
      if (!['pendente', 'concluida', 'pulada'].includes(entrada.situacao)) throw new ErroValidacao('Situação inválida.');
      return alterar(usuario, id, entrada.situacao === 'pendente' ? ['pendente', 'pulada', 'concluida'] : ['pendente'], async repositorio => ({
        tarefa: await repositorio.definirSituacao(usuario.id, id, entrada.situacao),
      }));
    },
    async reagendar(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['data_prevista']);
      return alterar(usuario, id, ['pendente'], async repositorio => ({
        tarefa: await repositorio.reagendar(usuario.id, id, validarData(entrada.data_prevista)),
      }));
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
    async consultarSerie(usuario, entrada, parametroId) {
      const referencia = await tarefas.buscar(usuario.id, validarId(parametroId));
      if (!referencia?.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
      return tarefas.configuracaoSerie(usuario.id, referencia.serie_id);
    },
    async editarSerie(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade', 'ate', 'regra']);
      const { ate: fimSolicitado, regra: regraSolicitada, ...camposTarefa } = entrada;
      const dados = validarNovaTarefa(camposTarefa);
      return alterar(usuario, id, ['pendente'], async (repositorio, referencia) => {
        if (!referencia.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
        const hoje = obterDataHoje(usuario.fuso_horario);
        const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
        let criadas = 0, removidas = 0;
        if (entrada.ate !== undefined) {
          const ate = validarData(entrada.ate);
          if (ate < inicio) throw new ErroValidacao('O término deve ser igual ou posterior ao início das alterações.');
          if ((new Date(ate + 'T12:00:00Z') - new Date(inicio + 'T12:00:00Z')) / 86400000 >= 366) throw new ErroValidacao('O período futuro pode abranger até 366 dias.');
          const anterior = await repositorio.configuracaoSerie(usuario.id, referencia.serie_id, true);
          let regra = anterior;
          if (ate > anterior.ate) {
            if (!anterior.tipo) {
              if (!entrada.regra) throw new ErroValidacao('Confirme os dias da repetição antiga para prolongá-la.');
              validarObjeto(entrada.regra, ['tipo', 'dias']);
              regra = entrada.regra;
            }
            const datas = prepararRepeticao({ tarefa: { ...dados, data_prevista: inicio }, repeticao: { tipo: regra.tipo, ate, ...(regra.tipo === 'semanal' ? { dias: regra.dias } : {}) } }).datas.filter(dia => dia > anterior.ate);
            criadas = await repositorio.prolongar(usuario.id, referencia.serie_id, dados, datas);
          }
          if (ate < anterior.ate) {
            const depois = new Date(ate + 'T12:00:00Z'); depois.setUTCDate(depois.getUTCDate() + 1);
            removidas = await repositorio.encerrarProximas(usuario.id, referencia.serie_id, depois.toISOString().slice(0,10), hoje);
          }
          await repositorio.salvarConfiguracao(usuario.id, referencia.serie_id, { tipo: regra.tipo ?? null, dias: regra.dias, ate });
        }
        const quantidade = await repositorio.editarProximas(usuario.id, referencia.serie_id, inicio, dados, hoje);
        return { quantidade, inicio, criadas, removidas };
      });
    },
    async encerrarSerie(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, []);
      return alterar(usuario, id, ['pendente'], async (repositorio, referencia) => {
        if (!referencia.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
        const hoje = obterDataHoje(usuario.fuso_horario);
        const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
        const regra = await repositorio.configuracaoSerie(usuario.id, referencia.serie_id, true);
        const quantidade = await repositorio.encerrarProximas(usuario.id, referencia.serie_id, inicio, hoje);
        const fim = new Date(inicio + 'T12:00:00Z'); fim.setUTCDate(fim.getUTCDate() - 1);
        await repositorio.salvarConfiguracao(usuario.id, referencia.serie_id, { ...regra, ate: regra.ate < inicio ? regra.ate : fim.toISOString().slice(0,10) });
        return { quantidade, inicio };
      });
    },
    async editar(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade', 'data_prevista']);
      if (Object.hasOwn(entrada, 'data_prevista')) validarData(entrada.data_prevista);
      return alterar(usuario, id, ['pendente'], async repositorio => ({
        tarefa: await repositorio.editar(usuario.id, id, validarNovaTarefa(entrada)),
      }));
    },
    async excluir(usuario, entrada, parametroId) {
      if (!await tarefas.excluir(usuario.id, validarId(parametroId))) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      return { excluida: true };
    },
    async concluir(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['concluida']);
      if (typeof entrada.concluida !== 'boolean') throw new ErroValidacao('Informe se a tarefa foi concluída.');
      return alterar(usuario, id, entrada.concluida ? ['pendente'] : ['pendente', 'concluida'], async repositorio => ({
        tarefa: await repositorio.definirConclusao(usuario.id, id, entrada.concluida),
      }));
    },
  };
}
