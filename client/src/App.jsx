import AtualizacaoAplicativo from './AtualizacaoAplicativo.jsx';
import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import MenuMobile from './MenuMobile.jsx';
import Metas from './Metas.jsx';
import Treino from './Treino.jsx';
import Financeiro from './Financeiro.jsx';
import Leitura from './Leitura.jsx';
import Alimentacao from './Alimentacao.jsx';
import MinhaConta from './MinhaConta.jsx';
import InstalarDayvilo from './InstalarDayvilo.jsx';
import useInstalacao from './useInstalacao.js';
import ConfirmarEmail, { AvisoConfirmacao } from './ConfirmarEmail.jsx';
import Acesso from './Acesso.jsx';
import Apresentacao from './Apresentacao.jsx';
import Privacidade from './Privacidade.jsx';
import BoasVindas, { orientarNovaConta, temOrientacaoPendente, concluirOrientacao } from './BoasVindas.jsx';
import { useSessao } from './useSessao.js';
import RecuperarSenha from './RecuperarSenha.jsx';
import { useEffect, useState } from 'react';
import Planejamento from './Planejamento.jsx';
import { UserRound, Sprout, Sun, Utensils, Dumbbell, BookOpen, House, Wallet, Target, LogOut } from 'lucide-react';
import './menu-desktop.css';

const areas = [
  { name: 'Rotina', icon: Sun },
  { name: 'Casa', label: 'Tarefas de casa', icon: House },
  { name: 'Treino', icon: Dumbbell },
  { name: 'Financeiro', icon: Wallet },
  { name: 'Alimentação', icon: Utensils },
  { name: 'Leitura', icon: BookOpen },
  { name: 'Metas', icon: Target },
];

function lerRecuperacao() {
  if (window.location.hash.startsWith('#alterar-email=')) return { confirmacao: true, troca: true, token: window.location.hash.slice('#alterar-email='.length) };
  if (window.location.hash.startsWith('#confirmar-email=')) return { confirmacao: true, token: window.location.hash.slice('#confirmar-email='.length) };
  if (window.location.hash === '#recuperar-senha') return { token: null };
  if (window.location.hash.startsWith('#redefinir-senha=')) return { token: window.location.hash.slice('#redefinir-senha='.length) };
  return null;
}

export default function App() {
  const instalacao = useInstalacao();
  const [rotaPublica, definirRotaPublica] = useState(() => window.location.hash);
  const [recuperacao, definirRecuperacao] = useState(lerRecuperacao);
  useEffect(() => {
    const atualizarRota = () => { definirRecuperacao(lerRecuperacao()); definirRotaPublica(window.location.hash); };
    window.addEventListener('hashchange', atualizarRota);
    return () => window.removeEventListener('hashchange', atualizarRota);
  }, []);
  const solicitarRecuperacao = () => { window.location.hash = 'recuperar-senha'; };
  const conta = useSessao();
  const { sessao, cadastroAberto, erro, aviso, entrar, atualizar } = conta;
  const [contaNova, setContaNova] = useState(null);
  const mostrarAcesso = ['#entrar', '#criar-conta'].includes(rotaPublica) || (aviso && rotaPublica !== '#inicio');
  useEffect(() => {
    if (sessao && ['#entrar', '#criar-conta', '#inicio', '#conhecer-dayvilo'].includes(window.location.hash)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      definirRotaPublica('');
    }
  }, [sessao]);
  function receberAcesso(dados, { novaConta = false } = {}) {
    if (novaConta) orientarNovaConta(dados.usuario.id);
    setContaNova(novaConta ? dados.usuario.id : null);
    entrar(dados);
  }

  const autenticado = Boolean(sessao && !recuperacao);
  return (
    <div className={`app-shell${autenticado ? ' com-menu-mobile' : ''}`}>
      <AtualizacaoAplicativo />
      {autenticado ? <EspacoDaConta key={sessao.id} {...conta} instalacao={instalacao}
        contaNova={contaNova === sessao.id} aoConcluirOrientacao={() => setContaNova(null)} /> : <>
        <Cabecalho>
          {sessao === null && !recuperacao && !mostrarAcesso && <nav className="apresentacao-navegacao" aria-label="Acesso à conta"><a className="botao-secundario" href="#entrar">Entrar</a></nav>}
        </Cabecalho>
        <Privacidade tela={recuperacao || sessao === undefined ? null : mostrarAcesso ? (rotaPublica === '#criar-conta' ? 'cadastro' : 'entrar') : 'inicio'} />
        {recuperacao?.confirmacao ? <ConfirmarEmail key={recuperacao.token} troca={recuperacao.troca} token={recuperacao.token} atualizar={atualizar} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#entrar'); definirRotaPublica('#entrar'); definirRecuperacao(null); atualizar(); }} /> : recuperacao ? <RecuperarSenha key={recuperacao.token ?? 'pedido'} token={recuperacao.token} aoSolicitarNovo={solicitarRecuperacao} aoVoltar={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#entrar'); definirRotaPublica('#entrar'); definirRecuperacao(null); atualizar(); }} /> : sessao === undefined ? <main><p className="estado-lista" role="status">{erro || 'Abrindo seu espaço…'}</p>{erro && <button className="botao-secundario" onClick={atualizar}>Tentar novamente</button>}</main>
          : mostrarAcesso ? <Acesso key={rotaPublica} cadastroInicial={rotaPublica === '#criar-conta'} cadastroAberto={cadastroAberto} aoRecuperar={solicitarRecuperacao} aoEntrar={receberAcesso} aviso={aviso} /> : <Apresentacao cadastroAberto={cadastroAberto} />}
      </>}
    </div>
  );
}

function Cabecalho({ children }) {
  return <header className="app-header">
    <span className="brand"><span className="brand-mark"><Sprout size={22} aria-hidden="true" /></span>Dayvilo</span>
    {children}
  </header>;
}

const telasPrivacidade = {
  Hoje: 'rotina', Semana: 'rotina', Histórico: 'rotina', Casa: 'casa', Treino: 'treino',
  Financeiro: 'financeiro', Alimentação: 'alimentacao', Leitura: 'leitura', Metas: 'metas',
  Conta: 'conta', BoasVindas: 'boas_vindas',
};

function EspacoDaConta({ sessao, erro, aviso, saindo, sair, atualizar, atualizarNome, encerrar, instalacao, contaNova, aoConcluirOrientacao }) {
  const [{ view, inicial }, setNavegacao] = useState(() => ({
    view: contaNova || temOrientacaoPendente(sessao.id) ? 'BoasVindas' : 'Hoje',
    inicial: null,
  }));
  const [sujo, setSujo] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);

  function comConfirmacao(acao, mensagem) {
    if (sujo) setConfirmacao({ acao, mensagem });
    else acao();
  }
  function navegar(destino, abertura = null) {
    if (destino === view) return;
    comConfirmacao(() => {
      if (view === 'BoasVindas') {
        concluirOrientacao(sessao.id);
        aoConcluirOrientacao();
      }
      setSujo(false);
      setNavegacao({ view: destino, inicial: abertura });
    }, 'Descartar alterações não salvas?');
  }
  function consumirInicial() { setNavegacao(anterior => ({ ...anterior, inicial: null })); }
  function solicitarSaida() { comConfirmacao(sair, 'Sair e descartar alterações não salvas?'); }

  return <>
    {confirmacao && <ConfirmacaoTreino mensagem={confirmacao.mensagem} cancelar={() => setConfirmacao(null)} confirmar={() => {
      setConfirmacao(null);
      return confirmacao.acao();
    }} />}
    <Cabecalho>
      <div className="conta-atual">
        <button className="abrir-minha-conta" aria-label="Minha conta" onClick={() => navegar('Conta')}><UserRound size={18} aria-hidden="true" /><span>{sessao.nome}</span></button>
        <button className="botao-secundario" disabled={saindo} onClick={solicitarSaida}>{saindo ? 'Saindo…' : 'Sair'}</button>
      </div>
    </Cabecalho>
    <Privacidade tela={telasPrivacidade[view]} />
    <div className={`app-layout ${view === 'Casa' ? 'layout-casa' : ''}`}>
        <nav className="areas" aria-label="Áreas pessoais">
          <div className="lateral-marca"><Sprout size={24} aria-hidden="true" /><span>Dayvilo</span></div>
          <div className="lateral-links">
          {areas.map(({ name, label = name, icon: Icon }) => (
            <button key={name} aria-current={(name === 'Rotina' ? ['Hoje', 'Semana', 'Histórico'].includes(view) : view === name) ? 'page' : undefined} aria-label={label} title={label} onClick={() => navegar(name === 'Rotina' ? 'Hoje' : name)}>
              <Icon size={20} aria-hidden="true" /><span>{name}</span>
            </button>
          ))}
          </div>
          <div className="lateral-conta">
            <button aria-label="Minha conta" aria-current={view === 'Conta' ? 'page' : undefined} onClick={() => navegar('Conta')}>
              <span className="lateral-avatar" aria-hidden="true">{Array.from(sessao.nome || 'D')[0].toLocaleUpperCase('pt-BR')}</span>
              <span className="lateral-identidade"><span>{sessao.nome}</span><small>Minha conta</small></span>
            </button>
            <button disabled={saindo} onClick={solicitarSaida}><LogOut size={18} aria-hidden="true" /><span>{saindo ? 'Saindo…' : 'Sair'}</span></button>
          </div>
        </nav>
        <MenuMobile areas={areas} view={view} navegar={navegar} saindo={saindo} sair={solicitarSaida} />
      <main>
        {view === 'Hoje' && <InstalarDayvilo instalacao={instalacao} />}
        {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
        {view === 'BoasVindas' ? <BoasVindas aoEscolher={navegar} />
          : view === 'Conta' ? <MinhaConta instalacao={instalacao} sessao={sessao} atualizarNome={atualizarNome}
              encerrar={encerrar} aoConhecerAreas={() => navegar('BoasVindas')} voltar={() => navegar('Hoje')} />
          : <>
            <AvisoConfirmacao sessao={sessao} atualizar={atualizar} aviso={aviso} />
            {['Hoje', 'Semana', 'Histórico'].includes(view) && <nav className="routine-tabs" aria-label="Visualizações da rotina">
              {['Hoje', 'Semana', 'Histórico'].map(item => <button key={item} aria-pressed={view === item} onClick={() => setNavegacao({ view: item, inicial: null })}>{item}</button>)}
            </nav>}
            {view === 'Metas' ? <Metas aoAlterarSujo={setSujo} />
              : view === 'Leitura' ? <Leitura inicial={inicial} aoConsumirInicial={consumirInicial} aoAlterarSujo={setSujo} />
              : view === 'Alimentação' ? <Alimentacao inicial={inicial} aoConsumirInicial={consumirInicial} aoAlterarSujo={setSujo} />
              : view === 'Financeiro' ? <Financeiro inicial={inicial} aoConsumirInicial={consumirInicial} aoAlterarSujo={setSujo} />
              : view === 'Treino' ? <Treino sessaoInicial={inicial} aoConsumirSessao={consumirInicial} aoAlterarSujo={setSujo} />
              : <Planejamento key={view} casa={view === 'Casa'} semanal={view === 'Semana' || view === 'Casa'} historico={view === 'Histórico'}
                aoAbrirMetas={() => navegar('Metas')} aoAbrirFinanceiro={(id, acao) => navegar('Financeiro', { id, acao })}
                aoAbrirLivro={id => navegar('Leitura', id)} aoAbrirRefeicao={r => navegar('Alimentação', { id: r.refeicao_id, data: r.data_prevista })}
                aoAbrirTreino={id => navegar('Treino', id)} />}
          </>}
      </main>
    </div>
  </>;
}
