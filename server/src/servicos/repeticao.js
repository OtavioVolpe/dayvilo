import { ErroValidacao, validarData, validarNovaTarefa, validarObjeto } from '../validacao-tarefas.js';

export function prepararRepeticao(entrada) {
  validarObjeto(entrada, ['tarefa', 'repeticao']);
  const tarefa = validarNovaTarefa(entrada.tarefa);
  validarData(tarefa.data_prevista);
  const regra = entrada.repeticao;
  validarObjeto(regra, ['tipo', 'ate', 'dias']);
  if (!['diaria', 'semanal'].includes(regra.tipo)) throw new ErroValidacao('Escolha repetição diária ou semanal.');
  validarData(regra.ate);
  if (regra.ate < tarefa.data_prevista) throw new ErroValidacao('A data final deve ser igual ou posterior à inicial.');
  const inicio = new Date(`${tarefa.data_prevista}T12:00:00Z`);
  const fim = new Date(`${regra.ate}T12:00:00Z`);
  if ((fim - inicio) / 86400000 >= 366) throw new ErroValidacao('A repetição pode abranger até 366 dias.');
  if (regra.tipo === 'semanal' && (!Array.isArray(regra.dias) || regra.dias.length === 0 || regra.dias.length > 7
    || regra.dias.some(dia => !Number.isInteger(dia) || dia < 0 || dia > 6) || new Set(regra.dias).size !== regra.dias.length)) {
    throw new ErroValidacao('Selecione os dias da semana, sem repetir.');
  }
  if (regra.tipo === 'diaria' && regra.dias !== undefined) throw new ErroValidacao('A repetição diária já inclui todos os dias.');
  const datas = [];
  for (const data = new Date(inicio); data <= fim; data.setUTCDate(data.getUTCDate() + 1)) {
    if (regra.tipo === 'diaria' || regra.dias.includes(data.getUTCDay())) datas.push(data.toISOString().slice(0,10));
  }
  if (!datas.length) throw new ErroValidacao('Nenhum dos dias escolhidos ocorre nesse período.');
  return { tarefa, datas };
}

export async function criarTarefasRepetidas(repositorio, usuarioId, entrada) {
  const { tarefa, datas } = prepararRepeticao(entrada);
  return repositorio.criarRepetidas(usuarioId, tarefa, datas);
}
