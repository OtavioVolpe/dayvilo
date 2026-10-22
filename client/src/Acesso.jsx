import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Sprout } from 'lucide-react';
import { solicitar } from './api.js';
import SenhaNova from './SenhaNova.jsx';
import { registrarEvento, abrirPrivacidade, analytics } from './analytics.js';

export default function Acesso({ aoEntrar, aviso, aoRecuperar, cadastroAberto = false, cadastroInicial = false }) {
  const [criandoConta, definirCadastro] = useState(cadastroInicial);
  const cadastro = criandoConta && cadastroAberto;
  const [vincular, definirVincular] = useState(false);
  const [mostrarSenha, definirMostrarSenha] = useState(false);
  const [enviando, definirEnviando] = useState(false);
  const [erro, definirErro] = useState('');
  const titulo = useRef(null);
  useEffect(() => { try { analytics()?.pagina(cadastro ? 'cadastro' : 'entrar'); } catch {} }, [cadastro]);
  useEffect(() => { titulo.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    const campos = new FormData(evento.currentTarget);
    const dados = { email: campos.get('email'), senha: campos.get('senha') };
    if (cadastro && dados.senha !== campos.get('confirmacao')) { definirErro('As senhas não coincidem. Confira a confirmação.'); return; }
    if (cadastro) {
      dados.nome = campos.get('nome');
      dados.fuso_horario = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (vincular) dados.codigo_vinculo = campos.get('codigo').trim();
    }
    definirErro(''); definirEnviando(true);
    try {
      const sessao = await solicitar(`/contas/${cadastro ? 'cadastro' : 'entrada'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
      });
      registrarEvento(cadastro ? 'sign_up' : 'login');
      aoEntrar(sessao, { novaConta: cadastro && !vincular });
    } catch (falha) { definirErro(falha.message); }
    finally { definirEnviando(false); }
  }

  return <main className="acesso">
    <div className="acesso-apresentacao">
      <span className="acesso-simbolo"><Sprout size={32} aria-hidden="true" /></span>
      <p className="date-label">Um espaço para você</p>
      <h1>Seu dia, <br />no seu ritmo.</h1>
      <p className="subtitle">Organize sua rotina, no seu ritmo.</p>
      <a className="apresentacao-voltar" href="#inicio">Voltar à apresentação</a>
    </div>
    <section className="acesso-cartao" aria-labelledby="titulo-acesso" aria-busy={enviando}>
      <h2 id="titulo-acesso" ref={titulo} tabIndex={-1}>{cadastro ? 'Crie seu espaço' : 'Bom ter você por aqui'}</h2>
      <p className="subtitle">{cadastro ? 'Crie sua conta e comece pela área que preferir.' : 'Entre para cuidar da sua rotina.'}</p>
      {cadastroInicial && !cadastroAberto && <p className="acesso-cadastro-fechado" role="status">Novos cadastros estão temporariamente fechados. Se você já tem conta, entre abaixo.</p>}
      {aviso && <p className="aviso-tarefa" role="status">{aviso}</p>}
      <form key={cadastro ? 'cadastro' : 'entrada'} onSubmit={enviar}>
        <fieldset disabled={enviando}>
          {cadastro && <label>Como podemos chamar você?<input name="nome" autoComplete="name" maxLength={100} required /></label>}
          <label>E-mail<input name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required /></label>
          {cadastro ? <SenhaNova /> : <label>Senha<span className="campo-senha"><input name="senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="none" spellCheck={false} maxLength={256} required /><button type="button" onClick={() => definirMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha}>{mostrarSenha ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>}
          {cadastro && <details className="acesso-opcao-antiga" onToggle={evento => { if (!evento.currentTarget.open) definirVincular(false); }}>
            <summary>Tenho um código de uma rotina anterior</summary>
            <p>Esta opção é apenas para quem recebeu um código de vinculação. Se está começando agora, não precisa preencher nada aqui.</p>
            <label className="acesso-vinculo"><input type="checkbox" checked={vincular} onChange={evento => definirVincular(evento.target.checked)} />Trazer minha rotina anterior</label>
            {vincular && <div className="acesso-codigo"><label>Código de vinculação<input name="codigo" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} required aria-describedby="dica-vinculo" /></label><p className="acesso-dica" id="dica-vinculo">Use o código do seu computador para manter suas tarefas e histórico.</p></div>}
          </details>}
          {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
          {cadastro && <p className="acesso-politica">Usamos os dados informados para criar e manter sua conta. Leia a <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade e Cookies</a>. A medição de uso é opcional e tem uma escolha separada.</p>}
          <button className="botao-principal acesso-enviar" type="submit">{enviando ? cadastro ? 'Criando sua conta…' : 'Entrando…' : cadastro ? 'Criar minha conta' : 'Entrar'}</button>
        </fieldset>
      </form>
      {!cadastro && <p className="acesso-alternar acesso-recuperar"><button type="button" disabled={enviando} onClick={aoRecuperar}>Esqueci minha senha</button></p>}
      {cadastroAberto && <p className="acesso-alternar">{cadastro ? 'Já tem uma conta?' : 'Primeira vez aqui?'} <button type="button" disabled={enviando} onClick={() => { definirCadastro(!cadastro); definirErro(''); definirMostrarSenha(false); definirVincular(false); }}>{cadastro ? 'Entrar' : 'Criar conta'}</button></p>}
      <p><a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade e Cookies</a></p>
      <button type="button" className="botao-secundario" onClick={abrirPrivacidade}>Preferências de medição</button>
    </section>
  </main>;
}
