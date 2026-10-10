import MinhaConta from './MinhaConta.jsx';
import ConfirmarEmail, { AvisoConfirmacao } from './ConfirmarEmail.jsx';
import Acesso from './Acesso.jsx';
import { useSessao } from './useSessao.js';
import RecuperarSenha from './RecuperarSenha.jsx';
import { useEffect, useState } from 'react';
import Planejamento from './Planejamento.jsx';
import { UserRound, Sprout, Sun, Utensils, Dumbbell, BookOpen, House, LockKeyhole } from 'lucide-react';

const areas = [
  { name: 'Rotina', icon: Sun },
  { name: 'Alimentação', icon: Utensils },
  { name: 'Treino', icon: Dumbbell },
  { name: 'Leitura', icon: BookOpen },
  { name: 'Casa', label: 'Tarefas de casa', icon: House },
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
  const { sessao, cadastroAberto, erro, aviso, saindo, entrar, sair, atualizar, atualizarNome, encerrar } = useSessao();
  const [view, setView] = useState('Hoje');


  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand"><span className="brand-mark"><Sprout size={22} aria-hidden="true" /></span>Dayvilo</span>
        {sessao && !recuperacao && <div className="conta-atual"><button className="abrir-minha-conta" aria-label="Minha conta" onClick={() => setView('Conta')}><UserRound size={18} aria-hidden="true" /><span>{sessao.nome}</span></button><button className="botao-secundario" disabled={saindo} onClick={sair}>{saindo ? 'Saindo…' : 'Sair'}</button></div>}
      </header>
      {recuperacao?.confirmacao ? <ConfirmarEmail key={recuperacao.token} token={recuperacao.token} atualizar={atualizar} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search); definirRecuperacao(null); atualizar(); }} /> : recuperacao ? <RecuperarSenha key={recuperacao.token ?? 'pedido'} token={recuperacao.token} aoSolicitarNovo={solicitarRecuperacao} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search); definirRecuperacao(null); atualizar(); }} /> : sessao === undefined ? <main><p className="estado-lista" role="status">{erro || 'Abrindo seu espaço…'}</p>{erro && <button className="botao-secundario" onClick={atualizar}>Tentar novamente</button>}</main>
        : !sessao ? <Acesso cadastroAberto={cadastroAberto} aoRecuperar={solicitarRecuperacao} aoEntrar={dados => { setView('Hoje'); entrar(dados); }} aviso={aviso} /> : <div className="app-layout">
        <nav className="areas" aria-label="Áreas pessoais">
          <p className="areas-label">Seu espaço</p>
          {areas.map(({ name, label = name, icon: Icon }) => (
            <button key={name} disabled={name !== 'Rotina'} aria-current={name === 'Rotina' ? 'page' : undefined} aria-label={name === 'Rotina' ? label : `${label}, em breve`} title={name === 'Rotina' ? label : `${label} — em breve`} onClick={() => setView('Hoje')}>
              <Icon size={20} aria-hidden="true" /><span>{name}</span>
              {name !== 'Rotina' && <LockKeyhole className="area-cadeado" size={12} aria-hidden="true" />}
            </button>
          ))}
        </nav>
        <main>
          {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
          {view === 'Conta' ? <MinhaConta key={sessao.id} sessao={sessao} atualizarNome={atualizarNome} encerrar={encerrar} voltar={() => setView('Hoje')} /> : <><AvisoConfirmacao key={sessao.id} sessao={sessao} atualizar={atualizar} aviso={aviso} />
          <nav className="routine-tabs" aria-label="Visualizações da rotina">
            {['Hoje', 'Semana', 'Histórico'].map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
          </nav>

          <Planejamento key={`${sessao.id}-${view}`} semanal={view === 'Semana'} historico={view === 'Histórico'} /></>}
        </main>
      </div>}
    </div>
  );
}

