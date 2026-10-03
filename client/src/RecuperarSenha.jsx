import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import { solicitar } from './api.js';

export default function RecuperarSenha({ token, aoVoltar, aoSolicitarNovo }) {
  const redefinindo = token !== null;
  const [validando, definirValidando] = useState(redefinindo);
  const [linkValido, definirLinkValido] = useState(false);
  const [falhaValidacao, definirFalhaValidacao] = useState(false);
  const [tentativa, definirTentativa] = useState(0);
  const [enviando, definirEnviando] = useState(false);
  const [concluido, definirConcluido] = useState(false);
  const [mostrar, definirMostrar] = useState(false);
  const [erro, definirErro] = useState('');
  const [mensagem, definirMensagem] = useState('');
  const [entrega, definirEntrega] = useState('local');

  useEffect(() => {
    if (!redefinindo) return;
    let ativo = true;
    definirValidando(true); definirErro(''); definirFalhaValidacao(false);
    solicitar('/contas/recuperacao/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(() => { if (ativo) definirLinkValido(true); })
      .catch(falha => { if (ativo) { definirErro(falha.message); definirFalhaValidacao(true); } })
      .finally(() => { if (ativo) definirValidando(false); });
    return () => { ativo = false; };
  }, [token, redefinindo, tentativa]);

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    const campos = new FormData(evento.currentTarget);
    const senha = campos.get('senha');
    if (redefinindo && senha !== campos.get('confirmacao')) { definirErro('As senhas não coincidem. Confira a confirmação.'); return; }
    definirEnviando(true); definirErro('');
    try {
      const dados = await solicitar(`/contas/recuperacao${redefinindo ? '/redefinir' : ''}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(redefinindo ? { token, senha } : { email: campos.get('email') }),
      });
      definirEntrega(dados.entrega); definirMensagem(dados.mensagem); definirConcluido(true);
      if (redefinindo) {
        // O link sai do histórico da aba; a tela de sucesso não inicia uma sessão.
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        if ('BroadcastChannel' in window) {
          const canal = new BroadcastChannel('dayvilo-conta');
          canal.postMessage('atualizar'); canal.close();
        }
      }
    } catch (falha) { definirErro(falha.message); }
    finally { definirEnviando(false); }
  }

  return <main className="acesso">
    <div className="acesso-apresentacao">
      <span className="acesso-simbolo"><KeyRound size={32} aria-hidden="true" /></span>
      <p className="date-label">Seu espaço continua aqui</p>
      <h1>Retome seu dia.</h1>
      <p className="subtitle">Recupere o acesso sem perder sua rotina.</p>
    </div>
    <section className="acesso-cartao" aria-labelledby="titulo-recuperacao" aria-busy={enviando || validando}>
      <h2 id="titulo-recuperacao">{concluido ? redefinindo ? 'Senha atualizada' : 'Confira as instruções' : redefinindo ? 'Escolha uma nova senha' : 'Esqueceu sua senha?'}</h2>
      <p className="subtitle">{redefinindo ? 'Uma nova senha para voltar à sua rotina.' : 'Informe o e-mail usado no cadastro.'}</p>
      {validando && <p className="estado-lista" role="status">Conferindo seu link…</p>}
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      {falhaValidacao && <div className="recuperacao-acoes">
        <button className="botao-secundario" onClick={() => definirTentativa(valor => valor + 1)}>Tentar novamente</button>
        <button className="botao-principal" onClick={aoSolicitarNovo}>Solicitar novo link</button>
      </div>}
      {concluido ? <>
        <p className="aviso-tarefa" role="status"><Check size={18} aria-hidden="true" /> {mensagem}</p>
        {!redefinindo && entrega === 'local' && <p className="recuperacao-nota">Modo de teste: mensagem salva no computador, sem envio de e-mail.</p>}
        {!redefinindo && entrega === 'resend' && <p className="recuperacao-nota">Confira também a pasta de spam. O link vale por 30 minutos.</p>}
        <button className="botao-principal acesso-enviar" onClick={aoVoltar}>Voltar para entrar</button>
      </> : !validando && (!redefinindo || linkValido) && !falhaValidacao && <form onSubmit={enviar}>
        <fieldset disabled={enviando}>
          {redefinindo ? <>
            <label htmlFor="nova-senha">Nova senha</label>
            <div className="campo-senha recuperacao-senha"><input id="nova-senha" name="senha" type={mostrar ? 'text' : 'password'} autoComplete="new-password" minLength={15} maxLength={128} aria-describedby="dica-nova-senha" required /><button type="button" onClick={() => definirMostrar(!mostrar)} aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrar}>{mostrar ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
            <p className="acesso-dica" id="dica-nova-senha">Use de 15 a 128 caracteres. Uma frase longa também funciona.</p>
            <label>Confirme a nova senha<input name="confirmacao" type={mostrar ? 'text' : 'password'} autoComplete="new-password" maxLength={128} required /></label>
            <p className="recuperacao-nota">Após alterar, entre novamente em todos os dispositivos.</p>
          </> : <label>E-mail<input name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required /></label>}
          <button className="botao-principal acesso-enviar" type="submit">{enviando ? 'Só um instante…' : redefinindo ? 'Salvar nova senha' : 'Solicitar link'}</button>
        </fieldset>
      </form>}
      {redefinindo && erro && !falhaValidacao && <p className="acesso-alternar"><button type="button" disabled={enviando} onClick={aoSolicitarNovo}>Solicitar novo link</button></p>}
      {!concluido && <p className="acesso-alternar"><button type="button" disabled={enviando} onClick={aoVoltar}><ArrowLeft size={15} aria-hidden="true" /> Voltar para entrar</button></p>}
    </section>
  </main>;
}
