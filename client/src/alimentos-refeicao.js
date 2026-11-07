// Texto legível mantém compatibilidade com cópia, exportação e clientes antigos.
export function lerAlimentos(texto = '') {
  const partes = texto.split('\n\nObservação: ');
  const estruturado = partes[0].split('\n').every(l => l.startsWith('• '));
  const linhas = estruturado ? partes[0].split('\n') : texto.split(/\r?\n/).filter(l => l.trim());
  return {
    alimentos: (linhas.length ? linhas : ['']).map((linha, id) => {
      const [nome, ...quantidade] = estruturado ? linha.slice(2).split('\t') : [linha];
      return { id, nome, quantidade: quantidade.join('\t') };
    }),
    detalhe: estruturado ? partes.slice(1).join('\n\nObservação: ') : '',
  };
}
export function escreverAlimentos({ alimentos, detalhe }) {
  const lista = alimentos.map(a => `• ${a.nome.trim()}${a.quantidade.trim() ? '\t' + a.quantidade.trim() : ''}`).join('\n');
  return lista + (detalhe.trim() ? '\n\nObservação: ' + detalhe.trim() : '');
}
export function prepararRefeicao(r) {
  const campos = lerAlimentos(r.observacao);
  return { ...r, ...campos, alimentosOriginais: JSON.stringify(campos), mostrarDetalhe: Boolean(campos.detalhe) };
}
export function textoRefeicao(form) {
  const campos = { alimentos: form.alimentos, detalhe: form.detalhe };
  return JSON.stringify(campos) === form.alimentosOriginais ? form.observacao : escreverAlimentos(campos);
}
