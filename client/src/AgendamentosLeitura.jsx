import { useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { formatarData } from './datas.js';

export default function AgendamentosLeitura({ livro, agendamentos, hoje, ocupado, voltar, remover }) {
  const [selecionando, setSelecionando] = useState(false), [selecionados, setSelecionados] = useState([]);
  const meses = [...new Set(agendamentos.map(a => a.data_prevista.slice(0, 7)))];
  const elegivel = a => a.situacao === 'pendente' && a.data_prevista >= hoje;
  return <div className="leitura-agenda-lista">
    <p>{livro.titulo}</p><p className="leitura-ajuda">Agendamentos de hoje em diante. Leituras concluídas ou puladas são preservadas.</p>
    <div className="leitura-agenda-ferramentas"><button type="button" disabled={ocupado} onClick={voltar}>Voltar ao livro</button>{agendamentos.some(elegivel) && <button type="button" disabled={ocupado} aria-pressed={selecionando} onClick={() => { setSelecionando(v => !v); setSelecionados([]); }}>{selecionando ? 'Cancelar seleção' : 'Selecionar datas'}</button>}</div>
    {!meses.length && <p className="leitura-agenda-vazia"><CalendarDays size={22} />Nenhuma leitura agendada.</p>}
    {meses.map(mes => <section className="leitura-agenda-mes" key={mes}><h3>{formatarData(mes + '-01', { month: 'long', year: 'numeric' })}</h3><ul>{agendamentos.filter(a => a.data_prevista.startsWith(mes)).map(a => <li key={a.id}>
      {selecionando && <input type="checkbox" aria-label={'Selecionar leitura de ' + formatarData(a.data_prevista, { day: '2-digit', month: '2-digit', year: 'numeric' })} disabled={ocupado || !elegivel(a)} checked={selecionados.includes(a.id)} onChange={e => setSelecionados(v => e.target.checked ? [...v, a.id] : v.filter(id => id !== a.id))} />}
      <div className="leitura-agenda-data"><strong>{formatarData(a.data_prevista, { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong><span><Clock size={14} />{a.horario ? a.horario.slice(0, 5) : 'Sem horário'}</span></div><span className="leitura-agenda-situacao">{({ pendente: 'Pendente', concluida: 'Concluída', pulada: 'Pulada' })[a.situacao]}</span>
    </li>)}</ul></section>)}
    {selecionando && <div className="leitura-acoes"><span role="status">{selecionados.length} selecionada(s)</span><button type="button" className="botao-principal" disabled={ocupado || !selecionados.length} onClick={() => remover(selecionados)}>Desagendar selecionadas</button></div>}
  </div>;
}
