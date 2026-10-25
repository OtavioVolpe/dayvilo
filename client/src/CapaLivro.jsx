export default function CapaLivro({ livro }) {
  const variante = Array.from(String(livro.id || livro.titulo)).reduce((n, c) => n + c.codePointAt(0), 0) % 4;
  return <span className={`livro-capa livro-capa-${variante}`} aria-hidden="true">
    <span className="livro-capa-autor">{livro.autor || 'Minha biblioteca'}</span>
    <span className="livro-capa-titulo">{livro.titulo}</span>
    <span className="livro-capa-arte" />
  </span>;
}
