import { ListTodo, Plus } from 'lucide-react';
import { formatarData } from './datas.js';
import './rotina-vazia.css';

const sugestoes = ['Estudar por 30 minutos', 'Resolver uma pendência', 'Fazer uma caminhada'];

export default function RotinaVazia({ data, hoje, bloqueado, aoCriar }) {
  return <section className="rotina-vazia" aria-labelledby="rotina-vazia-titulo">
    <span className="rotina-vazia-icone"><ListTodo size={26} aria-hidden="true" /></span>
    <h2 id="rotina-vazia-titulo">O que você quer fazer {data === hoje ? 'hoje' : 'neste dia'}?</h2>
    <p>Ainda não há tarefas para {formatarData(data, { day: '2-digit', month: 'long', year: 'numeric' })}. Comece com uma coisa que você quer lembrar.</p>
    <button type="button" className="botao-principal" disabled={bloqueado} onClick={() => aoCriar('')}><Plus size={18} aria-hidden="true" />Criar uma tarefa</button>
    <div className="rotina-vazia-sugestoes"><p>Quer uma ideia para começar?</p><div>{sugestoes.map(titulo => <button key={titulo} type="button" disabled={bloqueado} onClick={() => aoCriar(titulo)} aria-label={`Usar sugestão: ${titulo}`}>{titulo}</button>)}</div><small>As sugestões abrem o formulário. Você pode mudar tudo antes de salvar.</small></div>
  </section>;
}
