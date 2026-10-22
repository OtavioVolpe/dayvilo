import { useState } from 'react';
import { solicitar } from './api.js';

export default function ExcluirConta({ usuarioId, encerrar }) {
  const [aberto, setAberto] = useState(false), [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  async function excluir(e) {
    e.preventDefault();
    if (ocupado) return;
    const dados = new FormData(e.currentTarget);
    setOcupado(true); setErro('');
    try {
      const resultado = await solicitar('/contas/perfil', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha_atual: dados.get('senha_atual'), confirmacao: dados.get('confirmacao') }) });
      try { localStorage.removeItem(`dayvilo-boas-vindas-${usuarioId}`); } catch {}
      encerrar(resultado.mensagem);
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <section className="conta-painel conta-exclusao"><h2>Excluir minha conta</h2>
    <p className="conta-nota">Remove sua conta, tarefas, treinos, finanças, alimentação, leituras, histórico e feedbacks do banco ativo. Todas as sessões serão encerradas. Essa ação não pode ser desfeita pelo aplicativo.</p>
    {!aberto ? <button className="botao-secundario" onClick={() => setAberto(true)}>Quero excluir minha conta</button> : <form onSubmit={excluir}>
      <p>Antes de continuar, guarde as informações que deseja manter. Cópias de segurança anteriores e dados já enviados ao Analytics não são apagados por este botão. Consulte a <a href="/privacidade#retencao" target="_blank" rel="noopener noreferrer">política de privacidade</a> ou fale com dayviloapp@gmail.com.</p>
      <fieldset disabled={ocupado}>
        <label>Senha atual<input name="senha_atual" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <label>Digite EXCLUIR para confirmar<input name="confirmacao" autoComplete="off" spellCheck={false} required pattern="EXCLUIR" /></label>
        {erro && <p role="alert" className="mensagem-erro">{erro}</p>}
        <div className="conta-confirmar"><button type="button" className="botao-secundario" onClick={() => { setAberto(false); setErro(''); }}>Cancelar</button><button className="botao-principal">{ocupado ? 'Excluindo…' : 'Excluir conta definitivamente'}</button></div>
      </fieldset>
    </form>}
  </section>;
}
