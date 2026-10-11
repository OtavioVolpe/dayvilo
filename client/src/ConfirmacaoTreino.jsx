import { useEffect, useRef } from 'react';

export default function ConfirmacaoTreino({ mensagem, confirmar, cancelar }) {
  const dialogo = useRef(null);
  useEffect(() => {
    const anterior = document.activeElement;
    dialogo.current.showModal();
    return () => anterior?.focus();
  }, []);
  return <dialog ref={dialogo} className="confirmacao-treino" aria-labelledby="titulo-confirmacao-treino" onCancel={e => { e.preventDefault(); cancelar(); }}>
    <h2 id="titulo-confirmacao-treino">Confirmar ação</h2><p>{mensagem}</p>
    <div><button type="button" autoFocus onClick={cancelar}>Voltar</button><button type="button" className="botao-principal" onClick={confirmar}>Confirmar</button></div>
  </dialog>;
}
