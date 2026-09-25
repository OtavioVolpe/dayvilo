import { useEffect, useRef, useState } from 'react';
import ListaHistorico from './ListaHistorico.jsx';
import { deslocarData, formatarData } from './datas.js';
import { Plus, Star, Clock, ListTodo, Pencil, Trash2 } from 'lucide-react';

async function solicitar(caminho, opcoes) {
  let resposta;
  try { resposta = await fetch(`/api${caminho}`, opcoes); }
  catch { throw new Error('Não foi possível conectar. Verifique a conexão e tente novamente.'); }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível completar a ação.');
  return dados;
}

export default function Planejamento({ semanal = false, historico = false }) {
  const [periodo, definirPeriodo] = useState(null);
  const [periodoConsultado, definirPeriodoConsultado] = useState(null);
  const [situacao, definirSituacao] = useState('todas');
  const [consultaValida, definirConsultaValida] = useState(false);
  const [dias, definirDias] = useState([]);
  const [hoje, definirHoje] = useState('');
  const [novaData, definirNovaData] = useState('');
  const formularioRef = useRef(null);
  const [editando, definirEditando] = useState(null);
  const [excluindo, definirExcluindo] = useState(null);
  const [tarefas, definirTarefas] = useState([]);
  const [data, definirData] = useState('');
  const [dataSelecionada, definirDataSelecionada] = useState('');
  const [aviso, definirAviso] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [aberto, definirAberto] = useState(false);
  const [salvando, definirSalvando] = useState(false);
  const [atualizando, definirAtualizando] = useState([]);
  const [ordem, definirOrdem] = useState('criacao');
  const [tentativa, definirTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    definirCarregando(true);
    definirConsultaValida(false);
    definirErro('');
    (async () => {
      try {
        const perfil = await solicitar('/perfil');
        const dia = dataSelecionada || perfil.data_hoje;
        const caminho = historico
          ? '/tarefas/historico' + (periodo ? '?' + new URLSearchParams(periodo) : '')
          : `/tarefas${semanal ? '/semana' : ''}?data=${dia}`;
        const dados = await solicitar(caminho);
        if (ativo) { definirConsultaValida(true); if (historico) definirPeriodoConsultado({ inicio: dados.inicio, fim: dados.fim }); definirData(dia); definirDias(dados.dias || []); definirHoje(perfil.data_hoje); definirTarefas(dados.tarefas); }
      } catch (falha) { if (ativo) definirErro(falha.message); }
      finally { if (ativo) definirCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [tentativa, dataSelecionada, semanal, historico, periodo]);

  function abrirFormulario(tarefa = null, dia = data) {
    definirNovaData(dia);
    definirEditando(tarefa); definirAberto(true); definirErro(''); definirAviso('');
    requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      formularioRef.current?.elements.titulo.focus({ preventScroll: true });
    });
  }

  async function excluir(tarefa) {
    definirAtualizando(ids => [...ids, tarefa.id]); definirErro('');
    try {
      await solicitar('/tarefas/' + tarefa.id, { method: 'DELETE' });
      definirTarefas(anteriores => anteriores.filter(item => item.id !== tarefa.id));
      if (editando?.id === tarefa.id) { definirEditando(null); definirAberto(false); }
      definirExcluindo(null);
    } catch (falha) { definirErro(falha.message); }
    finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
  }

  async function adicionar(evento) {
    evento.preventDefault();
    if (salvando) return;
    const formulario = evento.currentTarget;
    const campos = new FormData(formulario);
    definirSalvando(true); definirErro('');
    try {
      const { tarefa } = await solicitar(editando ? '/tarefas/' + editando.id : '/tarefas', {
        method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: campos.get('titulo'), horario: campos.get('horario') || null,
          observacao: campos.get('observacao'), prioridade: campos.has('prioridade'), data_prevista: campos.get('data_prevista') }),
      });
      if (historico) {
        definirTarefas(anteriores => anteriores.map(item => item.id === tarefa.id ? tarefa : item)
          .filter(item => item.data_prevista >= periodoConsultado.inicio && item.data_prevista <= periodoConsultado.fim));
      } else if (semanal ? dias.includes(tarefa.data_prevista) : tarefa.data_prevista === data) {
        definirTarefas(anteriores => editando ? anteriores.map(item => item.id === tarefa.id ? tarefa : item) : [...anteriores, tarefa]);
      } else {
        definirCarregando(true);
        definirDataSelecionada(tarefa.data_prevista);
      }
      definirAviso(historico ? 'Tarefa atualizada. Se saiu do período ou do filtro, consulte a nova data em Hoje ou Semana.' : editando ? 'Tarefa atualizada. O planejamento foi salvo.' : 'Tarefa criada. A lista mostra a data escolhida.');
      formulario.reset(); definirAberto(false); definirEditando(null);
    } catch (falha) { definirErro(falha.message); }
    finally { definirSalvando(false); }
  }

  async function alternar(tarefa) {
    definirAtualizando(ids => [...ids, tarefa.id]); definirErro('');
    try {
      const dados = await solicitar(`/tarefas/${tarefa.id}/conclusao`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluida: tarefa.situacao !== 'concluida' }),
      });
      definirTarefas(anteriores => anteriores.map(item => item.id === tarefa.id ? dados.tarefa : item));
    } catch (falha) { definirErro(falha.message); }
    finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
  }

  function mudarSemana(quantidade) {
    definirCarregando(true); definirExcluindo(null); definirAviso('');
    definirDataSelecionada(deslocarData(data, quantidade));
  }

  const concluidas = tarefas.filter(tarefa => tarefa.situacao === 'concluida');
  const pendentes = tarefas.filter(tarefa => tarefa.situacao !== 'concluida');
  if (ordem === 'horario') pendentes.sort((a, b) => (a.horario || '99').localeCompare(b.horario || '99') || a.id - b.id);
  const linha = tarefa => (
    <li className={`tarefa ${tarefa.situacao === 'concluida' ? 'concluida' : ''}`} key={tarefa.id}>
      <input type="checkbox" aria-label={`Concluir: ${tarefa.titulo}`} checked={tarefa.situacao === 'concluida'} disabled={salvando || atualizando.includes(tarefa.id)} onChange={() => alternar(tarefa)} />
      <div className="tarefa-conteudo"><span className="tarefa-titulo">{tarefa.titulo}</span>
        {tarefa.observacao && <p className="observacao">{tarefa.observacao}</p>}
        <div className="detalhes">{historico && <span>{({ pendente: "Pendente", concluida: "Concluída", pulada: "Pulada" })[tarefa.situacao]}</span>}<span><Clock size={13} aria-hidden="true" />{tarefa.horario || 'Sem horário'}</span>
          {tarefa.prioridade && <span className="prioridade"><Star size={13} aria-hidden="true" />Prioridade</span>}</div>
      </div>
      <div className="acoes-tarefa">
        <button type="button" disabled={salvando || atualizando.includes(tarefa.id)} aria-label={`Editar: ${tarefa.titulo}`} onClick={() => abrirFormulario(tarefa)}><Pencil size={17} aria-hidden="true" /></button>
        <button type="button" disabled={salvando || atualizando.includes(tarefa.id)} aria-label={`Excluir: ${tarefa.titulo}`} onClick={() => definirExcluindo(tarefa.id)}><Trash2 size={17} aria-hidden="true" /></button>
      </div>
      {excluindo === tarefa.id && <div className="confirmacao-exclusao" role="group" aria-label="Confirmar exclusão">
        <p>Excluir esta tarefa? Esta ação não pode ser desfeita.</p>
        <button type="button" disabled={atualizando.includes(tarefa.id)} onClick={() => definirExcluindo(null)}>Cancelar</button>
        <button type="button" disabled={salvando || atualizando.includes(tarefa.id)} onClick={() => excluir(tarefa)}>{atualizando.includes(tarefa.id) ? 'Excluindo…' : 'Confirmar exclusão'}</button>
      </div>}
    </li>
  );

  return <section aria-label={historico ? "Histórico de tarefas" : semanal ? "Tarefas da semana" : "Tarefas do dia"} aria-busy={carregando}>
    <div className="lista-cabecalho"><h2>{historico ? "Meu histórico" : semanal ? "Minha semana" : "Minha rotina"}</h2>{!historico && <button className="botao-principal" disabled={salvando || carregando || !data} onClick={() => abrirFormulario()} aria-expanded={aberto}><Plus size={17} aria-hidden="true" />Nova tarefa</button>}</div>
    {semanal && dias.length > 0 && <div className="navegacao-semana">
      <button className="botao-secundario" disabled={aberto || carregando || atualizando.length > 0} onClick={() => mudarSemana(-7)}>← Semana anterior</button>
      <p>{formatarData(dias[0])} a {formatarData(dias[6], { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
      <button className="botao-secundario" disabled={aberto || carregando || atualizando.length > 0} onClick={() => mudarSemana(7)}>Próxima semana →</button>
    </div>}
    {historico && periodoConsultado && <>
      <p className="explicacao-historico">Atividades organizadas pela data planejada, incluindo hoje. Consulte até 366 dias por vez.</p>
      <form className="seletor-dia" key={periodoConsultado.inicio + periodoConsultado.fim + tentativa} onSubmit={evento => {
        evento.preventDefault(); const campos = new FormData(evento.currentTarget);
        definirCarregando(true); definirExcluindo(null); definirAviso('');
        definirPeriodo({ inicio: campos.get('inicio'), fim: campos.get('fim') });
      }}>
        <label>De<input type="date" name="inicio" defaultValue={periodoConsultado.inicio} min="1000-01-01" max={hoje} required disabled={aberto || carregando || atualizando.length > 0} /></label>
        <label>Até<input type="date" name="fim" defaultValue={periodoConsultado.fim} min="1000-01-01" max={hoje} required disabled={aberto || carregando || atualizando.length > 0} /></label>
        <button className="botao-secundario" disabled={aberto || carregando || atualizando.length > 0}>Consultar período</button>
        <button type="button" className="botao-secundario" disabled={aberto || carregando || atualizando.length > 0} onClick={() => { definirCarregando(true); definirPeriodo(null); definirTentativa(valor => valor + 1); definirAviso(''); }}>Últimos 30 dias</button>
      </form>
    </>}
    {!historico && <form className="seletor-dia" key={data} onSubmit={evento => {
      evento.preventDefault();
      const dia = new FormData(evento.currentTarget).get('dia');
      definirCarregando(true); definirExcluindo(null); definirAviso(''); definirDataSelecionada(dia); definirTentativa(valor => valor + 1);
    }}><label>{semanal ? "Semana que inclui" : "Ver tarefas de"}<input aria-label="Data da lista" name="dia" type="date" required min="1000-01-01" max="9999-12-31" defaultValue={data} disabled={aberto || salvando || atualizando.length > 0} /></label><button type="submit" className="botao-secundario" disabled={!data || aberto || salvando || atualizando.length > 0}>{semanal ? "Ver semana" : "Ver dia"}</button><button type="button" className="botao-secundario" disabled={aberto || salvando || atualizando.length > 0} onClick={() => { definirCarregando(true); definirDataSelecionada(''); definirTentativa(valor => valor + 1); definirAviso(''); definirExcluindo(null); }}>{semanal ? "Semana atual" : "Voltar para hoje"}</button></form>}
    {aviso && <p className="aviso-tarefa" role="status">{aviso}</p>}
    {erro && <div className="mensagem-erro" role="alert">{erro} <button type="button" onClick={() => definirTentativa(valor => valor + 1)}>Recarregar lista</button></div>}
    <form key={editando?.id ?? `nova-${novaData || data}`} ref={formularioRef} onSubmit={adicionar} className="formulario-tarefa" hidden={!aberto}>
      <fieldset disabled={salvando || carregando}><legend>{editando ? "Editar tarefa" : "Nova tarefa"}</legend>
        <label>O que você quer fazer?<input defaultValue={editando?.titulo ?? ""} name="titulo" required maxLength={200} placeholder="Ex.: ler algumas páginas" /></label>
        <div className="campos-opcionais"><label>Data<input defaultValue={editando?.data_prevista ?? (novaData || data)} name="data_prevista" type="date" required min="1000-01-01" max="9999-12-31" /></label><label>Horário (opcional)<input defaultValue={editando?.horario ?? ""} name="horario" type="time" /></label><label className="campo-prioridade"><input defaultChecked={editando?.prioridade ?? false} name="prioridade" type="checkbox" />Marcar como prioridade</label></div>
        <label>Observação (opcional)<textarea defaultValue={editando?.observacao ?? ""} name="observacao" maxLength={4000} rows={2} /></label>
        <div className="acoes-formulario"><button type="button" className="botao-secundario" onClick={() => { definirAberto(false); definirEditando(null); }}>Cancelar</button><button className="botao-principal" type="submit">{salvando ? 'Salvando…' : 'Salvar tarefa'}</button></div>
      </fieldset>
    </form>
    {carregando ? <p role="status" className="estado-lista">Carregando sua rotina…</p> : data && consultaValida && <>
      {!historico && tarefas.length > 0 && <div className="progresso"><div><span>{concluidas.length} de {tarefas.length} concluídas</span><span>{Math.round(concluidas.length / tarefas.length * 100)}%</span></div><progress aria-label={semanal ? "Progresso da semana" : "Progresso do dia"} value={concluidas.length} max={tarefas.length} /></div>}
      {historico ? <ListaHistorico tarefas={tarefas} situacao={situacao} definirSituacao={definirSituacao} bloqueado={aberto || salvando || atualizando.length > 0} renderizarTarefa={linha} /> : semanal ? <div className="grade-semana">{dias.map(dia => {
        const itens = tarefas.filter(tarefa => tarefa.data_prevista === dia).sort((a, b) => Number(a.situacao === 'concluida') - Number(b.situacao === 'concluida') || (a.horario || '99').localeCompare(b.horario || '99') || a.id - b.id);
        return <section className={dia === hoje ? 'dia-semana dia-atual' : 'dia-semana'} key={dia} aria-label={formatarData(dia, { weekday: 'long', day: 'numeric', month: 'long' })}>
          <header><h3>{formatarData(dia, { weekday: 'short' })} <span>{formatarData(dia)}</span>{dia === hoje && <small>Hoje</small>}</h3>
          <button className="botao-secundario" disabled={salvando || atualizando.length > 0} aria-label={'Adicionar tarefa em ' + formatarData(dia)} onClick={() => abrirFormulario(null, dia)}><Plus size={16} aria-hidden="true" />Tarefa</button></header>
          <p className="resumo-dia">{itens.filter(tarefa => tarefa.situacao === 'concluida').length} de {itens.length} concluídas</p>
          {itens.length ? <ul className="lista-tarefas">{itens.map(linha)}</ul> : <p className="dia-vazio">Sem tarefas. Um pouco de espaço livre.</p>}
        </section>;
      })}</div> : <>
      {pendentes.length > 0 && <><div className="ordenacao"><label>Organizar por <select value={ordem} onChange={evento => definirOrdem(evento.target.value)}><option value="criacao">Ordem de criação</option><option value="horario">Horário</option></select></label></div><ul className="lista-tarefas">{pendentes.map(linha)}</ul></>}
      {tarefas.length === 0 && <div className="initial-state"><ListTodo size={26} aria-hidden="true" /><h2>Um dia com espaço livre</h2><p>Nenhuma tarefa para esta data. Adicione o que fizer sentido para seu dia.</p></div>}
      {tarefas.length > 0 && pendentes.length === 0 && <p className="estado-lista">Tudo concluído nesta data. Aproveite seu tempo!</p>}
      {concluidas.length > 0 && <details className="tarefas-concluidas" open><summary>Concluídas ({concluidas.length})</summary><ul className="lista-tarefas">{concluidas.map(linha)}</ul></details>}
    </>}
    </>}
  </section>;
}
