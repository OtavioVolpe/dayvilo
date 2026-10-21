import { useRef } from 'react';
import './data-consulta.css';

export default function DataConsulta({ data, aoAplicar, bloqueado, rotulo = 'Escolher data', min = '1000-01-01', max = '9999-12-31', foco = false, aoCancelar }) {
  const input = useRef(null);
  function aplicar() {
    if (!bloqueado && input.current.reportValidity()) aoAplicar(input.current.value);
  }
  return <div className="data-consulta">
    <label>{rotulo}<input key={data} ref={input} autoFocus={foco} type="date" defaultValue={data} min={min} max={max} required disabled={bloqueado} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); aplicar(); } }} /></label>
    <div className="data-consulta-acoes">{aoCancelar && <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>}<button type="button" className="botao-secundario" disabled={bloqueado} onClick={aplicar}>Aplicar</button></div>
  </div>;
}
