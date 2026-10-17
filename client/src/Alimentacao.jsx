import DestinosAlimentacao from './DestinosAlimentacao.jsx';
import AguaDia from './AguaDia.jsx';
import { destinosAlimentacao } from './destinos-alimentacao.js';
import { useEffect, useRef, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Copy, Utensils, Clock, Pencil, Trash2, SkipForward, Circle, CircleCheck, NotebookPen, RotateCcw } from 'lucide-react';
import { solicitar } from './api.js';
import { deslocarData, formatarData } from './datas.js';
import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import './alimentacao.css';

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const nomes = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Pré-treino', 'Pós-treino', 'Ceia'];
const dataLonga = d => formatarData(d, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

export default function Alimentacao({ inicial, aoConsumirInicial, aoAlterarSujo }) {
  const [aba, setAba] = useState('hoje'), [data, setData] = useState(inicial?.data || '');
  const [dados, setDados] = useState(null), [carregando, setCarregando] = useState(true), [tentativa, setTentativa] = useState(0);
  const [erro, setErro] = useState(''), [aviso, setAviso] = useState(''), [ocupado, setOcupado] = useState(false);
  const [form, setForm] = useState(null), [sujo, setSujo] = useState(false), [confirmacao, setConfirmacao] = useState(null);
  const abrirInicial = useRef(inicial), formulario = useRef(null), bloqueio = useRef(false);
  const dia = data || dados?.hoje || '';
  useEffect(() => {
    const abortar = new AbortController();
    setCarregando(true); setErro('');
    solicitar('/alimentacao?' + new URLSearchParams({ ...(data ? { data } : {}), ...(aba === 'semana' ? { semanal: 'true' } : {}) }), { signal: abortar.signal })
      .then(r => {
        if (abortar.signal.aborted) return;
        setDados(r);
        if (abrirInicial.current) {
          const refeicao = r.refeicoes.find(item => item.id === abrirInicial.current.id);
          if (refeicao) setForm({ modo: 'refeicao', ...refeicao, horario: refeicao.horario || '' });
          else setErro('A refeição não está mais nesse dia. Consulte a data atual na Rotina.');
          abrirInicial.current = null; aoConsumirInicial?.();
        }
      }).catch(e => { if (!abortar.signal.aborted) setErro(e.message); })
      .finally(() => { if (!abortar.signal.aborted) setCarregando(false); });
    return () => abortar.abort();
  }, [aba, data, tentativa]);
  useEffect(() => { aoAlterarSujo?.(sujo || ocupado); }, [sujo, ocupado, aoAlterarSujo]);
  useEffect(() => () => aoAlterarSujo?.(false), [aoAlterarSujo]);
  useEffect(() => {
    if (!sujo && !ocupado) return;
    const sair = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', sair); return () => window.removeEventListener('beforeunload', sair);
  }, [sujo, ocupado]);
  useEffect(() => { if (form) { formulario.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); formulario.current?.querySelector('input,textarea,select')?.focus({ preventScroll: true }); } }, [form?.modo, form?.id]);

  function navegar(acao) {
    if (ocupado) return;
    const executar = () => { setForm(null); setSujo(false); setErro(''); setAviso(''); acao(); };
    if (sujo) setConfirmacao({ mensagem: 'Descartar alterações não salvas?', executar }); else executar();
  }
  function abrir(v) { navegar(() => setForm(v)); }
  function alterar(campo, valor) { setSujo(true); setForm(v => ({ ...v, [campo]: valor, previa: null })); }
  async function executar(acao, mensagem, fechar = true) {
    if (bloqueio.current) return;
    bloqueio.current = true; setOcupado(true); setErro(''); setAviso('');
    try {
      const resposta = await acao();
      if (fechar) { setForm(null); setSujo(false); setTentativa(n => n + 1); }
      setAviso(mensagem || ''); return resposta;
    } catch (e) { setErro(e.message); }
    finally { bloqueio.current = false; setOcupado(false); }
  }
  function nova() { abrir({ modo: 'refeicao', titulo: '', observacao: '', horario: '', data_prevista: dia, mostrar_rotina: false }); }
  async function salvar(e) {
    e.preventDefault();
    if (form.modo === 'nota') return executar(() => solicitar(`/alimentacao/${form.id}/nota`, json('PATCH', { revisao: form.revisao, nota: form.nota })), 'Anotação salva. O planejamento foi mantido.');
    const body = { titulo: form.titulo, observacao: form.observacao, horario: form.horario || null, data_prevista: form.data_prevista, mostrar_rotina: form.mostrar_rotina, ...(form.id ? { revisao: form.revisao } : {}) };
    const r = await executar(() => solicitar('/alimentacao' + (form.id ? '/' + form.id : ''), json(form.id ? 'PUT' : 'POST', body)), 'Refeição salva.');
    if (r) setData(body.data_prevista);
  }
  function situacao(r, valor) { executar(() => solicitar(`/alimentacao/${r.id}/situacao`, json('PATCH', { situacao: valor, revisao: r.revisao })), 'Refeição atualizada.'); }
  function excluir(r) {
    setConfirmacao({ rotulo: 'Excluir refeição', destrutiva: true, mensagem: `Excluir “${r.titulo}” deste dia, incluindo sua anotação e sua presença na Rotina? Não pode ser desfeito.`, executar: () => executar(() => solicitar('/alimentacao/' + r.id, json('DELETE', { revisao: r.revisao })), 'Refeição excluída.') });
  }
  const selecaoCopia = form?.modo === 'copiar' && dados ? destinosAlimentacao(form, dia, dados.hoje, dados.refeicoes.length) : { destinos: [], erro: '' };
  async function copiar(confirmar = false) {
    if (selecaoCopia.erro || !selecaoCopia.destinos.length || (confirmar && !form.previa)) return;
    const body = { origem: dia, destinos: selecaoCopia.destinos, modo: form.tipo, ...(confirmar ? { confirmacao: form.previa.confirmacao } : {}) };
    const r = await executar(() => solicitar('/alimentacao/copiar', json('POST', body)), confirmar ? 'Planejamento copiado. As novas refeições começam pendentes, sem anotações.' : '', confirmar);
    if (r && !confirmar) setForm(v => ({ ...v, previa: r }));
  }
  const desabilitado = ocupado || carregando;
  return <section className="alimentacao">
    {confirmacao && <ConfirmacaoTreino rotulo={confirmacao.rotulo} destrutiva={confirmacao.destrutiva} mensagem={confirmacao.mensagem} cancelar={() => setConfirmacao(null)} confirmar={() => { const acao = confirmacao.executar; setConfirmacao(null); acao(); }} />}
    <header className="ali-topo"><div><h1>Minha alimentação</h1><p>Seu dia, refeição por refeição.</p></div><button className="botao-principal" disabled={desabilitado || !dados} onClick={nova}><Plus size={18} />Refeição</button></header>
    <nav className="routine-tabs" aria-label="Visualizações da alimentação">{[['hoje', 'Hoje'], ['semana', 'Semana']].map(([a, nome]) => <button key={a} disabled={ocupado} aria-pressed={aba === a} onClick={() => navegar(() => setAba(a))}>{nome}</button>)}</nav>
    <div className="ali-periodo">
      <button aria-label={aba === 'hoje' ? 'Dia anterior' : 'Semana anterior'} disabled={!dia || ocupado} onClick={() => navegar(() => setData(deslocarData(dia, aba === 'semana' ? -7 : -1)))}><ChevronLeft size={20} /></button>
      <label><span className="ali-sr">Data consultada</span><input type="date" min="1001-01-01" max="9998-12-31" value={dia} disabled={ocupado} onInput={e => { const v = e.target.value; if (v) navegar(() => setData(v)); }} /></label>
      <button aria-label={aba === 'hoje' ? 'Próximo dia' : 'Próxima semana'} disabled={!dia || ocupado} onClick={() => navegar(() => setData(deslocarData(dia, aba === 'semana' ? 7 : 1)))}><ChevronRight size={20} /></button>
      <button className="atalho-hoje" disabled={!dados || ocupado || dia === dados.hoje} onClick={() => navegar(() => setData(dados.hoje))}>Hoje</button>
    </div>
    {erro && <div className="mensagem-erro" role="alert">{erro} <button disabled={ocupado} onClick={() => navegar(() => setTentativa(n => n + 1))}>Atualizar lista</button></div>}
    {aviso && <p className="ali-aviso" role="status">{aviso}</p>}
    {dia && !form && <AguaDia key={dia} data={dia} bloqueado={desabilitado} aoOcupar={setOcupado} />}
    {carregando ? <p role="status">Carregando refeições…</p> : form ? <div ref={formulario}>
      {form.modo === 'copiar' ? <section className="ali-form ali-copiar" aria-label="Copiar planejamento">
        <h2>Copiar planejamento</h2><p className="ali-copia-origem">Refeições de {formatarData(dia)}</p><p className="ali-ajuda">Copia as refeições planejadas, sem marcações ou anotações do dia.</p>
        <fieldset disabled={ocupado}><legend className="ali-sr">Destino da cópia</legend>
          <DestinosAlimentacao form={form} alterar={alterar} hoje={dados.hoje} selecao={selecaoCopia} />
          <label>Se já houver refeições<select value={form.tipo} onChange={e => alterar('tipo', e.target.value)}><option value="adicionar">Manter e adicionar as novas</option><option value="substituir">Substituir somente as pendentes</option></select></label>
          <p className="ali-ajuda">Refeições feitas ou puladas são preservadas. {form.tipo === 'adicionar' && 'Adicionar pode criar refeições com o mesmo nome.'}</p>
          {form.previa && <div className="ali-previa"><h3>Confira antes de copiar</h3>{form.previa.resumo.map(r => <p key={r.data}><strong>{formatarData(r.data)}</strong> · {r.adicionar} novas · {r.remover} removidas · {r.existentes - r.remover} mantidas</p>)}</div>}
          <div className="ali-acoes"><button onClick={() => navegar(() => {})}>Cancelar</button>{form.previa ? <button className="botao-principal" onClick={() => copiar(true)}>Confirmar cópia</button> : <button className="botao-principal" disabled={Boolean(selecaoCopia.erro) || !selecaoCopia.destinos.length} onClick={() => copiar()}>Revisar cópia</button>}</div>
        </fieldset>
      </section> : <form className="ali-form" onSubmit={salvar}><fieldset disabled={ocupado}><legend>{form.modo === 'nota' ? 'O que mudou?' : form.id ? 'Editar refeição' : 'Nova refeição'}</legend>
        {form.modo === 'nota' ? <><p className="ali-ajuda">{form.titulo} · {formatarData(form.data_prevista)}. O planejamento original será mantido.</p><label>Anotação<textarea maxLength={2000} value={form.nota} onChange={e => alterar('nota', e.target.value)} placeholder="Ex.: troquei o frango por peixe" /></label></> : <>
          <label>Refeição<input required maxLength={200} list="ali-nomes" value={form.titulo} onChange={e => alterar('titulo', e.target.value)} placeholder="Ex.: Almoço" /><datalist id="ali-nomes">{nomes.map(n => <option key={n} value={n} />)}</datalist></label>
          <div className="ali-campos"><label>Data<input type="date" required min="1001-01-01" max="9998-12-31" value={form.data_prevista} onInput={e => alterar('data_prevista', e.target.value)} /></label><label>Horário · opcional<input type="time" value={form.horario} onInput={e => alterar('horario', e.target.value)} /></label></div>
          <label>Alimentos e quantidades<textarea required maxLength={4000} value={form.observacao} onChange={e => alterar('observacao', e.target.value)} placeholder="Ex.: arroz, feijão e 100 g de frango" /></label>
          <label className="ali-check"><input type="checkbox" checked={form.mostrar_rotina} onChange={e => alterar('mostrar_rotina', e.target.checked)} />Mostrar na Rotina</label>
        </>}
        <div className="ali-acoes"><button type="button" onClick={() => navegar(() => {})}>Cancelar</button><button type="submit" className="botao-principal">{ocupado ? 'Salvando…' : 'Salvar'}</button></div>
      </fieldset></form>}
    </div> : dados && (aba === 'semana' ? <>
      <p className="ali-ajuda">{formatarData(dados.inicio)} a {formatarData(dados.fim)} · Escolha um dia para ver as refeições.</p>
      <div className="ali-semana">{dados.dias.map(d => {
        const lista = dados.refeicoes.filter(r => r.data_prevista === d);
        return <button key={d} className={'ali-dia' + (d === dados.hoje ? ' ali-hoje' : '')} onClick={() => navegar(() => { setData(d); setAba('hoje'); })}>
          <strong>{formatarData(d, { weekday: 'short', day: '2-digit', month: '2-digit' })}{d === dados.hoje && <small>Hoje</small>}</strong>
          {lista.length ? <>{lista.slice(0, 4).map(r => <span key={r.id}><b>{r.titulo}</b> · {r.observacao}</span>)}{lista.length > 4 && <span>+ {lista.length - 4} refeições</span>}<em>{lista.filter(r => r.situacao === 'concluida').length} de {lista.length} feitas · Ver dia →</em></> : <span>Sem refeições planejadas.<em>Planejar dia →</em></span>}
        </button>;
      })}</div>
    </> : <>
      <div className="ali-resumo"><div><h2>{dataLonga(dia)}</h2><span>{dados.refeicoes.filter(r => r.situacao === 'concluida').length} de {dados.refeicoes.length} feitas · {dados.refeicoes.filter(r => r.situacao === 'pulada').length} puladas</span></div><button disabled={desabilitado || !dados.refeicoes.length} className="ali-discreto" onClick={() => abrir({ modo: 'copiar', frequencia: 'unica', destino: '', inicio: dados.hoje, fim: deslocarData(dados.hoje, 27), dias: [], tipo: 'adicionar', previa: null })}><Copy size={17} />Copiar dia</button></div>
      {!dados.refeicoes.length && <div className="ali-vazio"><Utensils size={25} /><h2>O que vai ter neste dia?</h2><p>Adicione sua primeira refeição ou copie o planejamento de outro dia.</p><button className="botao-principal" onClick={nova}><Plus size={18} />Adicionar refeição</button></div>}
      <div className="ali-refeicoes">{dados.refeicoes.map(r => <article key={r.id} className="ali-refeicao">
        <header><div><h3><Utensils size={18} />{r.titulo}</h3><div className="ali-meta"><span><Clock size={13} />{r.horario || 'Sem horário'}</span>{r.mostrar_rotina && <span className="ali-verde">Na Rotina</span>}</div></div><button disabled={desabilitado} className="ali-icone" aria-label={'Editar ' + r.titulo} title="Editar refeição" onClick={() => abrir({ modo: 'refeicao', ...r, horario: r.horario || '' })}><Pencil size={18} /></button></header>
        <p className="ali-alimentos">{r.observacao}</p>
        {r.nota && <p className="ali-nota"><NotebookPen size={15} /><span>{r.nota}</span></p>}
        <footer><button disabled={desabilitado} className={r.situacao === 'concluida' ? 'ali-feita' : ''} title={r.situacao === 'pendente' ? 'Marcar como feita' : 'Voltar para pendente'} onClick={() => situacao(r, r.situacao === 'pendente' ? 'concluida' : 'pendente')}>{r.situacao === 'concluida' ? <CircleCheck size={16} /> : r.situacao === 'pulada' ? <RotateCcw size={16} /> : <Circle size={16} />}{r.situacao === 'concluida' ? 'Feita' : r.situacao === 'pulada' ? 'Pulada' : 'Marcar feita'}</button><div>
          <button className="ali-icone" disabled={desabilitado || r.situacao === 'concluida'} aria-label={r.situacao === 'pulada' ? 'Restaurar ' + r.titulo : 'Pular ' + r.titulo} title={r.situacao === 'pulada' ? 'Voltar para pendente' : 'Pular refeição'} onClick={() => situacao(r, r.situacao === 'pulada' ? 'pendente' : 'pulada')}><SkipForward size={18} /></button>
          <button className="ali-icone" disabled={desabilitado} aria-label={'Anotar mudança em ' + r.titulo} title="Anotar o que mudou" onClick={() => abrir({ modo: 'nota', ...r })}><NotebookPen size={18} /></button>
          <button className="ali-icone" disabled={desabilitado} aria-label={'Excluir ' + r.titulo} title="Excluir refeição" onClick={() => excluir(r)}><Trash2 size={18} /></button>
        </div></footer>
      </article>)}</div>
    </>)}
  </section>;
}
