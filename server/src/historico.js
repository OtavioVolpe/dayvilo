import { validarData, ErroValidacao } from './validacao-tarefas.js';

export function validarPeriodoHistorico(inicio, fim, hoje) {
  if (inicio === undefined && fim === undefined) {
    const data = new Date(`${hoje}T12:00:00Z`);
    data.setUTCDate(data.getUTCDate() - 29);
    inicio = data.toISOString().slice(0, 10);
    fim = hoje;
  }
  validarData(inicio);
  validarData(fim);
  if (inicio > fim) throw new ErroValidacao('A data inicial deve ser anterior ou igual à final.');
  if (fim > hoje) throw new ErroValidacao('O histórico permite consultar até hoje.');
  const quantidade = (new Date(`${fim}T12:00:00Z`) - new Date(`${inicio}T12:00:00Z`)) / 86400000 + 1;
  if (quantidade > 366) throw new ErroValidacao('Escolha um período de até 366 dias.');
  return { inicio, fim };
}
