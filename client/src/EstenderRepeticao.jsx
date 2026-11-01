import { useRef, useState } from 'react';
import { solicitar } from './api.js';
import { formatarData } from './datas.js';
import CampoHorario from './CampoHorario.jsx';

function somar(data, dias) { const d = new Date(data + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); }
export default function EstenderRepeticao({ tarefa, regra, hoje, cancelar, concluido, ocupar }) {
  const minimo = regra.ate >= hoje ? somar(regra.ate, 1) : hoje;
  const [form, setForm] = useState({ inicio: minimo, ate: somar(minimo, 29), tipo: regra.tipo || 'semanal', dias: regra.dias || [], horario: tarefa.horario || '', horario_final: tarefa.horario_final || '' });
  const [previa, setPrevia] = useState(null), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  function alterar(campo, valor) { setForm(f => ({ ...f, [campo]: valor })); setPrevia(null); setErro(''); }
  async function enviar(e) {
    e.preventDefault(); if (trava.current) return;
    trava.current = true; setOcupado(true); ocupar(true); setErro('');
    try {
      const resultado = await solicitar(`/tarefas/${tarefa.id}/serie/extensao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, horario: form.horario || null, horario_final: form.horario_final || null, termino_anterior: regra.ate, previa: !previa }) });
      if (previa) concluido(resultado); else setPrevia(resultado);
    } catch (e) { setErro(e.message); setPrevia(null); }
    finally { trava.current = false; setOcupado(false); ocupar(false); }
  }
  return <form className="repeticao-extensao" onSubmit={enviar}>
    <h3>{regra.ate < hoje ? 'Retomar repetição' : 'Estender repetição'}</h3>
    <p>As ocorrências anteriores serão preservadas. Os horários abaixo valem apenas para as novas tarefas.</p>
    <fieldset disabled={ocupado}>
      <div className="repeticao-campos"><label>Continuar a partir de<input autoFocus type="date" required min={minimo} value={form.inicio} onChange={e => alterar('inicio', e.target.value)} /></label><label>Repetir até<input type="date" required min={form.inicio} max={form.inicio ? somar(form.inicio, 365) : undefined} value={form.ate} onChange={e => alterar('ate', e.target.value)} /></label></div>
      <label>Frequência<select value={form.tipo} onChange={e => alterar('tipo', e.target.value)}><option value="diaria">Todos os dias</option><option value="semanal">Toda semana</option><option value="quinzenal">A cada duas semanas</option><option value="mensal">Todo mês</option></select></label>
      {['semanal', 'quinzenal'].includes(form.tipo) && <div className="repeticao-dias" role="group" aria-label="Dias da semana">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((nome, dia) => <button key={dia} type="button" aria-pressed={form.dias.includes(dia)} onClick={() => alterar('dias', form.dias.includes(dia) ? form.dias.filter(d => d !== dia) : [...form.dias, dia].sort())}>{nome}</button>)}</div>}
      {!regra.tipo && <p>Confirme a frequência: esta repetição antiga não tem a regra original registrada.</p>}
      {['mensal', 'quinzenal'].includes(form.tipo) && regra.tipo === form.tipo && regra.inicio && <p>O ciclo mantém a referência de {formatarData(regra.inicio)}.</p>}
      <div className="repeticao-campos"><label>Horário inicial (opcional)<CampoHorario value={form.horario} onChange={e => alterar('horario', e.target.value)} /></label><label>Horário final (opcional)<CampoHorario value={form.horario_final} onChange={e => alterar('horario_final', e.target.value)} /></label></div>
      {previa && <p className="repeticao-previa" role="status">Serão adicionadas {previa.quantidade} ocorrências entre {formatarData(previa.inicio)} e {formatarData(previa.fim)}. Datas existentes não serão duplicadas.</p>}
      {erro && <p role="alert">{erro}</p>}
      <div className="repeticao-acoes"><button type="button" onClick={cancelar}>Voltar</button><button type="submit" className="repeticao-confirmar">{ocupado ? 'Aguarde…' : previa ? 'Confirmar novas ocorrências' : 'Conferir novas ocorrências'}</button></div>
    </fieldset>
  </form>;
}
