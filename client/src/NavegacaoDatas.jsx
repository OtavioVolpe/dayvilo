import { useEffect, useId, useState } from 'react';
import DataConsulta from './DataConsulta.jsx';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { deslocarData, formatarData } from './datas.js';

export default function NavegacaoDatas({ data, hoje, dias = [], semanal, bloqueado, aoEscolher, aoVoltar }) {
  const [aberto, definirAberto] = useState(false);
  const id = useId();
  useEffect(() => { if (bloqueado) definirAberto(false); }, [bloqueado]);
  const atual = semanal ? dias.includes(hoje) : data === hoje;
  const passo = semanal ? 7 : 1;
  const mover = quantidade => aoEscolher(deslocarData(data, quantidade));
  // Na troca de visão, a resposta diária ainda pode estar presente até a semanal chegar.
  const semanaCompleta = semanal && dias.length === 7;
  return <div className="navegacao-datas">
    <div className="faixa-data">
      <button type="button" disabled={bloqueado || !data || data < (semanal ? '1000-01-08' : '1000-01-02')} aria-label={semanal ? 'Semana anterior' : 'Dia anterior'} onClick={() => mover(-passo)}><ChevronLeft size={18} aria-hidden="true" /></button>
      <button type="button" className="escolher-data" disabled={bloqueado || !data} aria-label={semanal ? 'Escolher semana pelo calendário' : 'Escolher data pelo calendário'} aria-expanded={aberto} aria-controls={id} onClick={() => definirAberto(valor => !valor)}>
        <CalendarDays size={17} aria-hidden="true" /><span>{data ? semanaCompleta ? `${formatarData(dias[0])} – ${formatarData(dias[6])}` : formatarData(data, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Carregando…'}</span><ChevronDown size={15} aria-hidden="true" />
      </button>
      <button type="button" disabled={bloqueado || !data || data > (semanal ? '9999-12-24' : '9999-12-30')} aria-label={semanal ? 'Próxima semana' : 'Próximo dia'} onClick={() => mover(passo)}><ChevronRight size={18} aria-hidden="true" /></button>
    </div>
    <button type="button" className="voltar-hoje" disabled={bloqueado || !hoje || atual} aria-label={semanal ? 'Voltar à semana atual' : 'Voltar para hoje'} onClick={aoVoltar}>{semanal ? 'Semana atual' : 'Hoje'}</button>
    <div id={id} className="painel-data" hidden={!aberto} onKeyDown={evento => { if (evento.key === 'Escape') { definirAberto(false); evento.currentTarget.parentElement.querySelector('.escolher-data').focus(); } }}>
      {aberto && <DataConsulta data={data} foco rotulo="Ir para a data" bloqueado={bloqueado} aoCancelar={() => definirAberto(false)} aoAplicar={valor => { definirAberto(false); aoEscolher(valor); }} />}
    </div>
  </div>;
}
