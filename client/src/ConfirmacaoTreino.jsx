import { useEffect, useId, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import './confirmacao.css';

export default function ConfirmacaoTreino({ mensagem, confirmar, cancelar, rotulo = 'Confirmar', titulo, destrutiva = false, ocupado = false, erro }) {
  const dialogo = useRef(null);
  const id = useId(), descricao = useId(), cancelamento = useRef(null), trava = useRef(false);
  useEffect(() => {
    const anterior = document.activeElement, rolagem = document.body.style.overflow;
    const bloquearRolagem = !document.querySelector('dialog[open]');
    dialogo.current.showModal();
    if (bloquearRolagem) document.body.style.overflow = 'hidden';
    cancelamento.current?.focus();
    return () => { if (bloquearRolagem) document.body.style.overflow = rolagem; if (anterior?.isConnected) anterior.focus(); };
  }, []);
  return <dialog ref={dialogo} className="confirmacao-treino confirmacao-padrao" aria-labelledby={id} aria-describedby={descricao} aria-busy={ocupado} onCancel={e => { e.preventDefault(); if (!ocupado) cancelar(); }}>
    <h2 id={id}>{destrutiva && <Trash2 className="confirmacao-alerta" size={22} aria-hidden="true" />}{titulo || (destrutiva ? rotulo + '?' : 'Confirmar ação')}</h2><p id={descricao}>{mensagem}</p>
    {erro && <p role="alert">{erro}</p>}
    <div><button ref={cancelamento} type="button" autoFocus disabled={ocupado} onClick={cancelar}>Cancelar</button><button type="button" disabled={ocupado} className={destrutiva ? 'confirmacao-perigo' : 'botao-principal'} onClick={async () => { if (trava.current || ocupado) return; trava.current = true; try { await confirmar(); } finally { trava.current = false; } }}>{ocupado ? 'Aguarde…' : rotulo}</button></div>
  </dialog>;
}
