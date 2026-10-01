import ConfirmarEmail, { AvisoConfirmacao } from './ConfirmarEmail.jsx';
import Acesso from './Acesso.jsx';
import { useSessao } from './useSessao.js';
import RecuperarSenha from './RecuperarSenha.jsx';
import { useEffect, useState } from 'react';
import Planejamento from './Planejamento.jsx';
import { Sprout, Sun, Utensils, Dumbbell, BookOpen } from 'lucide-react';

const areas = [
  { name: 'Rotina', icon: Sun },
  { name: 'Alimentação', icon: Utensils },
  { name: 'Treino', icon: Dumbbell },
  { name: 'Leitura', icon: BookOpen },
];

function lerRecuperacao() {
  if (window.location.hash.startsWith('#confirmar-email=')) return { confirmacao: true, token: window.location.hash.slice('#confirmar-email='.length) };
  if (window.location.hash === '#recuperar-senha') return { token: null };
  if (window.location.hash.startsWith('#redefinir-senha=')) return { token: window.location.hash.slice('#redefinir-senha='.length) };
  return null;
}

export default function App() {
  const [recuperacao, definirRecuperacao] = useState(lerRecuperacao);
  useEffect(() => {
    const atualizarRota = () => definirRecuperacao(lerRecuperacao());
    window.addEventListener('hashchange', atualizarRota);
    return () => window.removeEventListener('hashchange', atualizarRota);
  }, []);
  const solicitarRecuperacao = () => { window.location.hash = 'recuperar-senha'; };
  const { sessao, cadastroAberto, erro, aviso, saindo, entrar, sair, atualizar } = useSessao();
  const [view, setView] = useState('Hoje');
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand"><span className="brand-mark"><Sprout size={22} aria-hidden="true" /></span>Dayvilo</span>
        {sessao && !recuperacao && <div className="conta-atual"><span title={sessao.email}>{sessao.nome}</span><button className="botao-secundario" disabled={saindo} onClick={sair}>{saindo ? 'Saindo…' : 'Sair'}</button></div>}
      </header>
      {recuperacao?.confirmacao ? <ConfirmarEmail key={recuperacao.token} token={recuperacao.token} atualizar={atualizar} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search); definirRecuperacao(null); atualizar(); }} /> : recuperacao ? <RecuperarSenha key={recuperacao.token ?? 'pedido'} token={recuperacao.token} aoSolicitarNovo={solicitarRecuperacao} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search); definirRecuperacao(null); atualizar(); }} /> : sessao === undefined ? <main><p className="estado-lista" role="status">{erro || 'Abrindo seu espaço…'}</p>{erro && <button className="botao-secundario" onClick={atualizar}>Tentar novamente</button>}</main>
        : !sessao ? <Acesso cadastroAberto={cadastroAberto} aoRecuperar={solicitarRecuperacao} aoEntrar={dados => { setView('Hoje'); entrar(dados); }} aviso={aviso} /> : <div className="app-layout">
        <nav className="areas" aria-label="Áreas pessoais">
          <p className="areas-label">Seu espaço</p>
          {areas.map(({ name, icon: Icon }) => (
            <button key={name} disabled={name !== 'Rotina'} aria-current={name === 'Rotina' ? 'page' : undefined} aria-label={name === 'Rotina' ? name : `${name}, indisponível`} onClick={() => setView('Hoje')}>
              <Icon size={20} aria-hidden="true" /><span>{name}</span>
            </button>
          ))}
        </nav>
        <main>
          <AvisoConfirmacao key={sessao.id} sessao={sessao} atualizar={atualizar} aviso={aviso} />
          <nav className="routine-tabs" aria-label="Visualizações da rotina">
            {['Hoje', 'Semana', 'Histórico'].map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
          </nav>
          <header className="page-heading">
            <p className="date-label">{date}</p>
            <h1>{view === 'Hoje' ? 'Seu dia, no seu ritmo.' : view === 'Semana' ? 'Uma semana possível.' : 'Um dia de cada vez.'}</h1>
            <p className="subtitle">{view === 'Hoje' ? 'Espaço para o que importa hoje.' : view === 'Semana' ? 'Uma visão dos seus próximos dias.' : 'Reveja o que fez parte da sua rotina.'}</p>
          </header>
          {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
          <Planejamento key={`${sessao.id}-${view}`} semanal={view === 'Semana'} historico={view === 'Histórico'} />
        </main>
      </div>}
    </div>
  );
}

