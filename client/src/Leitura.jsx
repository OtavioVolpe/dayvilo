import AgendamentosLeitura from './AgendamentosLeitura.jsx';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Plus, ArrowUpRight, Pencil, Trash2, X, CalendarDays, NotebookText } from 'lucide-react';
import { solicitar } from './api.js';
import { deslocarData, formatarData } from './datas.js';
import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import './leitura.css';
import LeituraVazia from './LeituraVazia.jsx';

const estados = { quero_ler: 'Quero ler', lendo: 'Lendo', lido: 'Lidos' };
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const numero = v => v === '' || v == null ? null : Number(v);
const dataCurta = d => formatarData(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
const camposLivro = l => ({ titulo: l.titulo, autor: l.autor, estado: l.estado, total_paginas: numero(l.total_paginas), pagina_atual: numero(l.pagina_atual), inicio: l.inicio || null, termino: l.termino || null, ...(l.id ? { versao: l.versao } : {}), encerrar_agendamentos: l.encerrar_agendamentos ?? true });

function Janela({ fechar, children }) {
  const ref = useRef(null);
  useEffect(() => { const anterior = document.activeElement; ref.current.showModal(); return () => anterior?.focus(); }, []);
  return <dialog className="leitura-janela" ref={ref} aria-label="Livro e anotações" onCancel={e => { e.preventDefault(); fechar(); }}>
    <button type="button" className="leitura-fechar" aria-label="Fechar livro" onClick={fechar}><X size={22} /></button>{children}
  </dialog>;
}

export default function Leitura({ inicial, aoConsumirInicial, aoAlterarSujo }) {
  const [dados, setDados] = useState(null), [aba, setAba] = useState('lendo');
  const [id, setId] = useState(inicial || null), [detalhe, setDetalhe] = useState(null);
  const [form, setForm] = useState(null), [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState(''), [aviso, setAviso] = useState(''), [ocupado, setOcupado] = useState(false);
  const [revisao, setRevisao] = useState(0), [confirmacao, setConfirmacao] = useState(null);
  const bloqueio = useRef(false), inicialRef = useRef(inicial);
  useEffect(() => {
    const abortar = new AbortController();
    solicitar('/leitura', { signal: abortar.signal }).then(r => { if (!abortar.signal.aborted) setDados(r); }).catch(e => { if (!abortar.signal.aborted) setErro(e.message); });
    return () => abortar.abort();
  }, [revisao]);
  useEffect(() => {
    if (!id) { setDetalhe(null); return; }
    const abortar = new AbortController(); setDetalhe(null);
    solicitar('/leitura/' + id, { signal: abortar.signal }).then(r => {
      if (abortar.signal.aborted) return;
      setDetalhe(r);
      if (inicialRef.current) { setAba(r.livro.estado); inicialRef.current = null; aoConsumirInicial?.(); }
    }).catch(e => { if (!abortar.signal.aborted) setErro(e.message); });
    return () => abortar.abort();
  }, [id, revisao]);
  useEffect(() => { aoAlterarSujo?.(sujo || ocupado); }, [sujo, ocupado, aoAlterarSujo]);
  useEffect(() => () => aoAlterarSujo?.(false), [aoAlterarSujo]);
  useEffect(() => {
    if (!sujo && !ocupado) return;
    const sair = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', sair); return () => window.removeEventListener('beforeunload', sair);
  }, [sujo, ocupado]);

  function navegar(fn) {
    if (bloqueio.current) return;
    const acao = () => { setSujo(false); setForm(null); setErro(''); fn(); };
    if (sujo) setConfirmacao({ mensagem: 'Descartar alterações não salvas?', acao }); else acao();
  }
  function fechar() { navegar(() => { setId(null); inicialRef.current = null; aoConsumirInicial?.(); }); }
  function alterar(chave, valor) { setSujo(true); setForm(v => ({ ...v, [chave]: valor })); }
  async function executar(url, method, body, mensagem, depois) {
    if (bloqueio.current) return;
    bloqueio.current = true; setOcupado(true); setErro(''); setAviso('');
    try {
      const r = await solicitar(url, json(method, body));
      setForm(null); setSujo(false); setDetalhe(null); setRevisao(n => n + 1);
      setAviso(typeof mensagem === 'function' ? mensagem(r) : mensagem); depois?.(r);
    } catch (e) { setErro(e.message); }
    finally { bloqueio.current = false; setOcupado(false); }
  }
  function novo(estado = aba) { setId(null); setErro(''); setAviso(''); setForm({ modo: 'livro', titulo: '', autor: '', estado, pagina_atual: '', total_paginas: '', inicio: '', termino: '' }); }
  function editar(l, modo = 'livro') { setForm({ ...l, ...(modo === 'progresso' && l.estado !== 'lendo' ? { estado: 'lendo', termino: '' } : {}), modo, encerrar_agendamentos: true }); setErro(''); }
  function agenda(remover = false) { setForm({ modo: 'agenda', remover, frequencia: remover ? 'repetir' : 'unica', inicio: dados.hoje, fim: deslocarData(dados.hoje, 27), dias: [], horario: '' }); setErro(''); }
  function salvar(e) {
    e.preventDefault();
    if (form.modo === 'livro' || form.modo === 'progresso') return executar('/leitura' + (form.id ? '/' + form.id : ''), form.id ? 'PUT' : 'POST', camposLivro(form), form.id ? 'Livro salvo.' : 'Livro salvo na estante. Nenhuma leitura foi agendada automaticamente.', r => { setId(r.id); setAba(form.estado); });
    if (form.modo === 'nota') return executar(`/leitura/${id}/notas`, 'POST', { versao: detalhe.livro.versao, texto: form.texto, pagina: numero(form.pagina), ...(form.id ? { nota_id: form.id } : {}) }, 'Anotação salva.');
    const acao = () => executar(`/leitura/${id}/${form.remover ? 'desagendar' : 'agendar'}`, 'POST', { versao: detalhe.livro.versao, inicio: form.inicio, fim: form.frequencia === 'unica' ? form.inicio : form.fim, dias: form.frequencia === 'unica' ? [new Date(form.inicio + 'T12:00:00Z').getUTCDay()] : form.dias, horario: form.horario || null }, r => `${r.quantidade} leitura(s) ${form.remover ? 'desagendada(s)' : 'adicionada(s) à Rotina'}.`);
    if (form.remover) setConfirmacao({ rotulo: 'Desagendar leituras', destrutiva: true, mensagem: 'Remover as leituras pendentes nos dias e período selecionados? O histórico será mantido.', acao }); else acao();
  }
  const livro = detalhe?.livro, aberta = Boolean(id || form);
  const erroExibido = erro && <p className="mensagem-erro" role="alert">{erro} <button type="button" disabled={ocupado} onClick={() => navegar(() => { setRevisao(n => n + 1); })}>Atualizar dados</button></p>;
  return <section className="leitura">
    <header className="leitura-topo"><div><h1>Minha estante</h1><p>Escolha sua próxima leitura. Guarde o que ficou.</p></div><button className="botao-principal" onClick={() => novo()} disabled={!dados || ocupado}><Plus size={18} />Novo livro</button></header>
    <nav className="routine-tabs" aria-label="Situação dos livros">{Object.entries(estados).map(([valor, nome]) => <button key={valor} aria-pressed={aba === valor} onClick={() => setAba(valor)}>{nome}{dados && <span className="leitura-contagem">{dados.livros.filter(l => l.estado === valor).length}</span>}</button>)}</nav>
    {!aberta && erroExibido}{!aberta && aviso && <p role="status">{aviso}</p>}
    {!dados ? <p role="status">Carregando sua estante…</p> : <div className="leitura-grade">{dados.livros.filter(l => l.estado === aba).map(l => <article className="leitura-card" key={l.id}>
      <BookOpen className="leitura-simbolo" size={24} /><h2>{l.titulo}</h2>{l.autor && <p>{l.autor}</p>}
      <div className="leitura-progresso">{l.total_paginas && l.pagina_atual !== null ? <><progress max={l.total_paginas} value={l.pagina_atual} aria-label={`Progresso de ${l.titulo}`} /><span>{l.pagina_atual} de {l.total_paginas} páginas</span></> : <span>{l.pagina_atual !== null ? `Página ${l.pagina_atual}` : l.total_paginas ? `${l.total_paginas} páginas` : 'Sem acompanhamento de páginas'}</span>}</div>
      {l.termino && <p>Concluído em {dataCurta(l.termino)}</p>}
      <div className="leitura-acoes">{l.estado === 'lendo' && <button onClick={() => { setId(l.id); editar(l, 'progresso'); }}>Atualizar progresso</button>}<button aria-label={`Abrir livro: ${l.titulo}`} onClick={() => { setErro(''); setId(l.id); }}><span>Abrir livro</span><ArrowUpRight size={18} /></button></div>
    </article>)}{!dados.livros.some(l => l.estado === aba) && !erro && <LeituraVazia estado={aba} estanteVazia={!dados.livros.length} bloqueado={ocupado} aoCriar={novo} />}</div>}
    {aberta && <Janela fechar={fechar}>
      <span className="leitura-etiqueta"><BookOpen size={18} />Leitura</span>
      <h2>{form ? ({ livro: form.id ? 'Editar livro' : 'Novo livro', progresso: 'Atualizar progresso', nota: form.id ? 'Editar anotação' : 'Nova anotação', agendamentos: 'Agendamentos de leitura', agenda: form.remover ? 'Desagendar leitura' : 'Agendar leitura' })[form.modo] : livro?.titulo || 'Abrindo livro…'}</h2>
      {erroExibido}{aviso && <p role="status">{aviso}</p>}
      {form?.modo === 'agendamentos' ? livro ? <AgendamentosLeitura key={livro.versao} livro={livro} agendamentos={detalhe.agendamentos} hoje={dados.hoje} ocupado={ocupado} voltar={() => navegar(() => {})} remover={tarefas => setConfirmacao({ rotulo: 'Desagendar leituras', destrutiva: true, mensagem: 'Desagendar as ' + tarefas.length + ' leituras selecionadas? Elas serão removidas também da Rotina. Leituras concluídas ou puladas serão mantidas.', acao: () => executar('/leitura/' + id + '/desagendar', 'POST', { versao: livro.versao, tarefas }, r => r.quantidade + ' leitura(s) desagendada(s).' + (r.preservados ? ' ' + r.preservados + ' preservada(s).' : ''), () => setForm({ modo: 'agendamentos' })) })} /> : <p role="status">Carregando agendamentos…</p> : form ? <form onSubmit={salvar}><fieldset disabled={ocupado || (id && !detalhe)}>
        {(form.modo === 'livro' || form.modo === 'progresso') && <>
          {form.modo === 'livro' ? <><label>Título<input autoFocus required maxLength={180} value={form.titulo} onChange={e => alterar('titulo', e.target.value)} /></label><label>Autor <small>(opcional)</small><input maxLength={160} value={form.autor} onChange={e => alterar('autor', e.target.value)} /></label></> : <p>{form.titulo}</p>}
          <label>Situação<select value={form.estado} onChange={e => { alterar('estado', e.target.value); if (e.target.value !== 'lido') alterar('termino', ''); }}><option value="quero_ler">Quero ler</option><option value="lendo">Lendo</option><option value="lido">Lido</option></select></label>
          <div className="leitura-dupla"><label>Página atual <small>(opcional)</small><input autoFocus={form.modo === 'progresso'} type="number" min="0" max={form.total_paginas || 1000000} step="1" value={form.pagina_atual ?? ''} onChange={e => alterar('pagina_atual', e.target.value)} /></label><label>Total de páginas <small>(opcional)</small><input type="number" min="1" max="1000000" step="1" value={form.total_paginas ?? ''} onChange={e => alterar('total_paginas', e.target.value)} /></label></div>
          <div className="leitura-dupla"><label>Início <small>(opcional)</small><input type="date" max={dados?.hoje} value={form.inicio || ''} onInput={e => alterar('inicio', e.target.value)} /></label>{form.estado === 'lido' && <label>Término <small>(opcional)</small><input type="date" min={form.inicio || undefined} max={dados?.hoje} value={form.termino || ''} onInput={e => alterar('termino', e.target.value)} /></label>}</div>
          <p className="leitura-ajuda">Ao começar ou concluir, a data vazia será preenchida com hoje. Você também pode informar uma data anterior.</p>
          {form.estado === 'lido' && form.id && <label className="leitura-check"><input type="checkbox" checked={form.encerrar_agendamentos} onChange={e => alterar('encerrar_agendamentos', e.target.checked)} />Encerrar leituras pendentes de hoje em diante, mantendo o histórico.</label>}
        </>}
        {form.modo === 'nota' && <><label>Anotação ou trecho<textarea autoFocus required rows={8} maxLength={4000} value={form.texto} onChange={e => alterar('texto', e.target.value)} /></label><label>Página <small>(opcional)</small><input type="number" min="1" max="1000000" value={form.pagina ?? ''} onChange={e => alterar('pagina', e.target.value)} /></label></>}
        {form.modo === 'agenda' && <><p>{livro?.titulo}</p><label>Frequência<select value={form.frequencia} onChange={e => alterar('frequencia', e.target.value)}><option value="unica">Uma vez</option><option value="repetir">Repetir</option></select></label>{form.frequencia === 'unica' ? <label>Data<input type="date" required min={dados.hoje} value={form.inicio} onInput={e => alterar('inicio', e.target.value)} /></label> : <><div className="leitura-dupla"><label>De<input type="date" required min={dados.hoje} value={form.inicio} onInput={e => alterar('inicio', e.target.value)} /></label><label>Até<input type="date" required min={form.inicio} value={form.fim} onInput={e => alterar('fim', e.target.value)} /></label></div><div className="leitura-dias" role="group" aria-label="Dias da semana">{[['Seg', 1], ['Ter', 2], ['Qua', 3], ['Qui', 4], ['Sex', 5], ['Sáb', 6], ['Dom', 0]].map(([nome, dia]) => <label key={dia}><input type="checkbox" checked={form.dias.includes(dia)} onChange={e => alterar('dias', e.target.checked ? [...form.dias, dia] : form.dias.filter(v => v !== dia))} />{nome}</label>)}</div></>}{!form.remover && <label>Horário <small>(opcional)</small><input type="time" value={form.horario} onInput={e => alterar('horario', e.target.value)} /></label>}<p className="leitura-ajuda">{form.remover ? 'Remove apenas leituras pendentes. Dias passados, concluídos e pulados são preservados.' : 'Aparece na Rotina. Dias já agendados não serão duplicados. Concluir a tarefa não altera as páginas do livro.'}</p></>}
        <div className="leitura-acoes"><button type="button" onClick={() => navegar(() => {})}>Cancelar</button><button className="botao-principal" type="submit" disabled={form.modo === 'agenda' && form.frequencia !== 'unica' && !form.dias.length}>{ocupado ? 'Salvando…' : form.modo === 'agenda' ? form.remover ? 'Desagendar' : 'Agendar' : 'Salvar'}</button></div>
      </fieldset></form> : livro && <>
        <p>{livro.autor || 'Autor não informado'} · {estados[livro.estado] === 'Lidos' ? 'Lido' : estados[livro.estado]}</p>
        <p>{livro.pagina_atual !== null ? `Página ${livro.pagina_atual}` : 'Sem página registrada'}{livro.total_paginas ? ` de ${livro.total_paginas}` : ''}</p>
        {(livro.inicio || livro.termino) && <p>{livro.inicio && `Início: ${dataCurta(livro.inicio)}`}{livro.termino && ` · Término: ${dataCurta(livro.termino)}`}</p>}
        <div className="leitura-acoes"><button onClick={() => editar(livro, 'progresso')}>{livro.estado === 'quero_ler' ? 'Começar leitura' : livro.estado === 'lido' ? 'Reabrir leitura' : 'Atualizar progresso'}</button><button onClick={() => editar(livro)}><Pencil size={17} />Editar livro</button>{livro.estado === 'lendo' && <button onClick={() => agenda()}><CalendarDays size={17} />Agendar leitura</button>}</div>
        <button className="leitura-ver-agendamentos" onClick={() => { setAviso(''); setForm({ modo: 'agendamentos' }); }}><CalendarDays size={17} />Ver agendamentos</button>
        <div className="leitura-notas-topo"><h3><NotebookText size={19} />Anotações</h3><button onClick={() => setForm({ modo: 'nota', texto: '', pagina: '' })}><Plus size={16} />Nova anotação</button></div>
        {!detalhe.notas.length && <p>Nenhuma anotação ainda. Guarde ideias e trechos que quiser revisitar.</p>}
        {detalhe.notas.map(n => <article className="leitura-nota" key={n.id}>{n.pagina && <span>Página {n.pagina}</span>}<p>{n.texto}</p><div className="leitura-acoes"><button aria-label="Editar anotação" onClick={() => setForm({ ...n, modo: 'nota' })}><Pencil size={16} /></button><button aria-label="Excluir anotação" onClick={() => setConfirmacao({ rotulo: 'Excluir anotação', destrutiva: true, mensagem: 'Excluir esta anotação? Não pode ser desfeito.', acao: () => executar(`/leitura/${id}/notas`, 'POST', { nota_id: n.id, excluir: true, versao: livro.versao }, 'Anotação excluída.') })}><Trash2 size={16} /></button></div></article>)}
        <button className="leitura-excluir" disabled={ocupado} onClick={() => setConfirmacao({ rotulo: 'Excluir livro', destrutiva: true, mensagem: 'Excluir o livro e todas as suas anotações? As leituras pendentes de hoje em diante também serão removidas. O histórico da Rotina será preservado, mas sem acesso ao livro. Não pode ser desfeito.', acao: () => executar('/leitura/' + id, 'DELETE', { versao: livro.versao }, 'Livro excluído; histórico da Rotina preservado.', () => setId(null)) })}><Trash2 size={16} />Excluir livro</button>
      </>}
    </Janela>}
    {confirmacao && <ConfirmacaoTreino rotulo={confirmacao.rotulo} destrutiva={confirmacao.destrutiva} mensagem={confirmacao.mensagem} cancelar={() => setConfirmacao(null)} confirmar={() => { const fn = confirmacao.acao; setConfirmacao(null); fn(); }} />}
  </section>;
}
