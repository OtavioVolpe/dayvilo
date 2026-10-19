import { BookOpen, Plus } from 'lucide-react';
import './rotina-vazia.css';
import './leitura-vazia.css';

const estados = {
  quero_ler: { nome: 'Quero ler', titulo: 'Guarde sua próxima leitura.', texto: 'Adicione um livro que você quer ler para lembrar dele depois.' },
  lendo: { nome: 'Lendo', titulo: 'Qual livro está com você agora?', texto: 'Adicione o livro que você está lendo. As páginas são opcionais e podem ser preenchidas depois.' },
  lido: { nome: 'Lidos', titulo: 'Guarde as leituras que já fizeram parte do seu dia.', texto: 'Adicione um livro concluído ou atualize a situação de um que já está na sua estante.' },
};

export default function LeituraVazia({ estado, estanteVazia, bloqueado, aoCriar }) {
  const atual = estados[estado];
  return <section className="rotina-vazia leitura-inicio" aria-labelledby="leitura-inicio-titulo">
    <span className="rotina-vazia-icone"><BookOpen size={26} aria-hidden="true" /></span>
    <h2 id="leitura-inicio-titulo">{atual.titulo}</h2>
    <p>{estanteVazia ? 'Sua estante ainda está vazia. ' : `Ainda não há livros em ${atual.nome}. `}{atual.texto}</p>
    <button type="button" className="botao-principal" disabled={bloqueado} onClick={() => aoCriar(estado)}><Plus size={18} aria-hidden="true" />Adicionar livro em {atual.nome}</button>
    {estanteVazia && <dl className="leitura-inicio-estados"><div><dt>Quero ler</dt><dd>Os livros que você quer conhecer.</dd></div><div><dt>Lendo</dt><dd>As leituras que estão em andamento.</dd></div><div><dt>Lidos</dt><dd>Os livros que você já terminou.</dd></div></dl>}
    <p className="leitura-inicio-nota">Cadastrar um livro não agenda nada. Para incluir uma leitura na Rotina, abra um livro em Lendo e escolha Agendar leitura.</p>
  </section>;
}
