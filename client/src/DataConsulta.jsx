import { useEffect, useRef } from 'react';
import './data-consulta.css';

export default function DataConsulta({ data, aoAplicar, bloqueado, rotulo = 'Escolher data', min = '1000-01-01', max = '9999-12-31', foco = false, aoCancelar }) {
  const input = useRef(null);
  // O change nativo confirma a escolha; o onChange do React também reage
  // a eventos input, que podem ocorrer durante a edição do campo.
  useEffect(() => {
    const campo = input.current;
    const confirmar = () => {
      if (!bloqueado && campo.value && campo.validity.valid && campo.value !== data) aoAplicar(campo.value);
    };
    campo.addEventListener('change', confirmar);
    return () => campo.removeEventListener('change', confirmar);
  }, [data, aoAplicar, bloqueado]);
  function aplicar() {
    if (!bloqueado && input.current.reportValidity() && input.current.value !== data) aoAplicar(input.current.value);
  }
  return <div className="data-consulta">
    <label>{rotulo}<input key={data} ref={input} autoFocus={foco} type="date" defaultValue={data} min={min} max={max} required disabled={bloqueado} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); aplicar(); } }} /></label>
    {aoCancelar && <div className="data-consulta-acoes"><button type="button" className="botao-secundario" onClick={aoCancelar}>Fechar</button></div>}
  </div>;
}
