import { deslocarData, formatarData } from './datas.js';

export const semanaTreino = [[1, 'Seg', 'Segunda-feira'], [2, 'Ter', 'Terça-feira'], [3, 'Qua', 'Quarta-feira'], [4, 'Qui', 'Quinta-feira'], [5, 'Sex', 'Sexta-feira'], [6, 'Sáb', 'Sábado'], [0, 'Dom', 'Domingo']];
const diaSemana = data => new Date(`${data}T12:00:00Z`).getUTCDay();
const dataValida = data => /^\d{4}-\d{2}-\d{2}$/.test(data || '') && data >= '1000-01-01' && data <= '9999-12-31' && !Number.isNaN(Date.parse(`${data}T12:00:00Z`)) && deslocarData(data, 0) === data;

export function prepararAgendaTreino(agenda) {
  const unica = agenda.frequencia === 'unica';
  const { inicio } = agenda;
  const fim = unica ? inicio : agenda.fim;
  if (!dataValida(inicio) || !dataValida(fim)) return { erro: 'Escolha uma data válida para o treino.' };
  const intervalo = (Date.parse(fim) - Date.parse(inicio)) / 86400000;
  if (intervalo < 0) return { erro: 'O término deve ser igual ou posterior ao início.' };
  if (intervalo > 365) return { erro: 'Escolha um período de até 366 dias.' };
  const dias = unica ? [diaSemana(inicio)] : agenda.dias;
  if (!dias?.length) return { erro: 'Escolha pelo menos um dia da semana.' };
  let quantidade = 0;
  for (let i = 0; i <= intervalo; i++) if (dias.includes(diaSemana(deslocarData(inicio, i)))) quantidade++;
  if (!quantidade) return { erro: 'Nenhum dos dias escolhidos ocorre neste período.' };
  const formato = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const resumo = unica ? `Um treino em ${formatarData(inicio, { ...formato, weekday: 'long' })}.` : `${semanaTreino.filter(([n]) => dias.includes(n)).map(([, nome]) => nome).join(', ')} · de ${formatarData(inicio, formato)} a ${formatarData(fim, formato)} · ${quantidade} datas selecionadas.`;
  return { selecao: { ficha_id: agenda.ficha_id, inicio, fim, dias }, resumo, quantidade };
}
