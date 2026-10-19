import { House, Plus } from 'lucide-react';
import { formatarData } from './datas.js';
import './rotina-vazia.css';

const sugestoes = [
  { titulo: 'Lavar a louça', ambiente: 'Cozinha' },
  { titulo: 'Limpar o banheiro', ambiente: 'Banheiro' },
  { titulo: 'Organizar o quarto', ambiente: 'Quarto' },
];

export default function CasaVazia({ dias, dia, hoje, bloqueado, aoEscolherDia, aoCriar }) {
  return <section className="rotina-vazia casa-vazia" aria-labelledby="casa-vazia-titulo">
    <span className="rotina-vazia-icone"><House size={26} aria-hidden="true" /></span>
    <h2 id="casa-vazia-titulo">Por onde começar a cuidar da casa?</h2>
    <p>Ainda não há tarefas da casa nesta semana. Escolha um dia e adicione um cuidado. Ele também aparecerá na sua Rotina.</p>
    <label className="casa-vazia-data">Para qual dia?<select value={dia} disabled={bloqueado} onChange={evento => aoEscolherDia(evento.target.value)}>{dias.filter(data => data >= hoje).map(data => <option key={data} value={data}>{formatarData(data, { weekday: 'long', day: '2-digit', month: 'long' })}</option>)}</select></label>
    <button type="button" className="botao-principal" disabled={bloqueado} onClick={() => aoCriar({ titulo: '', ambiente: '' })}><Plus size={18} aria-hidden="true" />Criar uma tarefa da casa</button>
    <div className="rotina-vazia-sugestoes"><p>Algumas ideias para começar</p><div>{sugestoes.map(sugestao => <button key={sugestao.titulo} type="button" disabled={bloqueado} aria-label={`Usar sugestão: ${sugestao.titulo}, ${sugestao.ambiente}`} onClick={() => aoCriar(sugestao)}>{sugestao.titulo}</button>)}</div><small>Revise o título, o ambiente e a data antes de salvar. A tarefa começa sem repetição; você pode escolher a frequência no formulário.</small></div>
  </section>;
}
