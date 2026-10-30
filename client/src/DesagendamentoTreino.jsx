import { useEffect, useState } from 'react';
import { solicitar } from './api.js';

export default function DesagendamentoTreino({ dataInicial, ocupado, cancelar, confirmar }) {
  const [data, setData] = useState(dataInicial);
  const [sessoes, setSessoes] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    setCarregando(true); setErro(''); setSessoes([]); setSelecionadas([]);
    if (!data) { setCarregando(false); return; }
    solicitar(`/treinos?inicio=${data}&fim=${data}`).then(r => {
      if (!ativo) return;
      setSessoes(r.sessoes);
      if (r.sessoes.length === 1 && r.sessoes[0].pode_desagendar) setSelecionadas([r.sessoes[0].id]);
    }).catch(e => { if (ativo) setErro(e.message); }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [data, tentativa]);
  const elegiveis = sessoes.filter(s => s.pode_desagendar);
  return <form onSubmit={e => { e.preventDefault(); if (!carregando && selecionadas.length) confirmar({ data, sessoes: selecionadas }); }}>
    <h2>Desagendar treinos</h2>
    <p>Escolha o dia e os treinos que deseja retirar. Suas fichas serão mantidas.</p>
    <fieldset disabled={ocupado}>
      <legend className="sr-only">Treinos do dia</legend>
      <label>Data<input type="date" required value={data} onChange={e => { setData(e.target.value); setSelecionadas([]); setSessoes([]); setCarregando(true); }} /></label>
      {carregando ? <p role="status">Carregando treinos…</p> : erro ? <div role="alert"><p>{erro}</p><button type="button" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></div> : data && <>
        {!sessoes.length && <p>Nenhum treino agendado para este dia.</p>}
        {elegiveis.length > 1 && <button type="button" onClick={() => setSelecionadas(selecionadas.length === elegiveis.length ? [] : elegiveis.map(s => s.id))}>{selecionadas.length === elegiveis.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>}
        {sessoes.map(s => <label className="treino-desagendar-opcao" key={s.id}>
          <input type="checkbox" disabled={!s.pode_desagendar} checked={selecionadas.includes(s.id)} onChange={e => setSelecionadas(ids => e.target.checked ? [...ids, s.id] : ids.filter(id => id !== s.id))} />
          <span><strong>{s.titulo}</strong>{!s.pode_desagendar && <small>Preservado: treino passado, concluído ou com registros.</small>}</span>
        </label>)}
      </>}
      <div className="treino-rodape"><button type="button" onClick={cancelar}>Cancelar</button><button type="submit" disabled={carregando || !selecionadas.length}>Desagendar{selecionadas.length ? ` (${selecionadas.length})` : ''}</button></div>
    </fieldset>
  </form>;
}
