import { deslocarData } from './datas.js';

const semana = [[1, 'Seg', 'Segunda-feira'], [2, 'Ter', 'Terça-feira'], [3, 'Qua', 'Quarta-feira'], [4, 'Qui', 'Quinta-feira'], [5, 'Sex', 'Sexta-feira'], [6, 'Sáb', 'Sábado'], [0, 'Dom', 'Domingo']];

export default function DestinosAlimentacao({ form, alterar, hoje, selecao }) {
  const max = deslocarData(hoje, 365);
  return <>
    <div className="ali-frequencia" role="group" aria-label="Frequência da cópia">
      {[['unica', 'Um dia'], ['repetir', 'Repetir']].map(([valor, titulo]) => <button type="button" key={valor} aria-pressed={form.frequencia === valor} onClick={() => alterar('frequencia', valor)}>{titulo}</button>)}
    </div>
    {form.frequencia === 'unica' ? <label className="ali-data-destino">Copiar para<input type="date" min={hoje} max={max} value={form.destino} onInput={e => alterar('destino', e.target.value)} /></label> : <>
      <div className="ali-campos"><label>De<input type="date" min={hoje} max={max} value={form.inicio} onInput={e => alterar('inicio', e.target.value)} /></label><label>Até<input type="date" min={form.inicio || hoje} max={max} value={form.fim} onInput={e => alterar('fim', e.target.value)} /></label></div>
      <fieldset className="ali-semana-destino"><legend>Dias da semana</legend><div>{semana.map(([dia, curto, nome]) => <button type="button" key={dia} aria-label={nome} aria-pressed={form.dias.includes(dia)} onClick={() => alterar('dias', form.dias.includes(dia) ? form.dias.filter(d => d !== dia) : [...form.dias, dia])}>{curto}</button>)}</div></fieldset>
      <p className="ali-ajuda">Copia somente dentro deste período, sem sincronizar os dias. O dia de origem fica de fora.</p>
    </>}
    <p className={'ali-copia-resumo' + (selecao.erro ? ' ali-ajuda' : '')} role="status">{selecao.erro || `Copiar para ${selecao.destinos.length} ${selecao.destinos.length === 1 ? 'dia' : 'dias'}`}</p>
  </>;
}
