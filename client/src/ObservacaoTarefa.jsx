import { useEffect, useId, useRef } from 'react';
import { NotebookText, X } from 'lucide-react';
import './observacao-tarefa.css';

export default function ObservacaoTarefa({ tarefa, fechar }) {
  const dialogo = useRef(null), tituloId = useId();
  useEffect(() => {
    const anterior = document.activeElement;
    const elemento = dialogo.current;
    const rolagem = document.body.style.overflow;
    elemento.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      elemento.close();
      document.body.style.overflow = rolagem;
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, []);

  function clicarFora(e) {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fechar();
  }

  return <dialog ref={dialogo} className="observacao-dialogo" aria-labelledby={tituloId}
    onCancel={e => { e.preventDefault(); fechar(); }} onClick={clicarFora}>
    <header className="observacao-topo">
      <div><span><NotebookText size={16} aria-hidden="true" />Observação</span><h2 id={tituloId}>{tarefa.titulo}</h2></div>
      <button type="button" autoFocus aria-label="Fechar observação" title="Fechar" onClick={fechar}><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="observacao-texto" tabIndex={0} role="region" aria-label="Texto da observação">{tarefa.observacao}</div>
  </dialog>;
}
