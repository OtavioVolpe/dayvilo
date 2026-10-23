import MetaSemanal from './MetaSemanal.jsx';

export default function Metas({ aoAlterarSujo }) {
  return <section className="pagina-metas" aria-labelledby="titulo-metas">
    <header className="page-heading"><h1 id="titulo-metas">Minhas metas</h1><p className="subtitle">Pequenos compromissos, no seu ritmo.</p></header>
    <MetaSemanal aoAlterarSujo={aoAlterarSujo} />
  </section>;
}
