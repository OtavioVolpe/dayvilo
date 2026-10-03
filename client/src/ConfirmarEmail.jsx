import { useState } from 'react';
import { Mail } from 'lucide-react';
import { solicitar } from './api.js';

export function AvisoConfirmacao({ sessao, atualizar, aviso }) {
  const [enviando, definirEnviando] = useState(false);
  const [mensagem, definirMensagem] = useState('');
  const [erro, definirErro] = useState('');
  async function enviar() {
    definirEnviando(true); definirErro(''); definirMensagem('');
    try {
      const dados = await solicitar('/contas/confirmacao', { method: 'POST' });
      definirMensagem(dados.mensagem);
      if (dados.confirmado) atualizar();
    } catch (falha) { definirErro(falha.message); }
    finally { definirEnviando(false); }
  }
  if (sessao.email_confirmado) return null;
  return <section className="confirmacao-aviso" aria-label="Confirmação de e-mail">
    <div><strong><Mail size={18} aria-hidden="true" /> Confirme seu e-mail</strong><p>Confirme {sessao.email} sem interromper sua rotina.</p></div>
    <button className="botao-secundario" disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar link de confirmação'}</button>
    {aviso && !mensagem && <p role="status">{aviso}</p>}
    {mensagem && <p role="status">{mensagem}</p>}
    {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
  </section>;
}

export default function ConfirmarEmail({ token, aoVoltar, atualizar }) {
  const [enviando, definirEnviando] = useState(false);
  const [concluido, definirConcluido] = useState(false);
  const [erro, definirErro] = useState('');
  async function confirmar() {
    definirEnviando(true); definirErro('');
    try {
      await solicitar('/contas/confirmacao/confirmar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      definirConcluido(true);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      atualizar();
      if ('BroadcastChannel' in window) { const canal = new BroadcastChannel('dayvilo-conta'); canal.postMessage('atualizar'); canal.close(); }
    } catch (falha) { definirErro(falha.message); }
    finally { definirEnviando(false); }
  }
  return <main className="acesso">
    <div className="acesso-apresentacao"><span className="acesso-simbolo"><Mail size={32} aria-hidden="true" /></span><p className="date-label">Seu espaço, sua conta</p><h1>Vamos confirmar seu e-mail.</h1><p className="subtitle">Sua senha, tarefas e histórico continuam iguais.</p></div>
    <section className="acesso-cartao" aria-labelledby="titulo-confirmacao" aria-busy={enviando}>
      <h2 id="titulo-confirmacao">{concluido ? 'E-mail confirmado!' : 'Confirme seu endereço'}</h2>
      <p className="subtitle">{concluido ? 'E-mail confirmado.' : 'Clique abaixo para confirmar seu e-mail.'}</p>
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      {!concluido && <button className="botao-principal acesso-enviar" disabled={enviando} onClick={confirmar}>{enviando ? 'Confirmando…' : 'Confirmar meu e-mail'}</button>}
      <p className="acesso-alternar"><button disabled={enviando} onClick={aoVoltar}>{concluido ? 'Continuar no Dayvilo' : 'Voltar ao Dayvilo'}</button></p>
    </section>
  </main>;
}
