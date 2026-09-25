export function deslocarData(valor, quantidade) {
  const data = new Date(`${valor}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

export function formatarData(valor, opcoes = { day: '2-digit', month: '2-digit' }) {
  return new Intl.DateTimeFormat('pt-BR', { ...opcoes, timeZone: 'UTC' }).format(new Date(`${valor}T12:00:00Z`));
}
