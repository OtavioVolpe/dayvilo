import { useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { solicitar } from './api.js';
import './feedback.css';

export default function Feedback() {
  const [aberto, setAberto] = useState(false), [tipo, setTipo] = useState('sugestao');
  const [area, setArea] = useState('Geral'), [mensagem, setMensagem] = useState('');
  const [ocupado, setOcupado] = useState(false), [erro, setErro] = useState(''), [aviso, setAviso] = useState('');
  const pedido = useRef(null), trava = useRef(false);
  function mudar(setter, valor) { setter(valor); pedido.current = null; setErro(''); }
  async function enviar(e) {
    e.preventDefault();
    if (trava.current) return;
    trava.current = true; setOcupado(true); setErro(''); setAviso('');
    try {
      pedido.current ??= crypto.randomUUID();
      const resposta = await solicitar('/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ envio_id: pedido.current, tipo, area, mensagem }) });
      setAviso(resposta.mensagem); setMensagem(''); pedido.current = null;
    } catch (e) { setErro(e.message); }
    finally { trava.current = false; setOcupado(false); }
  }
  return <section className="conta-painel feedback-painel">
    <h2><MessageSquare size={19} aria-hidden="true" />Ajude a melhorar o Dayvilo</h2>
    <p className="conta-nota">Tem uma sugestão ou encontrou um problema? Conte o que podemos melhorar.</p>
    <button type="button" className="botao-secundario" aria-expanded={aberto} aria-controls="formulario-feedback" disabled={ocupado} onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar formulário' : 'Enviar feedback'}</button>
    {aberto && <form id="formulario-feedback" onSubmit={enviar} className="feedback-formulario">
      <fieldset disabled={ocupado}>
        <div className="feedback-opcoes"><label>Tipo<select value={tipo} onChange={e => mudar(setTipo, e.target.value)}><option value="sugestao">Sugestão</option><option value="problema">Relatar problema</option></select></label>
        <label>Área<select value={area} onChange={e => mudar(setArea, e.target.value)}>{['Geral', 'Rotina', 'Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura', 'Conta e instalação'].map(a => <option key={a}>{a}</option>)}</select></label></div>
        <label>Sua mensagem<textarea autoFocus value={mensagem} onChange={e => mudar(setMensagem, e.target.value)} required minLength={10} maxLength={2000} rows={5} aria-describedby="feedback-ajuda" placeholder={tipo === 'problema' ? 'O que você estava tentando fazer e o que aconteceu?' : 'O que tornaria o Dayvilo mais útil para você?'} /></label>
        <p id="feedback-ajuda" className="feedback-ajuda">O relato ficará salvo com sua conta para análise de quem desenvolve o Dayvilo. Não inclua senhas ou dados sensíveis. Este canal não oferece resposta automática por e-mail.</p>
        <button className="botao-principal" disabled={ocupado || mensagem.trim().length < 10}>{ocupado ? 'Enviando…' : 'Enviar relato'}</button>
      </fieldset>
    </form>}
    {erro && <p role="alert" className="mensagem-erro">{erro}</p>}
    {aviso && <p role="status" className="feedback-retorno">{aviso}</p>}
  </section>;
}
