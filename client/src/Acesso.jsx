import { useState } from 'react';
import { Eye, EyeOff, Sprout } from 'lucide-react';
import { solicitar } from './api.js';

export default function Acesso({ aoEntrar, aviso, aoRecuperar, cadastroAberto = false }) {
  const [criandoConta, definirCadastro] = useState(false);
  const cadastro = criandoConta && cadastroAberto;
  const [vincular, definirVincular] = useState(false);
  const [mostrarSenha, definirMostrarSenha] = useState(false);
  const [enviando, definirEnviando] = useState(false);
  const [erro, definirErro] = useState('');

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
      aoEntrar(sessao);
    } catch (falha) { definirErro(falha.message); }
    finally { definirEnviando(false); }
  }

  return <main className="acesso">
    <div className="acesso-apresentacao">
      <span className="acesso-simbolo"><Sprout size={32} aria-hidden="true" /></span>
      <p className="date-label">Um espaço para você</p>
      <h1>Seu dia, <br />no seu ritmo.</h1>
      <p className="subtitle">Organize o que importa e construa uma rotina que faça sentido para a sua vida.</p>
    </div>
    <section className="acesso-cartao" aria-labelledby="titulo-acesso">
      <h2 id="titulo-acesso">{cadastro ? 'Crie seu espaço' : 'Bom ter você por aqui'}</h2>
      <p className="subtitle">{cadastro ? 'Comece sua rotina com uma conta pessoal.' : 'Entre para cuidar da sua rotina.'}</p>
      {aviso && <p className="aviso-tarefa" role="status">{aviso}</p>}
      <form key={cadastro ? 'cadastro' : 'entrada'} onSubmit={enviar}>
        <fieldset disabled={enviando}>
          {cadastro && <label>Como podemos chamar você?<input name="nome" autoComplete="name" maxLength={100} required /></label>}
          <label>E-mail<input name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required /></label>
          <label>Senha<span className="campo-senha"><input name="senha" type={mostrarSenha ? 'text' : 'password'} autoComplete={cadastro ? 'new-password' : 'current-password'} minLength={cadastro ? 15 : 1} maxLength={128} aria-describedby={cadastro ? 'dica-senha' : undefined} required /><button type="button" onClick={() => definirMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha}>{mostrarSenha ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
          {cadastro && <>
            <p className="acesso-dica" id="dica-senha">Use de 15 a 128 caracteres. Uma frase longa e fácil de lembrar também funciona.</p>
            <label>Confirme sua senha<input name="confirmacao" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" maxLength={128} required /></label>
            <label className="acesso-vinculo"><input type="checkbox" checked={vincular} onChange={evento => definirVincular(evento.target.checked)} />Trazer minha rotina anterior</label>
            {vincular && <div className="acesso-codigo"><label>Código de vinculação<input name="codigo" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} required aria-describedby="dica-vinculo" /></label><p className="acesso-dica" id="dica-vinculo">Use o código gerado no computador em que você já usava o Dayvilo. Suas tarefas e seu histórico serão preservados.</p></div>}
          </>}
          {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
          <button className="botao-principal acesso-enviar" type="submit">{enviando ? 'Só um instante…' : cadastro ? 'Criar minha conta' : 'Entrar'}</button>
        </fieldset>
      </form>
      {!cadastro && <p className="acesso-alternar acesso-recuperar"><button type="button" disabled={enviando} onClick={aoRecuperar}>Esqueci minha senha</button></p>}
      {cadastroAberto && <p className="acesso-alternar">{cadastro ? 'Já tem uma conta?' : 'Primeira vez aqui?'} <button type="button" disabled={enviando} onClick={() => { definirCadastro(!cadastro); definirErro(''); definirMostrarSenha(false); definirVincular(false); }}>{cadastro ? 'Entrar' : 'Criar conta'}</button></p>}
    </section>
  </main>;
}
