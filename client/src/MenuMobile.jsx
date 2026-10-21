import { useEffect, useRef, useState, useId } from 'react';
import { Grid2X2, X, Star, UserRound, LogOut } from 'lucide-react';
import { solicitar } from './api.js';
import './menu-mobile.css';

export default function MenuMobile({ areas, view, navegar, sair, saindo }) {
  const [favoritos, setFavoritos] = useState([]), [rascunho, setRascunho] = useState([]);
  const [aberto, setAberto] = useState(false), [editando, setEditando] = useState(false);
  const [erro, setErro] = useState(''), [carregando, setCarregando] = useState(true), [salvando, setSalvando] = useState(false);
  const dialogo = useRef(null), trava = useRef(false), titulo = useId();
  async function carregar(signal) {
    setCarregando(true); setErro('');
    try { const r = await solicitar('/atalhos', { signal }); if (!signal?.aborted) setFavoritos(r.areas); }
    catch (e) { if (!signal?.aborted) setErro(e.message); }
    finally { if (!signal?.aborted) setCarregando(false); }
  }
  useEffect(() => { const c = new AbortController(); carregar(c.signal); return () => c.abort(); }, []);
  useEffect(() => {
    if (!aberto) return;
    const foco = document.activeElement, overflow = document.body.style.overflow;
    dialogo.current.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; if (foco?.isConnected) foco.focus(); };
  }, [aberto]);
  function fechar() { if (!trava.current) { setAberto(false); setEditando(false); } }
  function ir(area) { fechar(); navegar(area === 'Rotina' ? 'Hoje' : area); }
  const atual = ['Hoje', 'Semana', 'Histórico'].includes(view) ? 'Rotina' : view;
  const atalhos = [areas[0], ...favoritos.map(nome => areas.find(a => a.name === nome)).filter(Boolean)];
  async function salvar() {
    if (trava.current) return;
    trava.current = true; setSalvando(true); setErro('');
    try { const r = await solicitar('/atalhos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ areas: rascunho }) }); setFavoritos(r.areas); setEditando(false); }
    catch (e) { setErro(e.message); }
    finally { trava.current = false; setSalvando(false); }
  }
  return <>
    <nav className="menu-mobile" aria-label="Áreas pessoais no celular">
      {atalhos.map(({ name, icon: Icon }) => <button key={name} aria-current={atual === name ? 'page' : undefined} onClick={() => ir(name)}><Icon size={21} aria-hidden="true" /><span>{name}</span></button>)}
      <button aria-expanded={aberto} aria-haspopup="dialog" aria-current={!atalhos.some(a => a.name === atual) ? 'page' : undefined} onClick={() => { setAberto(true); carregar(); }}><Grid2X2 size={21} aria-hidden="true" /><span>Mais</span></button>
    </nav>
    {aberto && <dialog ref={dialogo} className="menu-mobile-painel" aria-labelledby={titulo} onCancel={e => { e.preventDefault(); fechar(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fechar(); } }}>
      <header><h2 id={titulo}>{editando ? 'Personalizar atalhos' : 'Suas áreas'}</h2><button aria-label="Fechar menu" disabled={salvando} onClick={fechar}><X size={22} /></button></header>
      {erro && <p role="alert">{erro} {!editando && <button onClick={() => carregar()}>Tentar novamente</button>}</p>}
      {editando ? <>
        <p>Escolha até duas áreas. Elas aparecem na barra na ordem em que você marcar.</p>
        <div className="menu-mobile-favoritos">{areas.slice(1).map(({ name, icon: Icon }) => <button key={name} aria-pressed={rascunho.includes(name)} disabled={salvando || (!rascunho.includes(name) && rascunho.length === 2)} onClick={() => setRascunho(r => r.includes(name) ? r.filter(n => n !== name) : [...r, name])}><Icon size={20} /><span>{name}</span><Star size={19} fill={rascunho.includes(name) ? 'currentColor' : 'none'} /></button>)}</div>
        <p role="status">{rascunho.length ? `Rotina · ${rascunho.join(' · ')} · Mais` : 'Rotina · Mais'}</p>
        <footer><button disabled={salvando} onClick={() => { setEditando(false); setErro(''); }}>Cancelar</button><button className="botao-principal" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar atalhos'}</button></footer>
      </> : <>
        <div className="menu-mobile-grade">{areas.map(({ name, icon: Icon }) => <button key={name} aria-current={atual === name ? 'page' : undefined} onClick={() => ir(name)}><Icon size={23} /><span>{name}</span></button>)}</div>
        <button className="menu-mobile-personalizar" disabled={carregando || Boolean(erro)} onClick={() => { setRascunho([...favoritos]); setEditando(true); }}><Star size={18} />{carregando ? 'Carregando atalhos…' : 'Personalizar atalhos'}</button>
        <footer><button onClick={() => ir('Conta')}><UserRound size={18} />Minha conta</button><button disabled={saindo} onClick={() => { fechar(); sair(); }}><LogOut size={18} />{saindo ? 'Saindo…' : 'Sair'}</button></footer>
      </>}
    </dialog>}
  </>;
}
