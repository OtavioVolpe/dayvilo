import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, X, Clock } from 'lucide-react';
import { solicitar } from './api.js';
import { formatarData } from './datas.js';
import './repeticao-tarefa.css';

const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function moverMes(mes, delta) {
  const d = new Date(mes + '-01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}
export default function RepeticaoTarefa({ tarefa, fechar }) {
  const dialogo = useRef(null), titulo = useId();
  const [mes, setMes] = useState(tarefa.data_prevista.slice(0, 7));
  const [dados, setDados] = useState(null), [erro, setErro] = useState(''), [carregando, setCarregando] = useState(true), [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const anterior = document.activeElement, rolagem = document.body.style.overflow;
    dialogo.current.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = rolagem; anterior?.focus(); };
  }, []);
  useEffect(() => {
    const abortar = new AbortController(); setCarregando(true); setErro('');
    solicitar(`/tarefas/${tarefa.id}/serie/ocorrencias?mes=${mes}`, { signal: abortar.signal }).then(r => { if (!abortar.signal.aborted) setDados(r); }).catch(e => { if (!abortar.signal.aborted) setErro(e.message); }).finally(() => { if (!abortar.signal.aborted) setCarregando(false); });
    return () => abortar.abort();
  }, [tarefa.id, mes, tentativa]);
  const regra = dados?.configuracao;
  return <dialog ref={dialogo} className="repeticao-janela" aria-labelledby={titulo} onCancel={e => { e.preventDefault(); fechar(); }}>
    <header><div><span className="repeticao-etiqueta"><RefreshCw size={16} />Repetição</span><h2 id={titulo}>{tarefa.titulo}</h2></div><button type="button" aria-label="Fechar repetição" onClick={fechar}><X size={21} /></button></header>
    {regra && <p className="repeticao-regra">{({ diaria: 'Todos os dias', semanal: 'Toda semana', quinzenal: 'A cada duas semanas', mensal: 'Todo mês' })[regra.tipo] || 'Regra original não disponível'}{regra.dias?.length ? ' · ' + regra.dias.map(d => dias[d]).join(', ') : ''}{regra.ate ? ' · Término: ' + formatarData(regra.ate, { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</p>}
    <nav className="repeticao-mes" aria-label="Mês das ocorrências"><button type="button" aria-label="Mês anterior" disabled={carregando || mes <= (dados?.limites.inicio?.slice(0, 7) ?? mes)} onClick={() => setMes(moverMes(mes, -1))}><ChevronLeft size={18} /></button><label><span className="repeticao-sr">Mês das repetições</span><input type="month" value={mes} min={dados?.limites.inicio?.slice(0, 7)} max={dados?.limites.fim?.slice(0, 7)} onInput={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMes(e.target.value); }} /></label><button type="button" aria-label="Próximo mês" disabled={carregando || mes >= (dados?.limites.fim?.slice(0, 7) ?? mes)} onClick={() => setMes(moverMes(mes, 1))}><ChevronRight size={18} /></button></nav>
    {carregando ? <p role="status">Carregando repetições…</p> : erro ? <div role="alert"><p>{erro}</p><button type="button" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></div> : <>
      <p className="repeticao-ajuda">{dados.ocorrencias.length} ocorrência(s) neste mês. As datas refletem alterações feitas em cada tarefa.</p>
      <ul className="repeticao-lista">{dados.ocorrencias.map(o => <li key={o.id} className={o.id === tarefa.id ? 'repeticao-origem' : ''}><div><strong>{formatarData(o.data_prevista, { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong><span><Clock size={14} />{o.horario ? o.horario + (o.horario_final ? ' às ' + o.horario_final + (o.horario_final < o.horario ? ' (dia seguinte)' : '') : '') : 'Sem horário'}</span>{o.titulo !== tarefa.titulo && <small>{o.titulo}</small>}</div><span>{({ pendente: 'Pendente', concluida: 'Concluída', pulada: 'Pulada' })[o.situacao]}</span></li>)}</ul>
      {!dados.ocorrencias.length && <p>Nenhuma ocorrência neste mês.</p>}
    </>}
  </dialog>;
}
