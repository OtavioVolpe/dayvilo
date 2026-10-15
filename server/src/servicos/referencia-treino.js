const ler = v => typeof v === 'string' ? JSON.parse(v) : v;
const chave = e => e.nome.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');

// O nome deve ser único na ficha: nunca associar pela posição do exercício.
export function encontrarReferencias(planejado, anteriores) {
  const nomes = planejado.exercicios.map(chave);
  const referencias = nomes.map(() => null);
  for (const anterior of anteriores) {
    const plano = ler(anterior.planejado), realizado = ler(anterior.realizado);
    const antigos = plano.exercicios.map(chave);
    nomes.forEach((nome, i) => {
      if (referencias[i] || nomes.filter(n => n === nome).length !== 1 || antigos.filter(n => n === nome).length !== 1) return;
      const registro = realizado[antigos.indexOf(nome)];
      if (!registro?.series.some(s => s.carga !== null || s.repeticoes !== null)) return;
      referencias[i] = { data: anterior.data_prevista, series: registro.series.map(s => ({ carga: s.carga, repeticoes: s.repeticoes })) };
    });
    if (referencias.every(Boolean)) break;
  }
  return referencias;
}
