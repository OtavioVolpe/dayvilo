import { ErroValidacao, validarData, validarNovaTarefa, validarObjeto } from '../validacoes/tarefas.js';

export function prepararRepeticao(entrada, ancora = entrada?.tarefa?.data_prevista) {
  validarObjeto(entrada, ['tarefa', 'repeticao']);
  const tarefa = validarNovaTarefa(entrada.tarefa);
  validarData(tarefa.data_prevista);
  const regra = entrada.repeticao;
  validarObjeto(regra, ['tipo', 'ate', 'dias']);
  if (!['diaria', 'semanal', 'quinzenal', 'mensal'].includes(regra.tipo)) throw new ErroValidacao('Escolha uma frequência válida.');
  validarData(regra.ate);
  if (regra.ate < tarefa.data_prevista) throw new ErroValidacao('A data final deve ser igual ou posterior à inicial.');
  const inicio = new Date(`${tarefa.data_prevista}T12:00:00Z`);
  const fim = new Date(`${regra.ate}T12:00:00Z`);
  if ((fim - inicio) / 86400000 >= 366) throw new ErroValidacao('A repetição pode abranger até 366 dias.');
  if (['semanal', 'quinzenal'].includes(regra.tipo) && (!Array.isArray(regra.dias) || regra.dias.length === 0 || regra.dias.length > 7
    || regra.dias.some(dia => !Number.isInteger(dia) || dia < 0 || dia > 6) || new Set(regra.dias).size !== regra.dias.length)) {
    throw new ErroValidacao('Selecione os dias da semana, sem repetir.');
  }
  if (['diaria', 'mensal'].includes(regra.tipo) && regra.dias !== undefined) throw new ErroValidacao('Esta frequência não usa dias da semana.');
  const origem = new Date(`${validarData(ancora)}T12:00:00Z`);
  const segundaOrigem = new Date(origem);
  segundaOrigem.setUTCDate(origem.getUTCDate() - (origem.getUTCDay() + 6) % 7);
  const datas = [];
  for (const data = new Date(inicio); data <= fim; data.setUTCDate(data.getUTCDate() + 1)) {
    const semana = Math.floor((data - segundaOrigem) / (7 * 86400000));
    const ultimoDia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
    const inclui = regra.tipo === 'diaria'
      || (regra.tipo === 'semanal' && regra.dias.includes(data.getUTCDay()))
      || (regra.tipo === 'quinzenal' && semana % 2 === 0 && regra.dias.includes(data.getUTCDay()))
      || (regra.tipo === 'mensal' && data.getUTCDate() === Math.min(origem.getUTCDate(), ultimoDia));
    if (inclui) datas.push(data.toISOString().slice(0,10));
  }
  if (!datas.length) throw new ErroValidacao('Nenhum dos dias escolhidos ocorre nesse período.');
  return { tarefa, datas };
}

export async function criarTarefasRepetidas(repositorio, usuarioId, entrada) {
  const { tarefa, datas } = prepararRepeticao(entrada);
  return repositorio.criarRepetidas(usuarioId, tarefa, datas, entrada.repeticao);
}
