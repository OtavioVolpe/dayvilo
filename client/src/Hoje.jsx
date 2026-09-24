import { useEffect, useRef, useState } from 'react';
import { Plus, Star, Clock, ListTodo, Pencil, Trash2 } from 'lucide-react';

async function solicitar(caminho, opcoes) {
  let resposta;
  try { resposta = await fetch(`/api${caminho}`, opcoes); }
  catch { throw new Error('Não foi possível conectar. Verifique a conexão e tente novamente.'); }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível completar a ação.');
  return dados;
}

export default function Hoje() {
  const formularioRef = useRef(null);
  const [editando, definirEditando] = useState(null);
  const [excluindo, definirExcluindo] = useState(null);
  const [tarefas, definirTarefas] = useState([]);
  const [data, definirData] = useState('');
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
    definirErro('');
    (async () => {
      try {
        const perfil = await solicitar('/perfil');
        const dados = await solicitar(`/tarefas?data=${perfil.data_hoje}`);
        if (ativo) { definirData(perfil.data_hoje); definirTarefas(dados.tarefas); }
      } catch (falha) { if (ativo) definirErro(falha.message); }
      finally { if (ativo) definirCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [tentativa]);

  function abrirFormulario(tarefa = null) {
    definirEditando(tarefa); definirAberto(true); definirErro('');
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
      // Consulta a data novamente para respeitar a virada do dia no fuso do perfil.
      const perfil = await solicitar('/perfil');
      if (!editando && perfil.data_hoje !== data) {
        definirTentativa(valor => valor + 1);
        throw new Error('Um novo dia começou. Confira sua lista e salve a tarefa novamente.');
      }
      const { tarefa } = await solicitar(editando ? '/tarefas/' + editando.id : '/tarefas', {
        method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: campos.get('titulo'), horario: campos.get('horario') || null,
          observacao: campos.get('observacao'), prioridade: campos.has('prioridade'), ...(!editando ? { data_prevista: data } : {}) }),
      });
      definirTarefas(anteriores => editando ? anteriores.map(item => item.id === tarefa.id ? tarefa : item) : [...anteriores, tarefa]);
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

  const concluidas = tarefas.filter(tarefa => tarefa.situacao === 'concluida');
  const pendentes = tarefas.filter(tarefa => tarefa.situacao !== 'concluida');
  if (ordem === 'horario') pendentes.sort((a, b) => (a.horario || '99').localeCompare(b.horario || '99') || a.id - b.id);
  const linha = tarefa => (
    <li className={`tarefa ${tarefa.situacao === 'concluida' ? 'concluida' : ''}`} key={tarefa.id}>
      <input type="checkbox" aria-label={`Concluir: ${tarefa.titulo}`} checked={tarefa.situacao === 'concluida'} disabled={salvando || atualizando.includes(tarefa.id)} onChange={() => alternar(tarefa)} />
      <div className="tarefa-conteudo"><span className="tarefa-titulo">{tarefa.titulo}</span>
        {tarefa.observacao && <p className="observacao">{tarefa.observacao}</p>}
        <div className="detalhes"><span><Clock size={13} aria-hidden="true" />{tarefa.horario || 'Sem horário'}</span>
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

  return <section aria-label="Tarefas de hoje" aria-busy={carregando}>
    <div className="lista-cabecalho"><h2>Minha rotina</h2><button className="botao-principal" disabled={salvando || carregando || !data} onClick={() => abrirFormulario()} aria-expanded={aberto}><Plus size={17} aria-hidden="true" />Nova tarefa</button></div>
    {erro && <div className="mensagem-erro" role="alert">{erro} <button type="button" onClick={() => definirTentativa(valor => valor + 1)}>Recarregar lista</button></div>}
    <form key={editando?.id ?? "nova"} ref={formularioRef} onSubmit={adicionar} className="formulario-tarefa" hidden={!aberto}>
      <fieldset disabled={salvando || carregando}><legend>{editando ? "Editar tarefa" : "Nova tarefa para hoje"}</legend>
        <label>O que você quer fazer?<input defaultValue={editando?.titulo ?? ""} name="titulo" required maxLength={200} placeholder="Ex.: ler algumas páginas" /></label>
        <div className="campos-opcionais"><label>Horário (opcional)<input defaultValue={editando?.horario ?? ""} name="horario" type="time" /></label><label className="campo-prioridade"><input defaultChecked={editando?.prioridade ?? false} name="prioridade" type="checkbox" />Marcar como prioridade</label></div>
        <label>Observação (opcional)<textarea defaultValue={editando?.observacao ?? ""} name="observacao" maxLength={4000} rows={2} /></label>
        <div className="acoes-formulario"><button type="button" className="botao-secundario" onClick={() => { definirAberto(false); definirEditando(null); }}>Cancelar</button><button className="botao-principal" type="submit">{salvando ? 'Salvando…' : 'Salvar tarefa'}</button></div>
      </fieldset>
    </form>
    {carregando ? <p role="status" className="estado-lista">Carregando sua rotina…</p> : data && <>
      {tarefas.length > 0 && <div className="progresso"><div><span>{concluidas.length} de {tarefas.length} concluídas</span><span>{Math.round(concluidas.length / tarefas.length * 100)}%</span></div><progress aria-label="Progresso do dia" value={concluidas.length} max={tarefas.length} /></div>}
      {pendentes.length > 0 && <><div className="ordenacao"><label>Organizar por <select value={ordem} onChange={evento => definirOrdem(evento.target.value)}><option value="criacao">Ordem de criação</option><option value="horario">Horário</option></select></label></div><ul className="lista-tarefas">{pendentes.map(linha)}</ul></>}
      {tarefas.length === 0 && <div className="initial-state"><ListTodo size={26} aria-hidden="true" /><h2>Sua rotina começa aqui</h2><p>Adicione sua primeira tarefa. O horário fica por sua conta.</p></div>}
      {tarefas.length > 0 && pendentes.length === 0 && <p className="estado-lista">Tudo concluído por hoje. Aproveite seu tempo!</p>}
      {concluidas.length > 0 && <details className="tarefas-concluidas" open><summary>Concluídas ({concluidas.length})</summary><ul className="lista-tarefas">{concluidas.map(linha)}</ul></details>}
    </>}
  </section>;
}
