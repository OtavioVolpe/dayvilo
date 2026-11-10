import { createHash } from 'node:crypto';
import { transacionar } from './autenticacao.js';
import { ordenarTarefas } from './ordenacao.js';
import { criarTarefasRepetidas, prepararRepeticao } from './repeticao.js';
import { validarPeriodoHistorico } from '../validacoes/historico.js';
import { obterSemana } from './semana.js';
import { criarRepositorioTarefas } from '../repositorios/tarefas.js';
import { ErroValidacao, obterDataHoje, validarData, validarId, validarNovaTarefa, validarObjeto } from '../validacoes/tarefas.js';
import { ErroAplicacao } from '../erros/aplicacao.js';

function conferirVersao(recebida, atual, assunto) {
  if (recebida !== atual) {
    throw new ErroAplicacao(409, `A versão d${assunto} está desatualizada. Seu rascunho continua aberto. Recarregue a lista e reabra a edição para conferir os dados mais recentes.`);
  }
}

async function contextoSerie(repositorio, usuario, referencia, hoje, bloquear = false) {
  const inicio = referencia.data_prevista > hoje ? referencia.data_prevista : hoje;
  const regra = await repositorio.configuracaoSerie(usuario.id, referencia.serie_id, bloquear);
  const ocorrencias = await repositorio.versoesProximas(usuario.id, referencia.serie_id, inicio, hoje, bloquear);
  const versao = createHash('sha256').update(JSON.stringify([
    referencia.versao, inicio, regra.tipo, regra.dias, regra.ate, regra.inicio ?? null, ocorrencias,
  ])).digest('hex');
  return { inicio, regra, versao };
}

export function criarServicoTarefas(banco) {
  const tarefas = criarRepositorioTarefas(banco);
  async function alterar(usuario, id, permitidas, executar) {
    return transacionar(banco, async conexao => {
      await conexao.execute('SELECT id FROM usuarios WHERE id=? FOR UPDATE', [usuario.id]);
      const repositorio = criarRepositorioTarefas(conexao);
      const atual = await repositorio.buscar(usuario.id, id, true);
      if (!atual) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
      if (atual.financeiro_id) throw new ErroAplicacao(409, 'Abra o lançamento no Financeiro para alterar vencimento ou confirmar o pagamento.');
      if (!permitidas.includes(atual.situacao)) throw new ErroAplicacao(409, 'Restaure a tarefa para pendente antes de realizar esta ação.');
      return executar(repositorio, atual);
    });
  }
  return {
    async observacao(usuario, entrada, parametroId) {
      validarObjeto(entrada, ['observacao', 'anterior']);
      for (const campo of ['observacao', 'anterior']) {
        if (typeof entrada[campo] !== 'string' || entrada[campo].length > 4000) throw new ErroValidacao('A observação deve ter até 4000 caracteres.');
      }
      return alterar(usuario, validarId(parametroId), ['pendente', 'concluida', 'pulada'], async (repositorio, atual) => {
        if (atual.refeicao_id) throw new ErroValidacao('Edite os alimentos pela Alimentação.');
        if ((atual.observacao ?? '') !== entrada.anterior) throw new ErroAplicacao(409, 'A observação mudou. Feche a janela e atualize a lista antes de editar novamente.');
        return { tarefa: await repositorio.definirObservacao(usuario.id, atual.id, entrada.observacao.trim() || null) };
      });
    },
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
      const id = validarId(parametroId);
      return transacionar(banco, async conexao => {
        const repositorio = criarRepositorioTarefas(conexao);
        const tarefa = await repositorio.buscar(usuario.id, id);
        if (!tarefa?.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
        const { regra, versao } = await contextoSerie(repositorio, usuario, tarefa, obterDataHoje(usuario.fuso_horario));
        return { ...regra, versao, tarefa };
      });
    },
    async ocorrenciasSerie(usuario, entrada, parametroId) {
      validarObjeto(entrada, ['mes']);
      const referencia = await tarefas.buscar(usuario.id, validarId(parametroId));
      if (!referencia?.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
      const mes = entrada.mes ?? referencia.data_prevista.slice(0, 7);
      if (typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes)) throw new ErroValidacao('Informe um mês válido.');
      const inicio = validarData(mes + '-01');
      const final = new Date(inicio + 'T12:00:00Z'); final.setUTCMonth(final.getUTCMonth() + 1, 0);
      const lista = await tarefas.ocorrenciasSerie(usuario.id, referencia.serie_id, inicio, final.toISOString().slice(0, 10));
      return { mes, configuracao: await tarefas.configuracaoSerie(usuario.id, referencia.serie_id), ...lista };
    },
    async estenderSerie(usuario, entrada, parametroId) {
      validarObjeto(entrada, ['inicio', 'ate', 'tipo', 'dias', 'horario', 'horario_final', 'previa', 'termino_anterior']);
      if (typeof entrada.previa !== 'boolean') throw new ErroValidacao('Informe se deseja conferir ou confirmar a extensão.');
      const inicio = validarData(entrada.inicio), ate = validarData(entrada.ate);
      return alterar(usuario, validarId(parametroId), ['pendente', 'concluida', 'pulada'], async (repositorio, referencia) => {
        if (!referencia.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
        if (referencia.leitura || referencia.refeicao_id || referencia.treino_sessao_id) throw new ErroValidacao('Use a área de origem para agendar esta atividade.');
        const anterior = await repositorio.configuracaoSerie(usuario.id, referencia.serie_id, true);
        if (entrada.termino_anterior !== anterior.ate) throw new ErroAplicacao(409, 'A repetição mudou. Feche e abra novamente esta janela.');
        if (inicio < obterDataHoje(usuario.fuso_horario) || inicio <= anterior.ate) throw new ErroValidacao('Continue a partir de hoje ou de uma data após o término atual.');
        const regra = { tipo: entrada.tipo, ate, ...(['semanal', 'quinzenal'].includes(entrada.tipo) ? { dias: entrada.dias } : {}) };
        const { tarefa: dados, datas } = prepararRepeticao({ tarefa: {
          titulo: referencia.titulo, observacao: referencia.observacao, area: referencia.area, ambiente: referencia.ambiente,
          prioridade: referencia.prioridade, data_prevista: inicio, horario: entrada.horario, horario_final: entrada.horario_final,
        }, repeticao: regra }, anterior.tipo === regra.tipo ? (anterior.inicio || inicio) : inicio);
        const { ocorrencias } = await repositorio.ocorrenciasSerie(usuario.id, referencia.serie_id, inicio, ate);
        const existentes = new Set(ocorrencias.map(o => o.data_prevista));
        const novas = datas.filter(data => !existentes.has(data));
        if (!novas.length) throw new ErroValidacao('Não há novas ocorrências para adicionar nesse período.');
        if (entrada.previa) return { quantidade: novas.length, inicio: novas[0], fim: novas.at(-1) };
        const criadas = await repositorio.prolongar(usuario.id, referencia.serie_id, dados, novas);
        await repositorio.salvarConfiguracao(usuario.id, referencia.serie_id, { ...regra, inicio: anterior.tipo === regra.tipo ? (anterior.inicio || inicio) : inicio });
        return { criadas, inicio: novas[0], fim: novas.at(-1) };
      });
    },
    async editarSerie(usuario, entrada, parametroId) {
      const id = validarId(parametroId);
      validarObjeto(entrada, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade', 'ate', 'regra', 'area', 'ambiente', 'versao']);
      const { ate: fimSolicitado, regra: regraSolicitada, versao, ...camposTarefa } = entrada;
      // Validação dentro da transação preserva a área nas edições da Rotina.
      return alterar(usuario, id, ['pendente'], async (repositorio, referencia) => {
        if (!referencia.serie_id) throw new ErroAplicacao(404, 'Série não encontrada para esta tarefa.');
        if (camposTarefa.area !== undefined && camposTarefa.area !== referencia.area) throw new ErroValidacao('A área da tarefa não pode ser alterada.');
        const dados = validarNovaTarefa({ area: referencia.area, ambiente: referencia.ambiente, ...camposTarefa });
        const hoje = obterDataHoje(usuario.fuso_horario);
        const { inicio, regra: anterior, versao: versaoAtual } = await contextoSerie(repositorio, usuario, referencia, hoje, true);
        conferirVersao(versao, versaoAtual, 'a repetição');
        let criadas = 0, removidas = 0;
        if (fimSolicitado !== undefined) {
          const ate = validarData(fimSolicitado);
          if (ate < inicio) throw new ErroValidacao('O término deve ser igual ou posterior ao início das alterações.');
          if ((new Date(ate + 'T12:00:00Z') - new Date(inicio + 'T12:00:00Z')) / 86400000 >= 366) throw new ErroValidacao('O período futuro pode abranger até 366 dias.');
          let regra = anterior;
          if (ate > anterior.ate) {
            if (!anterior.tipo) {
              if (!regraSolicitada) throw new ErroValidacao('Confirme os dias da repetição antiga para prolongá-la.');
              validarObjeto(regraSolicitada, ['tipo', 'dias']);
              regra = regraSolicitada;
            }
            const datas = prepararRepeticao({ tarefa: { ...dados, data_prevista: inicio }, repeticao: { tipo: regra.tipo, ate, ...(['semanal', 'quinzenal'].includes(regra.tipo) ? { dias: regra.dias } : {}) } }, anterior.inicio || inicio).datas.filter(dia => dia > anterior.ate);
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
      validarObjeto(entrada, ['titulo', 'observacao', 'horario', 'horario_final', 'prioridade', 'data_prevista', 'area', 'ambiente', 'versao']);
      const { versao, ...campos } = entrada;
      if (Object.hasOwn(campos, 'data_prevista')) validarData(campos.data_prevista);
      return alterar(usuario, id, ['pendente'], async (repositorio, atual) => {
        if (campos.area !== undefined && campos.area !== atual.area) throw new ErroValidacao('A área da tarefa não pode ser alterada.');
        const dados = validarNovaTarefa({ area: atual.area, ambiente: atual.ambiente, ...campos });
        conferirVersao(versao, atual.versao, 'a tarefa');
        return { tarefa: await repositorio.editar(usuario.id, id, dados) };
      });
    },
    async excluir(usuario, entrada, parametroId) {
      return transacionar(banco, async c => {
        await c.execute('SELECT id FROM usuarios WHERE id=? FOR UPDATE', [usuario.id]);
        if (!await criarRepositorioTarefas(c).excluir(usuario.id, validarId(parametroId))) throw new ErroAplicacao(404, 'Tarefa não encontrada.');
        return { excluida: true };
      });
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
