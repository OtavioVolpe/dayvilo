export class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.status = 400;
  }
}

export function validarData(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroValidacao('Informe uma data válida no formato AAAA-MM-DD.');
  }
  const data = new Date(`${valor}T12:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new ErroValidacao('Informe uma data que exista no calendário.');
  }
  return valor;
}

export function validarObjeto(valor, campos) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new ErroValidacao('Envie um objeto JSON válido.');
  }
  if (Object.keys(valor).some(campo => !campos.includes(campo))) {
    throw new ErroValidacao('A solicitação contém campos não permitidos.');
  }
}

export function validarNovaTarefa(dados) {
  validarObjeto(dados, ['titulo', 'observacao', 'data_prevista', 'horario', 'prioridade']);
  if (typeof dados.titulo !== 'string' || !dados.titulo.trim() || [...dados.titulo.trim()].length > 200) {
    throw new ErroValidacao('O título precisa ter entre 1 e 200 caracteres.');
  }
  if (dados.observacao != null && (typeof dados.observacao !== 'string' || [...dados.observacao].length > 4000)) {
    throw new ErroValidacao('A observação deve ser um texto com até 4000 caracteres.');
  }
  if (dados.prioridade !== undefined && typeof dados.prioridade !== 'boolean') {
    throw new ErroValidacao('A prioridade deve ser verdadeira ou falsa.');
  }
  if (dados.horario != null && (typeof dados.horario !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dados.horario))) {
    throw new ErroValidacao('Informe um horário válido no formato HH:MM.');
  }
  return {
    titulo: dados.titulo.trim(),
    observacao: dados.observacao?.trim() || null,
    data_prevista: dados.data_prevista == null ? null : validarData(dados.data_prevista),
    horario: dados.horario || null,
    prioridade: dados.prioridade ?? false,
  };
}

export function validarId(valor) {
  if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor)) || Number(valor) > 4294967295) {
    throw new ErroValidacao('Identificador de tarefa inválido.');
  }
  return Number(valor);
}

export function obterDataHoje(fusoHorario, instante = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoHorario, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instante);
  const parte = tipo => partes.find(item => item.type === tipo).value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}
