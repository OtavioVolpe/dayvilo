import { useState } from 'react';
import { deslocarData, formatarData } from './datas.js';

export default function FiltroPeriodo({ hoje, periodo, bloqueado, aoConsultar }) {
  const [modo, definirModo] = useState('30');
  const [erro, definirErro] = useState('');
  return <div className="filtro-periodo">
    <div className="atalhos-periodo" role="group" aria-label="Período do histórico">
      {[['7', '7 dias'], ['30', '30 dias'], ['personalizado', 'Personalizado']].map(([valor, texto]) => <button type="button" key={valor} aria-pressed={modo === valor} disabled={bloqueado || !hoje} onClick={() => {
        definirModo(valor); definirErro('');
        if (valor !== 'personalizado') aoConsultar({ inicio: deslocarData(hoje, 1 - Number(valor)), fim: hoje });
      }}>{texto}</button>)}
    </div>
    {modo === 'personalizado' && <form className="seletor-dia periodo-personalizado" key={periodo.inicio + periodo.fim} onSubmit={evento => {
      evento.preventDefault(); const campos = new FormData(evento.currentTarget);
      const inicio = campos.get('inicio'), fim = campos.get('fim');
      if (inicio > fim) { definirErro('A data inicial deve vir antes da final.'); return; }
      if (fim > deslocarData(inicio, 365)) { definirErro('Escolha até 366 dias.'); return; }
      definirErro(''); aoConsultar({ inicio, fim });
    }}>
      <label>De<input name="inicio" type="date" defaultValue={periodo.inicio} min="1000-01-01" max={hoje} required disabled={bloqueado} /></label>
      <label>Até<input name="fim" type="date" defaultValue={periodo.fim} min="1000-01-01" max={hoje} required disabled={bloqueado} /></label>
      <button type="submit" className="botao-principal" disabled={bloqueado}>Aplicar período</button>
      {erro && <p className="erro-periodo" role="alert">{erro}</p>}
    </form>}
    <p className="periodo-consultado">{formatarData(periodo.inicio)} – {formatarData(periodo.fim, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
  </div>;
}
