export const cardio = e => e.tipo === 'cardio';
export const chaveExercicio = e => `${cardio(e) ? 'cardio' : 'musculacao'}:${e.nome.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')}`;
export const seriePreenchida = s => s.feita || s.carga != null || s.repeticoes != null;
export const registroPreenchido = e => Boolean(e.observacao?.trim() || e.feita || e.duracao != null || e.distancia != null || e.series?.some(seriePreenchida));
export const registroVazio = e => cardio(e)
  ? { duracao: null, distancia: null, feita: false, observacao: '' }
  : { series: Array.from({ length: e.series }, () => ({ carga: null, repeticoes: null, feita: false })), observacao: '' };
