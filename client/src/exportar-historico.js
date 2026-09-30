// Aspas preservam separadores/quebras; o prefixo impede fórmulas em planilhas.
function celula(valor) {
  let texto = String(valor ?? '');
  if (/^[\s\uFEFF]*[=+@-]/u.test(texto) || /^[\t\r\n]/u.test(texto)) texto = "'" + texto;
  return '"' + texto.replaceAll('"', '""') + '"';
}
const situacoes = { pendente: 'Pendente', concluida: 'Concluída', pulada: 'Pulada' };
export function gerarCsvHistorico(tarefas) {
  const linhas = [['Data planejada', 'Título', 'Horário inicial', 'Horário final', 'Término no dia seguinte', 'Situação', 'Prioridade', 'Observação', 'Repetição']];
  const ordenadas = [...tarefas].sort((a, b) => (b.data_prevista || '').localeCompare(a.data_prevista || '') || (a.horario || '99').localeCompare(b.horario || '99') || a.id - b.id);
  for (const tarefa of ordenadas) linhas.push([
    tarefa.data_prevista, tarefa.titulo, tarefa.horario || '', tarefa.horario_final || '', tarefa.horario_final && tarefa.horario_final < tarefa.horario ? 'Sim' : 'Não', situacoes[tarefa.situacao] || tarefa.situacao,
    tarefa.prioridade ? 'Sim' : 'Não', tarefa.observacao, tarefa.serie_id ? 'Sim' : 'Não',
  ]);
  return '\uFEFF' + linhas.map(linha => linha.map(celula).join(';')).join('\r\n') + '\r\n';
}
export function baixarHistorico(tarefas, periodo, situacao) {
  const conteudo = gerarCsvHistorico(tarefas);
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `dayvilo-historico-${periodo.inicio}-a-${periodo.fim}-${situacao}.csv`;
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
