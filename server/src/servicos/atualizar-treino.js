import { chaveExercicio as chave, cardio, registroVazio, registroPreenchido, seriePreenchida as preenchida } from './registro-treino.js';
export function adaptarRegistro(plano, realizado, novos) {
  const antigos = plano.exercicios.map(chave), nomes = novos.map(chave), usados = new Set(), perdas = [];
  const registros = novos.map(ex => {
    const nome = chave(ex), indice = antigos.indexOf(nome);
    const compativel = antigos.filter(n => n === nome).length === 1 && nomes.filter(n => n === nome).length === 1;
    const anterior = compativel && indice >= 0 ? realizado[indice] : null;
    if (anterior) {
      usados.add(indice);
      if (cardio(ex)) return structuredClone(anterior);
      if (anterior.series.slice(ex.series).some(preenchida)) perdas.push(ex.nome);
    }
    if (cardio(ex)) return registroVazio(ex);
    return { observacao: anterior?.observacao ?? '', series: Array.from({ length: ex.series }, (_, i) => anterior?.series[i] ?? { carga: null, repeticoes: null, feita: false }) };
  });
  realizado.forEach((ex, i) => { if (!usados.has(i) && registroPreenchido(ex)) perdas.push(plano.exercicios[i].nome); });
  return { registros, perdas: [...new Set(perdas)] };
}
