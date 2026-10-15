import { useEffect, useId, useRef, useState } from 'react';
import { NotebookText, Pencil, X } from 'lucide-react';
import { solicitar } from './api.js';
import './observacao-tarefa.css';

export default function ObservacaoTarefa({ tarefa, fechar, aoSalvar }) {
  const dialogo = useRef(null), tituloId = useId();
  const campo = useRef(null), trava = useRef(false);
  const [editando, setEditando] = useState(false), [texto, setTexto] = useState(tarefa.observacao ?? '');
  const [salvando, setSalvando] = useState(false), [erro, setErro] = useState(''), [descarte, setDescarte] = useState(null);
  const sujo = editando && texto !== (tarefa.observacao ?? '');
  useEffect(() => { if (editando) campo.current?.focus(); }, [editando]);
  useEffect(() => {
    if (!sujo && !salvando) return;
    const sair = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', sair);
    return () => window.removeEventListener('beforeunload', sair);
  }, [sujo, salvando]);
  function sair(destino) {
    if (trava.current) return;
    if (sujo) { setDescarte(destino); return; }
    if (destino === 'fechar') fechar(); else { setEditando(false); setErro(''); }
  }
  async function salvar(e) {
    e.preventDefault(); if (trava.current) return;
    trava.current = true; setSalvando(true); setErro(''); setDescarte(null);
    try {
      const r = await solicitar(`/tarefas/${tarefa.id}/observacao`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ observacao: texto, anterior: tarefa.observacao ?? '' }) });
      aoSalvar(r.tarefa); setTexto(r.tarefa.observacao ?? ''); setEditando(false);
    } catch (e) { setErro(e.message); }
    finally { trava.current = false; setSalvando(false); }
  }
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
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) sair('fechar');
  }

  return <dialog ref={dialogo} className="observacao-dialogo" aria-labelledby={tituloId}
    onCancel={e => { e.preventDefault(); sair('fechar'); }} onClick={clicarFora}>
    <header className="observacao-topo">
      <div><span><NotebookText size={16} aria-hidden="true" />Observação</span><h2 id={tituloId}>{tarefa.titulo}</h2></div>
      <div className="observacao-botoes">{!editando && <button type="button" aria-label="Editar observação" title="Editar observação" onClick={() => { setTexto(tarefa.observacao ?? ''); setEditando(true); }}><Pencil size={18} aria-hidden="true" /></button>}
      <button type="button" autoFocus disabled={salvando} aria-label="Fechar observação" title="Fechar" onClick={() => sair('fechar')}><X size={20} aria-hidden="true" /></button></div>
    </header>
    {editando ? <form className="observacao-edicao" onSubmit={salvar}>
      <label htmlFor={tituloId + '-texto'}>Observação</label>
      <textarea ref={campo} id={tituloId + '-texto'} value={texto} maxLength={4000} disabled={salvando} onChange={e => setTexto(e.target.value)} />
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      <div className="observacao-acoes"><button type="button" disabled={salvando} onClick={() => sair('cancelar')}>Cancelar</button><button type="submit" className="botao-principal" disabled={salvando || !sujo}>{salvando ? 'Salvando…' : 'Salvar'}</button></div>
    </form> : <div className="observacao-texto" tabIndex={0} role="region" aria-label="Texto da observação">{tarefa.observacao || 'Sem observação.'}</div>}
    {descarte && <div className="observacao-descarte" role="group" aria-label="Descartar alterações"><p>Descartar alterações não salvas?</p><div className="observacao-acoes"><button autoFocus onClick={() => setDescarte(null)}>Continuar editando</button><button onClick={() => { const acao = descarte; setDescarte(null); setEditando(false); setTexto(tarefa.observacao ?? ''); setErro(''); if (acao === 'fechar') fechar(); }}>Descartar</button></div></div>}
  </dialog>;
}
