export function copiarReferencia(series, referencia) {
  return series.map((serie, i) => {
    const anterior = referencia?.series[i];
    if (!anterior || serie.feita) return serie;
    return { ...serie, carga: serie.carga ?? anterior.carga, repeticoes: serie.repeticoes ?? anterior.repeticoes };
  });
}

export function copiarReferenciaCardio(registro, referencia) {
  if (!referencia || registro.feita) return registro;
  return { ...registro, duracao: registro.duracao ?? referencia.duracao, distancia: registro.distancia ?? referencia.distancia };
}
