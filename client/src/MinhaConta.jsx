import { useState } from 'react';
import { ArrowLeft, CircleCheck, UserRound } from 'lucide-react';
import { solicitar } from './api.js';
import './minha-conta.css';

export function aplicarTema(tema) {
  document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : tema === 'escuro' ? 'dark' : 'light dark';
}
export function lerTema() {
  try { const valor = localStorage.getItem('dayvilo-tema'); return ['claro', 'escuro'].includes(valor) ? valor : 'automatico'; } catch { return 'automatico'; }
}

export default function MinhaConta({ sessao, atualizarNome, encerrar, voltar }) {
  const [nome, setNome] = useState(sessao.nome);
  const [tema, setTema] = useState(lerTema);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  async function executar(acao) {
    if (ocupado) return;
    setOcupado(true); setErro(''); setAviso('');
    try { await acao(); } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <section className="minha-conta" aria-labelledby="titulo-conta">
    <button className="voltar-conta" disabled={ocupado} onClick={voltar}><ArrowLeft size={17} />Voltar à rotina</button>
    <h1 id="titulo-conta"><UserRound size={24} aria-hidden="true" />Minha conta</h1>
    {erro && <p role="alert" className="mensagem-erro">{erro}</p>}
    {aviso && <p role="status" className="aviso-tarefa">{aviso}</p>}
    <section className="conta-painel"><h2>Seus dados</h2>
      <form onSubmit={e => { e.preventDefault(); executar(async () => {
        const dados = await solicitar('/contas/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
        atualizarNome(dados.nome); setNome(dados.nome); setAviso('Nome atualizado.');
      }); }}><label>Nome<input value={nome} onChange={e => setNome(e.target.value)} required maxLength={100} autoComplete="name" disabled={ocupado} /></label><button className="botao-principal" disabled={ocupado}>Salvar nome</button></form>
      <div className="conta-email"><span>E-mail</span><strong>{sessao.email}</strong><p>{sessao.email_confirmado ? <><CircleCheck size={16} aria-hidden="true" />Confirmado</> : 'Ainda não confirmado'}</p></div>
      {!sessao.email_confirmado && <button className="botao-secundario" disabled={ocupado} onClick={() => executar(async () => { const dados = await solicitar('/contas/confirmacao', { method: 'POST' }); setAviso(dados.mensagem); })}>Enviar confirmação</button>}
    </section>
    <section className="conta-painel"><h2>Aparência</h2><label>Tema<select value={tema} disabled={ocupado} onChange={e => { const valor = e.target.value; setTema(valor); aplicarTema(valor); try { localStorage.setItem('dayvilo-tema', valor); } catch { setErro('Tema aplicado, mas não foi possível guardar a preferência.'); } }}><option value="automatico">Automático</option><option value="claro">Claro</option><option value="escuro">Escuro</option></select></label><p className="conta-nota">Salvo neste navegador. Automático acompanha o dispositivo.</p></section>
    <section className="conta-painel"><h2>Alterar senha</h2><p className="conta-nota">Você precisará entrar novamente em todos os dispositivos.</p>
      <form onSubmit={e => { e.preventDefault(); const campos = new FormData(e.currentTarget);
        if (campos.get('nova_senha') !== campos.get('confirmacao')) { setErro('As novas senhas não coincidem.'); return; }
        executar(async () => { const dados = await solicitar('/contas/senha', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha_atual: campos.get('senha_atual'), nova_senha: campos.get('nova_senha') }) }); encerrar(dados.mensagem); });
      }}><fieldset disabled={ocupado}><label>Senha atual<input type="password" name="senha_atual" autoComplete="current-password" maxLength={128} required /></label><label>Nova senha<input type="password" name="nova_senha" autoComplete="new-password" minLength={15} maxLength={128} required aria-describedby="dica-senha-conta" /></label><p id="dica-senha-conta" className="conta-nota">Use de 15 a 128 caracteres.</p><label>Confirme a nova senha<input type="password" name="confirmacao" autoComplete="new-password" minLength={15} maxLength={128} required /></label><button className="botao-principal">Alterar senha</button></fieldset></form>
    </section>
    <section className="conta-painel"><h2>Dispositivos</h2><p className="conta-nota">Encerra todas as sessões, incluindo esta.</p>
      {confirmar ? <div role="group" aria-label="Confirmar saída de todos os dispositivos" className="conta-confirmar"><button className="botao-secundario" disabled={ocupado} onClick={() => setConfirmar(false)}>Cancelar</button><button className="botao-principal" disabled={ocupado} onClick={() => executar(async () => { const dados = await solicitar('/contas/saida-todas', { method: 'POST' }); encerrar(dados.mensagem); })}>Confirmar saída</button></div> : <button className="botao-secundario" disabled={ocupado} onClick={() => setConfirmar(true)}>Sair de todos os dispositivos</button>}
    </section>
  </section>;
}
