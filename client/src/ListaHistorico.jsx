import { formatarData } from './datas.js';

export default function ListaHistorico({ tarefas, situacao, definirSituacao, bloqueado, renderizarTarefa }) {
  const concluidas = tarefas.filter(tarefa => tarefa.situacao === 'concluida').length;
  const pendentes = tarefas.filter(tarefa => tarefa.situacao === 'pendente').length;
  const filtradas = tarefas.filter(tarefa => situacao === 'todas' || tarefa.situacao === situacao);
  const dias = [...new Set(filtradas.map(tarefa => tarefa.data_prevista))].sort().reverse();
  return <>
    <div className="resumo-historico" aria-label="Resumo de todas as tarefas do período">
      <p><strong>{tarefas.length}</strong>Tarefas no período</p>
      <p><strong>{concluidas}</strong>Concluídas</p>
      <p><strong>{pendentes}</strong>Pendentes</p>
      <p><strong>{tarefas.filter(tarefa => tarefa.situacao === "pulada").length}</strong>Puladas</p>
    </div>
    <div className="filtro-historico"><label>Situação <select value={situacao} disabled={bloqueado} onChange={evento => definirSituacao(evento.target.value)}>
      <option value="todas">Todas</option><option value="concluida">Concluídas</option><option value="pendente">Pendentes</option><option value="pulada">Puladas</option>
    </select></label><p>{filtradas.length} tarefa(s) encontradas</p></div>
    {dias.length === 0 && <div className="initial-state"><h2>Nenhuma atividade encontrada</h2><p>Experimente outro período ou outra situação.</p></div>}
    <div className="lista-historico">{dias.map(dia => <section key={dia} aria-label={formatarData(dia, { day: 'numeric', month: 'long', year: 'numeric' })}>
      <h3>{formatarData(dia, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
      <ul className="lista-tarefas">{filtradas.filter(tarefa => tarefa.data_prevista === dia).sort((a,b) => (a.horario || '99').localeCompare(b.horario || '99') || a.id - b.id).map(renderizarTarefa)}</ul>
    </section>)}</div>
  </>;
}
