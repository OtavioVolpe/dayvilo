import { useEffect, useRef, useState } from 'react';
import { solicitar } from './api.js';
import './alterar-email.css';

export default function AlterarEmail({ sessao }) {
  const [aberto, setAberto] = useState(false), [email, setEmail] = useState(''), [senha, setSenha] = useState('');
  const [pendente, setPendente] = useState(null), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState(''), [aviso, setAviso] = useState('');
  const trava = useRef(false);
  useEffect(() => { const c = new AbortController(); solicitar('/contas/email', { signal: c.signal }).then(r => { if (!c.signal.aborted) setPendente(r.pendente); }).catch(e => { if (!c.signal.aborted) setErro(e.message); }); return () => c.abort(); }, []);
  async function executar(cancelar = false) {
    if (trava.current) return; trava.current = true; setOcupado(true); setErro(''); setAviso('');
    try {
      const r = await solicitar('/contas/email', cancelar ? { method: 'DELETE' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha_atual: senha }) });
      setPendente(r.pendente); setAviso(cancelar ? 'Pedido cancelado. O e-mail atual foi mantido.' : r.mensagem); setSenha(''); setAberto(false);
    } catch(e) { setErro(e.message); } finally { trava.current = false; setOcupado(false); }
  }
  return <div className="alterar-email">
    {pendente && <p role="status">Confirmação pendente para <strong>{pendente}</strong>. O link vale por 30 minutos. <button type="button" className="botao-secundario" disabled={ocupado} onClick={() => executar(true)}>Cancelar pedido</button></p>}
    {erro && <p role="alert" className="mensagem-erro">{erro}</p>}{aviso && <p role="status">{aviso}</p>}
    {!aberto ? <button type="button" className="botao-secundario" disabled={ocupado} onClick={() => { setAberto(true); setEmail(pendente || ''); setAviso(''); }}>{pendente ? 'Corrigir ou reenviar pedido' : sessao.email_confirmado ? 'Alterar e-mail' : 'Corrigir e-mail'}</button> : <form onSubmit={e => { e.preventDefault(); executar(); }}>
      <p>Seus dados serão mantidos. O endereço só muda depois da confirmação. Depois, entre novamente com o novo e-mail.</p>
      <fieldset disabled={ocupado}><label>Novo e-mail<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Senha atual<input type="password" required maxLength={256} autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} /></label><div className="conta-confirmar"><button type="button" className="botao-secundario" onClick={() => { setAberto(false); setSenha(''); }}>Cancelar</button><button className="botao-principal" type="submit">{ocupado ? 'Enviando…' : 'Confirmar novo endereço'}</button></div></fieldset>
    </form>}
  </div>;
}
