import { useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';

export default function AlcaOrdenacao({ tarefa, lista, cartoes, bloqueado, mover, indicar }) {
  const gesto = useRef(null);
  const quadro = useRef(null);
  function cancelar() {
    cancelAnimationFrame(quadro.current);
    gesto.current = null;
    indicar(null);
  }
  useEffect(() => () => cancelAnimationFrame(quadro.current), []);
  function atualizarDestino() {
    const atual = gesto.current;
    if (!atual?.ativo) return;
    const origem = lista.findIndex(item => item.id === tarefa.id);
    let destino = origem;
    lista.forEach((item, indice) => {
      const caixa = cartoes.current.get(item.id)?.getBoundingClientRect();
      if (!caixa) return;
      if (indice < origem && atual.y < caixa.top + caixa.height / 2) destino = Math.min(destino, indice);
      if (indice > origem && atual.y > caixa.top + caixa.height / 2) destino = Math.max(destino, indice);
    });
    atual.destino = destino;
    indicar({ origem: tarefa.id, destino: lista[destino].id, depois: destino > origem });
  }
  function acompanhar() {
    const atual = gesto.current;
    if (!atual?.ativo) return;
    if (atual.y < 70) window.scrollBy(0, -10);
    else if (atual.y > window.innerHeight - 70) window.scrollBy(0, 10);
    atualizarDestino();
    quadro.current = requestAnimationFrame(acompanhar);
  }
  return <button type="button" className="alca-ordenacao" disabled={bloqueado || lista.length < 2}
    aria-label={'Reordenar: ' + tarefa.titulo} aria-describedby="ajuda-ordenacao"
    title="Segure e arraste para organizar" onKeyDown={evento => {
      if (evento.key === 'Escape') { cancelar(); return; }
      if (['ArrowUp', 'ArrowDown'].includes(evento.key)) {
        evento.preventDefault(); cancelar(); mover(tarefa, evento.key === 'ArrowUp' ? -1 : 1);
      }
    }} onPointerDown={evento => {
      if (evento.button !== 0 || !evento.isPrimary) return;
      evento.currentTarget.focus();
      evento.currentTarget.setPointerCapture(evento.pointerId);
      gesto.current = { inicio: evento.clientY, y: evento.clientY, ativo: false, destino: lista.findIndex(item => item.id === tarefa.id) };
    }} onPointerMove={evento => {
      const atual = gesto.current;
      if (!atual) return;
      atual.y = evento.clientY;
      if (!atual.ativo && Math.abs(atual.y - atual.inicio) > 5) {
        atual.ativo = true; acompanhar();
      }
    }} onPointerUp={() => {
      const atual = gesto.current;
      const deslocamento = atual?.ativo ? atual.destino - lista.findIndex(item => item.id === tarefa.id) : 0;
      cancelar();
      if (deslocamento) mover(tarefa, deslocamento);
    }} onPointerCancel={cancelar} onLostPointerCapture={cancelar}>
    <GripVertical size={20} aria-hidden="true" />
  </button>;
}
