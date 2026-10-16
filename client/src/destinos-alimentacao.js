import { deslocarData } from './datas.js';

function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(valor + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

// Produz a lista explícita revisada pelo servidor; não cria uma recorrência permanente.
export function destinosAlimentacao(form, origem, hoje, quantidade = 0) {
  const vazio = erro => ({ destinos: [], erro });
  const limite = deslocarData(hoje, 365);
  const inicio = form.frequencia === 'unica' ? form.destino : form.inicio;
  const fim = form.frequencia === 'unica' ? inicio : form.fim;
  if (!inicio || !fim) return vazio('Escolha a data de destino ou o período.');
  if (!dataValida(inicio) || !dataValida(fim)) return vazio('Informe datas válidas.');
  if (inicio < hoje || fim > limite) return vazio('Escolha datas entre hoje e os próximos 365 dias.');
  if (fim < inicio) return vazio('A data final deve ser igual ou posterior à inicial.');
  if (form.frequencia === 'unica' && inicio === origem) return vazio('Escolha uma data diferente do dia de origem.');
  if (form.frequencia !== 'unica' && !form.dias.length) return vazio('Escolha os dias da semana.');
  const destinos = [];
  for (let data = inicio; data <= fim; data = deslocarData(data, 1)) {
    if (data !== origem && (form.frequencia === 'unica' || form.dias.includes(new Date(data + 'T12:00:00Z').getUTCDay()))) destinos.push(data);
  }
  if (!destinos.length) return vazio('Nenhum dia de destino neste período. Ajuste as datas ou os dias escolhidos.');
  if (destinos.length > 31) return vazio('Copie para até 31 dias por vez. Reduza o período ou os dias da semana.');
  if (destinos.length * quantidade > 500) return vazio('Copie até 500 refeições por vez. Reduza os dias de destino.');
  return { destinos, erro: '' };
}
