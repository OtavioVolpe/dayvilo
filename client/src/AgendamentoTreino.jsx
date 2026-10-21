import { prepararAgendaTreino, semanaTreino } from './agenda-treino.js';
import './agendamento-treino.css';

export default function AgendamentoTreino({ agenda, nome, ocupado, alterar, cancelar, confirmar }) {
  const previa = prepararAgendaTreino(agenda);
  const unica = agenda.frequencia === 'unica';
  const remover = agenda.desagendar;
  return <form className="treino-agendamento" onSubmit={confirmar}><fieldset disabled={ocupado}>
    <legend>{remover ? 'Desagendar' : 'Agendar'} {nome}</legend>
    <div className="treino-frequencia" role="group" aria-label={remover ? 'Período do desagendamento' : 'Frequência do treino'}>
      {[['unica', remover ? 'Uma data' : 'Uma vez'], ['semanal', remover ? 'Por período' : 'Repetir semanalmente']].map(([valor, titulo]) => <button key={valor} type="button" aria-pressed={agenda.frequencia === valor} onClick={() => alterar('frequencia', valor)}>{titulo}</button>)}
    </div>
    {!unica && <fieldset className="treino-semana-escolha"><legend>Em quais dias?</legend><div>{semanaTreino.map(([dia, curto, nomeDia]) => <button key={dia} type="button" aria-label={nomeDia} aria-pressed={agenda.dias.includes(dia)} onClick={() => alterar('dias', agenda.dias.includes(dia) ? agenda.dias.filter(d => d !== dia) : [...agenda.dias, dia])}>{curto}</button>)}</div></fieldset>}
    <div className={unica ? 'treino-data-unica' : 'treino-campos'}>
      <label>{unica ? 'Data do treino' : 'A partir de'}<input required type="date" min="1000-01-01" max="9999-12-31" value={agenda.inicio} onChange={e => alterar('inicio', e.target.value)} /></label>
      {!unica && <label>{remover ? 'Até' : 'Repetir até'}<input required type="date" min={agenda.inicio || '1000-01-01'} max="9999-12-31" value={agenda.fim} onChange={e => alterar('fim', e.target.value)} /></label>}
    </div>
    <p className="treino-agenda-resumo" role="status">{previa.erro || previa.resumo}</p>
    <p className="treino-ajuda">{remover ? 'Remove os treinos desta ficha nas datas selecionadas, inclusive da Rotina. Passados, concluídos e treinos com registros são mantidos. A seleção de datas não indica quantos treinos serão removidos.' : <>{unica ? 'Aparece também na Rotina, somente nessa data.' : 'Aparece na Rotina nos dias escolhidos, somente dentro deste período.'} Treinos já agendados para a mesma ficha e data não serão duplicados.</>}</p>
    <div className="treino-rodape"><button type="button" onClick={cancelar}>Cancelar</button><button type="submit" className="botao-principal" disabled={Boolean(previa.erro)}>{remover ? 'Revisar desagendamento' : unica ? 'Agendar treino' : 'Agendar treinos'}</button></div>
  </fieldset></form>;
}
