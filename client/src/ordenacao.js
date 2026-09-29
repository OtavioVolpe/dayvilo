export const compararOrdemManual = (a, b) => Number(a.ordem === 0) - Number(b.ordem === 0) || a.ordem - b.ordem || a.id - b.id;
export function compararTarefas(modo) {
  if (modo === 'horario') return (a, b) => (a.horario || '99').localeCompare(b.horario || '99') || a.id - b.id;
  if (modo === 'criacao') return (a, b) => a.id - b.id;
  return compararOrdemManual;
}
