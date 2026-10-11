import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Archive, ChevronLeft, ChevronRight, Dumbbell, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { solicitar } from './api.js';
import { deslocarData, formatarData } from './datas.js';
import './treino.css';

const diasSemana = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];
const novoExercicio = () => ({ nome: '', series: 3, repeticoes: '8–12', carga: null, descanso: null, observacao: '' });
const numerico = valor => valor === '' ? null : Number(valor);
const enviar = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const inicioSemana = data => deslocarData(data, -((new Date(data + 'T12:00:00Z').getUTCDay() + 6) % 7));

export default function Treino({ sessaoInicial = null, aoConsumirSessao, aoAlterarSujo }) {
  const [confirmacao, setConfirmacao] = useState(null);
  const [hoje, setHoje] = useState(''), [data, setData] = useState(''), [visao, setVisao] = useState('Hoje');
  const [dados, setDados] = useState({ fichas: [], sessoes: [] }), [revisao, setRevisao] = useState(0);
  const [carregando, setCarregando] = useState(true), [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(''), [aviso, setAviso] = useState('');
  const [ficha, setFicha] = useState(null), [agenda, setAgenda] = useState(null), [sessao, setSessao] = useState(null), [sujo, setSujo] = useState(false);
  useEffect(() => { aoAlterarSujo?.(sujo); return () => aoAlterarSujo?.(false); }, [sujo, aoAlterarSujo]);
  useEffect(() => { let ativo = true; solicitar('/perfil').then(p => { if (ativo) { setHoje(p.data_hoje); setData(p.data_hoje); } }).catch(e => { if (ativo) { setErro(e.message); setCarregando(false); } }); return () => { ativo = false; }; }, []);
  useEffect(() => {
    if (!data) return;
    let ativo = true; setCarregando(true);
    const inicio = visao === 'Hoje' ? data : inicioSemana(data), fim = visao === 'Hoje' ? data : deslocarData(inicio, 6);
    solicitar(`/treinos?inicio=${inicio}&fim=${fim}`).then(r => { if (ativo) setDados(r); }).catch(e => { if (ativo) setErro(e.message); }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [data, visao, revisao]);
  useEffect(() => {
    if (!sujo) return;
    const impedir = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', impedir);
    return () => window.removeEventListener('beforeunload', impedir);
  }, [sujo]);
  async function executar(acao) {
    if (ocupado) return;
    setOcupado(true); setErro(''); setAviso('');
    try { await acao(); } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  async function abrirSessao(id) {
    await executar(async () => { const r = await solicitar('/treinos/sessoes/' + id); setSessao(r.sessao); setFicha(null); setAgenda(null); setSujo(false); });
  }
  useEffect(() => { if (sessaoInicial) { abrirSessao(sessaoInicial); aoConsumirSessao?.(); } }, [sessaoInicial]);
  function fechar(confirmado = false) {
    if (sujo && confirmado !== true) { setConfirmacao({ mensagem: 'Descartar alterações não salvas?', acao: () => fechar(true) }); return; }
    setFicha(null); setAgenda(null); setSessao(null); setSujo(false); setErro('');
  }
  function editarExercicio(indice, campo, valor) {
    setSujo(true); setFicha(f => ({ ...f, exercicios: f.exercicios.map((e, i) => i === indice ? { ...e, [campo]: valor } : e) }));
  }
  function mover(indice, delta) {
    setSujo(true); setFicha(f => { const exercicios = [...f.exercicios]; [exercicios[indice], exercicios[indice + delta]] = [exercicios[indice + delta], exercicios[indice]]; return { ...f, exercicios }; });
  }
  async function salvarFicha(e) {
    e.preventDefault(); await executar(async () => {
      await solicitar('/treinos/fichas' + (ficha.id ? '/' + ficha.id : ''), enviar(ficha.id ? 'PUT' : 'POST', { nome: ficha.nome, exercicios: ficha.exercicios, ...(ficha.id ? { versao: ficha.versao } : {}) }));
      setFicha(null); setSujo(false); setRevisao(r => r + 1); setAviso('Ficha salva. Treinos já agendados foram mantidos.');
    });
  }
  async function agendar(e) {
    e.preventDefault(); await executar(async () => {
      const r = await solicitar('/treinos/agenda', enviar('POST', agenda));
      setData(agenda.inicio); setAgenda(null); setSujo(false); setRevisao(v => v + 1); setAviso(r.quantidade ? `${r.quantidade} treino(s) agendado(s).` : 'Nenhum treino novo. Confira os dias e os agendamentos existentes.');
    });
  }
  function registrar(exercicio, serie, campo, valor) {
    setSujo(true); setSessao(s => ({ ...s, realizado: s.realizado.map((e, i) => i !== exercicio ? e : { ...e, series: e.series.map((r, j) => j === serie ? { ...r, [campo]: valor } : r) }) }));
  }
  async function salvarRegistro(concluir, confirmado = false) {
    if (concluir && !confirmado && sessao.realizado.some(e => e.series.some(s => !s.feita))) { setConfirmacao({ mensagem: 'Há séries não marcadas. Concluir o treino mesmo assim?', acao: () => salvarRegistro(true, true) }); return; }
    await executar(async () => {
      const r = await solicitar('/treinos/sessoes/' + sessao.id, enviar('PUT', { versao: sessao.versao, realizado: sessao.realizado, concluir }));
      setSessao(r.sessao); setSujo(false); setRevisao(v => v + 1); setAviso(concluir ? 'Treino concluído também na Rotina.' : 'Registro salvo.');
    });
  }
  const editando = Boolean(ficha || agenda || sessao), bloqueado = ocupado || carregando;
  const dias = data ? (visao === 'Hoje' ? [data] : Array.from({ length: 7 }, (_, i) => deslocarData(inicioSemana(data), i))) : [];
  return <section className="treino" aria-label="Treinos" aria-busy={ocupado || carregando}>
    {confirmacao && <ConfirmacaoTreino mensagem={confirmacao.mensagem} cancelar={() => setConfirmacao(null)} confirmar={() => { const acao = confirmacao.acao; setConfirmacao(null); acao(); }} />}
    <header className="treino-topo"><div><h1>Meu treino</h1><p>Planeje. Registre. Acompanhe.</p></div>{!editando && <button className="botao-principal" disabled={bloqueado || !data} onClick={() => { setFicha({ nome: '', exercicios: [novoExercicio()] }); setSujo(false); setAviso(''); }}><Plus size={17} />Nova ficha</button>}</header>
    {erro && <p className="mensagem-erro" role="alert">{erro}</p>}{aviso && <p className="mensagem-sucesso" role="status">{aviso}</p>}
    {!editando && <>
      <nav className="routine-tabs" aria-label="Visualizações do treino">{['Hoje', 'Semana'].map(v => <button key={v} disabled={ocupado} aria-pressed={visao === v} onClick={() => setVisao(v)}>{v}</button>)}</nav>
      <div className="treino-navegacao"><button aria-label={visao === 'Hoje' ? 'Dia anterior' : 'Semana anterior'} disabled={bloqueado || !data} onClick={() => setData(deslocarData(data, visao === 'Hoje' ? -1 : -7))}><ChevronLeft /></button><label><span className="sr-only">Escolher data</span><input type="date" value={data} required disabled={ocupado} onChange={e => { if (e.target.value) setData(e.target.value); }} /></label><button aria-label={visao === 'Hoje' ? 'Próximo dia' : 'Próxima semana'} disabled={bloqueado || !data} onClick={() => setData(deslocarData(data, visao === 'Hoje' ? 1 : 7))}><ChevronRight /></button><button disabled={bloqueado || !hoje} onClick={() => setData(hoje)}>Hoje</button></div>
      {carregando ? <p role="status">Carregando treinos…</p> : <div className={visao === 'Semana' ? 'treino-semana' : 'treino-dia'}>{dias.map(d => <section className="treino-dia-card" key={d}><h2>{formatarData(d, { weekday: 'short', day: '2-digit', month: '2-digit' })}{d === hoje && <small>Hoje</small>}</h2>{dados.sessoes.filter(s => s.data_prevista === d).map(s => <button className="treino-agendado" key={s.id} disabled={ocupado} onClick={() => abrirSessao(s.id)}><Dumbbell size={20} /><span><strong>{s.titulo}</strong><small>{({ pendente: 'Abrir treino', concluida: 'Concluído · ver registro', pulada: 'Pulado · ver ficha' })[s.situacao]}</small></span><ChevronRight size={18} /></button>)}{!dados.sessoes.some(s => s.data_prevista === d) && <p className="treino-vazio">Sem treino agendado.</p>}</section>)}</div>}
      <h2 className="treino-fichas-titulo">Minhas fichas</h2><p className="treino-ajuda">Monte os exercícios e escolha os dias para treinar.</p>
      {!dados.fichas.length && !carregando && <p className="treino-vazio">Crie sua primeira ficha, como “A — Peito e tríceps”.</p>}
      <div className="treino-fichas">{dados.fichas.map(f => <article className="treino-ficha-card" key={f.id}><h3>{f.nome}</h3><p>{f.exercicios.length} exercício(s)</p><div className="treino-acoes"><button disabled={bloqueado} onClick={() => { setAgenda({ ficha_id: f.id, inicio: data, fim: deslocarData(data, 27), dias: [new Date(data + 'T12:00:00Z').getUTCDay()] }); setAviso(''); }}>Agendar</button><button aria-label={'Editar ficha ' + f.nome} title="Editar ficha" disabled={bloqueado} onClick={() => { setFicha(structuredClone(f)); setSujo(false); setAviso(''); }}><Pencil size={18} /></button><button aria-label={'Arquivar ficha ' + f.nome} title="Arquivar ficha" disabled={bloqueado} onClick={() => { setConfirmacao({ mensagem: 'Arquivar esta ficha? Os treinos agendados e registros serão mantidos.', acao: () => executar(async () => { const r = await solicitar('/treinos/fichas/' + f.id, { method: 'DELETE' }); setAviso(r.mensagem); setRevisao(v => v + 1); }) }); }}><Archive size={18} /></button></div></article>)}</div>
    </>}
    {ficha && <form onSubmit={salvarFicha}><fieldset disabled={ocupado}><legend>{ficha.id ? 'Editar ficha' : 'Nova ficha'}</legend><p className="treino-ajuda">Alterações valem para novos agendamentos.</p><label>Nome da ficha<input required maxLength={120} value={ficha.nome} placeholder="A — Peito e tríceps" onChange={e => { setFicha({ ...ficha, nome: e.target.value }); setSujo(true); }} /></label>
      {ficha.exercicios.map((ex, i) => <section className="treino-exercicio" key={i}><header><h3>Exercício {i + 1}</h3><div className="treino-acoes"><button type="button" aria-label={'Subir exercício ' + (i + 1)} disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp size={16} /></button><button type="button" aria-label={'Descer exercício ' + (i + 1)} disabled={i === ficha.exercicios.length - 1} onClick={() => mover(i, 1)}><ArrowDown size={16} /></button><button type="button" aria-label={'Remover exercício ' + (i + 1)} disabled={ficha.exercicios.length === 1} onClick={() => { setFicha({ ...ficha, exercicios: ficha.exercicios.filter((_, j) => j !== i) }); setSujo(true); }}><Trash2 size={16} /></button></div></header>
        <label>Exercício<input required maxLength={120} value={ex.nome} onChange={e => editarExercicio(i, 'nome', e.target.value)} placeholder="Ex.: supino reto" /></label><div className="treino-campos"><label>Séries<input type="number" required min="1" max="10" value={ex.series ?? ''} onChange={e => editarExercicio(i, 'series', numerico(e.target.value))} /></label><label>Repetições<input required maxLength={40} value={ex.repeticoes} onChange={e => editarExercicio(i, 'repeticoes', e.target.value)} /></label><label>Carga (kg)<input type="number" min="0" max="2000" step="0.01" value={ex.carga ?? ''} onChange={e => editarExercicio(i, 'carga', numerico(e.target.value))} /></label><label>Descanso (s)<input type="number" min="0" max="3600" value={ex.descanso ?? ''} onChange={e => editarExercicio(i, 'descanso', numerico(e.target.value))} /></label></div><label>Observação<input maxLength={500} value={ex.observacao} onChange={e => editarExercicio(i, 'observacao', e.target.value)} /></label>
      </section>)}<button type="button" disabled={ficha.exercicios.length >= 30} onClick={() => { setFicha({ ...ficha, exercicios: [...ficha.exercicios, novoExercicio()] }); setSujo(true); }}>+ Exercício</button><div className="treino-rodape"><button type="button" onClick={fechar}>Cancelar</button><button className="botao-principal" type="submit">Salvar ficha</button></div></fieldset></form>}
    {agenda && <form onSubmit={agendar}><fieldset disabled={ocupado}><legend>Agendar {dados.fichas.find(f => f.id === agenda.ficha_id)?.nome}</legend><div className="treino-campos"><label>De<input required type="date" value={agenda.inicio} onChange={e => { setAgenda({ ...agenda, inicio: e.target.value }); setSujo(true); }} /></label><label>Até<input required type="date" min={agenda.inicio} value={agenda.fim} onChange={e => { setAgenda({ ...agenda, fim: e.target.value }); setSujo(true); }} /></label></div><div className="treino-dias-escolha" role="group" aria-label="Dias da semana">{diasSemana.map(([n, nome]) => <label key={n}><input type="checkbox" checked={agenda.dias.includes(n)} onChange={e => { setAgenda({ ...agenda, dias: e.target.checked ? [...agenda.dias, n] : agenda.dias.filter(d => d !== n) }); setSujo(true); }} />{nome}</label>)}</div><p className="treino-ajuda">Cada dia aparece também na Rotina. Agendamentos iguais não são duplicados.</p><div className="treino-rodape"><button type="button" onClick={fechar}>Cancelar</button><button type="submit" className="botao-principal" disabled={!agenda.dias.length}>Agendar treinos</button></div></fieldset></form>}
    {sessao && <form onSubmit={e => { e.preventDefault(); salvarRegistro(false); }}><div className="treino-sessao-topo"><div><h2>{sessao.planejado.nome}</h2><p>{formatarData(sessao.data_prevista)} · {({ pendente: 'Pendente', concluida: 'Concluído', pulada: 'Pulado' })[sessao.situacao]}</p></div><button type="button" disabled={ocupado} onClick={fechar}>Voltar</button></div><p className="treino-ajuda">Anote a carga em kg e as repetições feitas. Use sempre o mesmo critério de peso.</p>{sessao.situacao !== 'pendente' && <p className="treino-ajuda">Registro protegido. Para corrigir, restaure o treino na Rotina.</p>}
      <fieldset disabled={ocupado || sessao.situacao !== 'pendente'}><legend className="sr-only">Registro do treino</legend>{sessao.planejado.exercicios.map((ex, i) => <section className="treino-exercicio" key={i}><header><h3>{i + 1}. {ex.nome}</h3><button type="button" onClick={() => { const feitas = sessao.realizado[i].series.every(s => s.feita); setSessao(s => ({ ...s, realizado: s.realizado.map((e, j) => j !== i ? e : { ...e, series: e.series.map(r => ({ ...r, feita: !feitas })) }) })); setSujo(true); }}>{sessao.realizado[i].series.every(s => s.feita) ? 'Desmarcar' : 'Marcar exercício'}</button></header><p className="treino-ajuda">{ex.series} × {ex.repeticoes}{ex.carga !== null ? ` · Referência: ${ex.carga} kg` : ''}{ex.descanso !== null ? ` · Descanso: ${ex.descanso}s` : ''}</p>{ex.observacao && <p className="treino-observacao">{ex.observacao}</p>}<div className="treino-serie treino-serie-titulos" aria-hidden="true"><span>Série</span><span>Kg</span><span>Reps</span><span>Feita</span></div>{sessao.realizado[i].series.map((r, j) => <div className="treino-serie" key={j}><span>{j + 1}</span><input aria-label={`${ex.nome}, série ${j + 1}, carga em kg`} type="number" min="0" max="2000" step="0.01" value={r.carga ?? ''} placeholder="—" onChange={e => registrar(i, j, 'carga', numerico(e.target.value))} /><input aria-label={`${ex.nome}, série ${j + 1}, repetições`} type="number" min="0" max="1000" value={r.repeticoes ?? ''} placeholder="—" onChange={e => registrar(i, j, 'repeticoes', numerico(e.target.value))} /><input aria-label={`${ex.nome}, série ${j + 1}, realizada`} type="checkbox" checked={r.feita} onChange={e => registrar(i, j, 'feita', e.target.checked)} /></div>)}<label>Nota do treino<input maxLength={500} value={sessao.realizado[i].observacao} onChange={e => { const valor = e.target.value; setSessao(s => ({ ...s, realizado: s.realizado.map((r, j) => j === i ? { ...r, observacao: valor } : r) })); setSujo(true); }} /></label></section>)}{sessao.situacao === 'pendente' && <div className="treino-rodape"><span role="status">{sujo ? 'Alterações não salvas' : 'Registro salvo'}</span><button type="submit">Salvar registro</button><button type="button" className="botao-principal" onClick={() => { if (document.querySelector('.treino form').reportValidity()) salvarRegistro(true); }}>Concluir treino</button></div>}</fieldset>
    </form>}
  </section>;
}
