import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import Treino from './Treino.jsx';
import Financeiro from './Financeiro.jsx';
import Leitura from './Leitura.jsx';
import Alimentacao from './Alimentacao.jsx';
import MinhaConta from './MinhaConta.jsx';
import ConfirmarEmail, { AvisoConfirmacao } from './ConfirmarEmail.jsx';
import Acesso from './Acesso.jsx';
import Apresentacao from './Apresentacao.jsx';
import BoasVindas, { orientarNovaConta, temOrientacaoPendente, concluirOrientacao } from './BoasVindas.jsx';
import { useSessao } from './useSessao.js';
import RecuperarSenha from './RecuperarSenha.jsx';
import { useEffect, useState } from 'react';
import Planejamento from './Planejamento.jsx';
import { UserRound, Sprout, Sun, Utensils, Dumbbell, BookOpen, House, Wallet, LockKeyhole } from 'lucide-react';

const areas = [
  { name: 'Rotina', icon: Sun },
  { name: 'Casa', label: 'Tarefas de casa', icon: House },
  { name: 'Treino', icon: Dumbbell },
  { name: 'Financeiro', icon: Wallet },
  { name: 'Alimentação', icon: Utensils },
  { name: 'Leitura', icon: BookOpen },
];

function lerRecuperacao() {
  if (window.location.hash.startsWith('#confirmar-email=')) return { confirmacao: true, token: window.location.hash.slice('#confirmar-email='.length) };
  if (window.location.hash === '#recuperar-senha') return { token: null };
  if (window.location.hash.startsWith('#redefinir-senha=')) return { token: window.location.hash.slice('#redefinir-senha='.length) };
  return null;
}

export default function App() {
  const [rotaPublica, definirRotaPublica] = useState(() => window.location.hash);
  const [recuperacao, definirRecuperacao] = useState(lerRecuperacao);
  useEffect(() => {
    const atualizarRota = () => { definirRecuperacao(lerRecuperacao()); definirRotaPublica(window.location.hash); };
    window.addEventListener('hashchange', atualizarRota);
    return () => window.removeEventListener('hashchange', atualizarRota);
  }, []);
  const solicitarRecuperacao = () => { window.location.hash = 'recuperar-senha'; };
  const { sessao, cadastroAberto, erro, aviso, saindo, entrar, sair, atualizar, atualizarNome, encerrar } = useSessao();
  const mostrarAcesso = ['#entrar', '#criar-conta'].includes(rotaPublica) || (aviso && rotaPublica !== '#inicio');
  useEffect(() => {
    if (sessao && ['#entrar', '#criar-conta', '#inicio', '#conhecer-dayvilo'].includes(window.location.hash)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      definirRotaPublica('');
    }
  }, [sessao]);
  const [view, setView] = useState('Hoje');
  useEffect(() => {
    if (sessao?.id && temOrientacaoPendente(sessao.id)) setView('BoasVindas');
  }, [sessao?.id]);
  function receberAcesso(dados, { novaConta = false } = {}) {
    if (novaConta) orientarNovaConta(dados.usuario.id);
    setView(novaConta || temOrientacaoPendente(dados.usuario.id) ? 'BoasVindas' : 'Hoje');
    entrar(dados);
  }
  const [treinoSessao, setTreinoSessao] = useState(null);
  const [livroInicial, setLivroInicial] = useState(null);
  const [financeiroInicial, setFinanceiroInicial] = useState(null);
  const [refeicaoInicial, setRefeicaoInicial] = useState(null);
  const [treinoSujo, setTreinoSujo] = useState(false);
  const [confirmacaoTreino, setConfirmacaoTreino] = useState(null);
  function navegar(destino) {
    if (destino === view) return;
    if (view === 'BoasVindas') concluirOrientacao(sessao.id);
    if (treinoSujo) { setConfirmacaoTreino({ mensagem: 'Descartar alterações não salvas?', acao: () => { setTreinoSujo(false); setView(destino); } }); return; }
    setTreinoSujo(false); setView(destino);
  }



  return (
    <div className="app-shell">
      {confirmacaoTreino && <ConfirmacaoTreino mensagem={confirmacaoTreino.mensagem} cancelar={() => setConfirmacaoTreino(null)} confirmar={() => { const acao = confirmacaoTreino.acao; setConfirmacaoTreino(null); acao(); }} />}
      <header className="app-header">
        <span className="brand"><span className="brand-mark"><Sprout size={22} aria-hidden="true" /></span>Dayvilo</span>
        {sessao === null && !recuperacao && !mostrarAcesso && <nav className="apresentacao-navegacao" aria-label="Acesso à conta"><a className="botao-secundario" href="#entrar">Entrar</a></nav>}
        {sessao && !recuperacao && <div className="conta-atual"><button className="abrir-minha-conta" aria-label="Minha conta" onClick={() => navegar('Conta')}><UserRound size={18} aria-hidden="true" /><span>{sessao.nome}</span></button><button className="botao-secundario" disabled={saindo} onClick={() => { if (treinoSujo) setConfirmacaoTreino({ mensagem: 'Sair e descartar alterações não salvas?', acao: sair }); else sair(); }}>{saindo ? 'Saindo…' : 'Sair'}</button></div>}
      </header>
      {recuperacao?.confirmacao ? <ConfirmarEmail key={recuperacao.token} token={recuperacao.token} atualizar={atualizar} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#entrar'); definirRotaPublica('#entrar'); definirRecuperacao(null); atualizar(); }} /> : recuperacao ? <RecuperarSenha key={recuperacao.token ?? 'pedido'} token={recuperacao.token} aoSolicitarNovo={solicitarRecuperacao} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#entrar'); definirRotaPublica('#entrar'); definirRecuperacao(null); atualizar(); }} /> : sessao === undefined ? <main><p className="estado-lista" role="status">{erro || 'Abrindo seu espaço…'}</p>{erro && <button className="botao-secundario" onClick={atualizar}>Tentar novamente</button>}</main>
        : !sessao ? (mostrarAcesso ? <Acesso key={rotaPublica} cadastroInicial={rotaPublica === '#criar-conta'} cadastroAberto={cadastroAberto} aoRecuperar={solicitarRecuperacao} aoEntrar={receberAcesso} aviso={aviso} /> : <Apresentacao cadastroAberto={cadastroAberto} />) : <div className={`app-layout ${view === 'Casa' ? 'layout-casa' : ''}`}>
        <nav className="areas" aria-label="Áreas pessoais">
          <p className="areas-label">Seu espaço</p>
          {areas.map(({ name, label = name, icon: Icon }) => (
            <button key={name} disabled={!['Rotina', 'Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura'].includes(name)} aria-current={(['Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura'].includes(name) ? view === name : name === 'Rotina' && !['Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura', 'Conta', 'BoasVindas'].includes(view)) ? 'page' : undefined} aria-label={['Rotina', 'Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura'].includes(name) ? label : `${label}, em breve`} title={['Rotina', 'Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura'].includes(name) ? label : `${label} — em breve`} onClick={() => navegar(['Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura'].includes(name) ? name : 'Hoje')}>
              <Icon size={20} aria-hidden="true" /><span>{name}</span>
              {!['Rotina', 'Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura'].includes(name) && <LockKeyhole className="area-cadeado" size={12} aria-hidden="true" />}
            </button>
          ))}
        </nav>
        <main>
          {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
          {view === 'BoasVindas' ? <BoasVindas aoEscolher={navegar} /> : view === 'Conta' ? <MinhaConta key={sessao.id} sessao={sessao} atualizarNome={atualizarNome} encerrar={encerrar} aoConhecerAreas={() => navegar('BoasVindas')} voltar={() => setView('Hoje')} /> : <><AvisoConfirmacao key={sessao.id} sessao={sessao} atualizar={atualizar} aviso={aviso} />
          {!['Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura'].includes(view) && <nav className="routine-tabs" aria-label="Visualizações da rotina">
            {['Hoje', 'Semana', 'Histórico'].map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
          </nav>}

          {view === 'Leitura' ? <Leitura key={sessao.id} inicial={livroInicial} aoConsumirInicial={() => setLivroInicial(null)} aoAlterarSujo={setTreinoSujo} /> : view === 'Alimentação' ? <Alimentacao key={sessao.id} inicial={refeicaoInicial} aoConsumirInicial={() => setRefeicaoInicial(null)} aoAlterarSujo={setTreinoSujo} /> : view === 'Financeiro' ? <Financeiro key={sessao.id} inicial={financeiroInicial} aoConsumirInicial={() => setFinanceiroInicial(null)} aoAlterarSujo={setTreinoSujo} /> : view === 'Treino' ? <Treino sessaoInicial={treinoSessao} aoConsumirSessao={() => setTreinoSessao(null)} aoAlterarSujo={setTreinoSujo} /> : <Planejamento aoAbrirFinanceiro={(id, acao) => { setFinanceiroInicial({ id, acao }); navegar('Financeiro'); }} aoAbrirLivro={id => { setLivroInicial(id); navegar('Leitura'); }} aoAbrirRefeicao={r => { setRefeicaoInicial({ id: r.refeicao_id, data: r.data_prevista }); navegar('Alimentação'); }} aoAbrirTreino={id => { setTreinoSessao(id); navegar('Treino'); }} key={`${sessao.id}-${view}`} casa={view === 'Casa'} semanal={view === 'Semana' || view === 'Casa'} historico={view === 'Histórico'} />}</>}
        </main>
      </div>}
    </div>
  );
}
