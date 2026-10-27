import { Sprout } from 'lucide-react';
import Apresentacao from './Apresentacao.jsx';
import Privacidade from './Privacidade.jsx';
import { registrarEvento } from './analytics.js';

export default function SitePublico({ urlApp, cadastroAberto }) {
  return <div className="app-shell">
    <header className="app-header"><span className="brand"><span className="brand-mark"><Sprout size={22} aria-hidden="true" /></span>Dayvilo</span><nav className="apresentacao-navegacao" aria-label="Acesso à conta"><a className="botao-secundario" href={urlApp + '#entrar'} onClick={() => registrarEvento('open_app')}>Entrar</a></nav></header>
    <Privacidade tela="inicio" />
    <Apresentacao cadastroAberto={cadastroAberto} urlApp={urlApp} />
  </div>;
}
