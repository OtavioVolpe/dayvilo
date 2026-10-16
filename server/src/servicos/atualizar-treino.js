const chave = e => e.nome.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
const preenchida = s => s.feita || s.carga !== null || s.repeticoes !== null;
export function adaptarRegistro(plano, realizado, novos) {
  const antigos = plano.exercicios.map(chave), nomes = novos.map(chave), usados = new Set(), perdas = [];
  const registros = novos.map(ex => {
    const nome = chave(ex), indice = antigos.indexOf(nome);
    const compativel = antigos.filter(n => n === nome).length === 1 && nomes.filter(n => n === nome).length === 1;
    const anterior = compativel && indice >= 0 ? realizado[indice] : null;
    if (anterior) {
      usados.add(indice);
      if (anterior.series.slice(ex.series).some(preenchida)) perdas.push(ex.nome);
    }
    return { observacao: anterior?.observacao ?? '', series: Array.from({ length: ex.series }, (_, i) => anterior?.series[i] ?? { carga: null, repeticoes: null, feita: false }) };
  });
  realizado.forEach((ex, i) => { if (!usados.has(i) && (ex.observacao.trim() || ex.series.some(preenchida))) perdas.push(plano.exercicios[i].nome); });
  return { registros, perdas: [...new Set(perdas)] };
}
