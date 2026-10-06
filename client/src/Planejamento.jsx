import BarraSelecao from './BarraSelecao.jsx';
import NavegacaoDatas from './NavegacaoDatas.jsx';
import FiltroPeriodo from './FiltroPeriodo.jsx';
import AlcaOrdenacao from './AlcaOrdenacao.jsx';
import { compararOrdemManual, compararTarefas } from './ordenacao.js';
import MenuTarefa from './MenuTarefa.jsx';
import { solicitar } from './api.js';
import { useEffect, useRef, useState } from 'react';
import SeloSituacao from './SeloSituacao.jsx';
import ListaHistorico from './ListaHistorico.jsx';
import { deslocarData, formatarData } from './datas.js';
import { Check, Plus, Star, Clock, ListTodo, Pencil, Trash2, SkipForward, CircleCheck, ChevronRight, RotateCcw, CalendarArrowUp, ListRestart, CircleStop } from 'lucide-react';

export default function Planejamento({ semanal = false, historico = false }) {
  const [diaSelecao, definirDiaSelecao] = useState(null);
  const [selecionados, definirSelecionados] = useState([]);
  const [confirmarLote, definirConfirmarLote] = useState(false);
  function cancelarSelecao() { definirDiaSelecao(null); definirSelecionados([]); definirConfirmarLote(false); }
  const [arrasto, definirArrasto] = useState(null);
  const [puladasAbertas, definirPuladasAbertas] = useState({});
  const [tarefaMovida, definirTarefaMovida] = useState(null);
  const cartoesRef = useRef(new Map());
  const [configuracaoSerie, definirConfiguracaoSerie] = useState(null);
  const [fimSerie, definirFimSerie] = useState('');
  const [tipoSerieAntiga, definirTipoSerieAntiga] = useState('');
  const [modoSerie, definirModoSerie] = useState(false);
  const [encerrando, definirEncerrando] = useState(null);
  const [atrasadas, definirAtrasadas] = useState([]);
  const [repeticao, definirRepeticao] = useState('nenhuma');
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
  const [ordem, definirOrdem] = useState('manual');
  const [tentativa, definirTentativa] = useState(0);
  useEffect(() => { cancelarSelecao(); }, [dataSelecionada, tentativa]);

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
        const [dados, anteriores] = await Promise.all([
          solicitar(caminho),
          !historico && !semanal && dia === perfil.data_hoje ? solicitar('/tarefas/atrasadas') : Promise.resolve({ tarefas: [] }),
        ]);
        if (ativo) { definirAtrasadas(anteriores.tarefas); definirConsultaValida(true); if (historico) definirPeriodoConsultado({ inicio: dados.inicio, fim: dados.fim }); definirData(dia); definirDias(dados.dias || []); definirHoje(perfil.data_hoje); definirTarefas(dados.tarefas); }
      } catch (falha) { if (ativo) definirErro(falha.message); }
      finally { if (ativo) definirCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [tentativa, dataSelecionada, semanal, historico, periodo]);

  useEffect(() => {
    if (tarefaMovida === null) return;
    const quadro = requestAnimationFrame(() => {
      const cartao = cartoesRef.current.get(tarefaMovida.id);
      if (!cartao) return;
      (tarefaMovida.ordenacao ? cartao.querySelector('.alca-ordenacao') || cartao : cartao).focus({ preventScroll: true });
      const limites = cartao.getBoundingClientRect();
      if (limites.top < 0 || limites.bottom > window.innerHeight - 90) {
        cartao.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
    });
    return () => cancelAnimationFrame(quadro);
  }, [tarefaMovida]);

  async function abrirFormulario(tarefa = null, dia = data, serie = false) {
    definirConfiguracaoSerie(null); definirFimSerie(''); definirTipoSerieAntiga('');
    if (serie) {
      definirAtualizando(ids => [...ids, tarefa.id]);
      try {
        const configuracao = await solicitar('/tarefas/' + tarefa.id + '/serie');
        definirConfiguracaoSerie(configuracao); definirFimSerie(configuracao.ate);
      } catch (falha) { definirErro(falha.message); return; }
      finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
    }
    definirModoSerie(serie); definirEncerrando(null);
    definirRepeticao('nenhuma');
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
      definirAtrasadas(anteriores => anteriores.filter(item => item.id !== tarefa.id));
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
      const dadosTarefa = { titulo: campos.get('titulo'), horario: campos.get('horario') || null, horario_final: campos.get('horario_final') || null,
        observacao: campos.get('observacao'), prioridade: campos.has('prioridade'), data_prevista: campos.get('data_prevista') };
      if (modoSerie && editando) {
        const { data_prevista, ...dadosSerie } = dadosTarefa;
        if (fimSerie !== configuracaoSerie.ate) {
          dadosSerie.ate = fimSerie;
          if (!configuracaoSerie.tipo && fimSerie > configuracaoSerie.ate) dadosSerie.regra = { tipo: tipoSerieAntiga, ...(tipoSerieAntiga === 'semanal' ? { dias: campos.getAll('dias_serie_antiga').map(Number) } : {}) };
        }
        const resultado = await solicitar('/tarefas/' + editando.id + '/serie', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosSerie),
        });
        definirAviso(resultado.quantidade + ' ocorrência(s) atualizadas; ' + (resultado.criadas || 0) + ' criadas e ' + (resultado.removidas || 0) + ' removidas. Demais tarefas mantidas.');
        definirAberto(false); definirEditando(null); definirModoSerie(false);
        definirCarregando(true); definirTentativa(valor => valor + 1);
        return;
      }
      const repetir = !editando && repeticao !== 'nenhuma';
      const corpo = repetir ? { tarefa: dadosTarefa, repeticao: { tipo: repeticao, ate: campos.get('repetir_ate'),
        ...(repeticao === 'semanal' ? { dias: campos.getAll('dias_semana').map(Number) } : {}) } } : dadosTarefa;
      const { tarefa, quantidade } = await solicitar(editando ? '/tarefas/' + editando.id : repetir ? '/tarefas/repetidas' : '/tarefas', {
        method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
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
      if (repetir) {
        definirAviso(quantidade + ' tarefa(s) criadas.');
        definirCarregando(true); definirTentativa(valor => valor + 1);
      }
      definirCarregando(true); definirTentativa(valor => valor + 1);
      formulario.reset(); definirAberto(false); definirEditando(null); definirRepeticao('nenhuma');
    } catch (falha) { definirErro(falha.message); }
    finally { definirSalvando(false); }
  }

  async function encerrarSerie(tarefa) {
    definirAtualizando(ids => [...ids, tarefa.id]); definirErro('');
    try {
      const resultado = await solicitar('/tarefas/' + tarefa.id + '/serie/encerramento', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      definirAviso(resultado.quantidade ? resultado.quantidade + ' tarefa(s) removidas. Histórico preservado.' : 'Não há ocorrências elegíveis para encerrar a partir dessa data. Demais tarefas mantidas.');
      definirEncerrando(null); definirCarregando(true); definirTentativa(valor => valor + 1);
    } catch (falha) { definirErro(falha.message); }
    finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
  }

  async function alternar(tarefa) {
    definirAtualizando(ids => [...ids, tarefa.id]); definirErro('');
    try {
      const dados = await solicitar(`/tarefas/${tarefa.id}/conclusao`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluida: tarefa.situacao !== 'concluida' }),
      });
      atualizarTarefa(dados.tarefa);
    } catch (falha) { definirErro(falha.message); }
    finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
  }

  function atualizarTarefa(tarefa) {
    const pertence = historico ? tarefa.data_prevista >= periodoConsultado.inicio && tarefa.data_prevista <= periodoConsultado.fim
      : semanal ? dias.includes(tarefa.data_prevista) : tarefa.data_prevista === data;
    definirTarefas(anteriores => {
      const outras = anteriores.filter(item => item.id !== tarefa.id);
      return pertence ? [...outras, tarefa].sort((a,b) => a.ordem - b.ordem || a.id - b.id) : outras;
    });
    definirAtrasadas(anteriores => {
      const outras = anteriores.filter(item => item.id !== tarefa.id);
      return tarefa.situacao === 'pendente' && tarefa.data_prevista && tarefa.data_prevista < hoje
        ? [...outras, tarefa].sort((a,b) => a.data_prevista.localeCompare(b.data_prevista) || a.id - b.id) : outras;
    });
  }

  async function alterarTarefa(tarefa, acao) {
    definirAtualizando(ids => [...ids, tarefa.id]); definirErro('');
    try {
      const reagendar = acao === 'hoje';
      const dados = await solicitar('/tarefas/' + tarefa.id + (reagendar ? '/agendamento' : '/situacao'), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reagendar ? { data_prevista: hoje } : { situacao: acao }),
      });
      atualizarTarefa(dados.tarefa);
      if (acao === 'pulada') {
        definirPuladasAbertas(anteriores => ({ ...anteriores, [dados.tarefa.data_prevista]: true }));
        definirTarefaMovida({ id: dados.tarefa.id });
      } else definirTarefaMovida(null);
      const foraDoDia = !historico && !semanal && dados.tarefa.data_prevista !== data;
      definirAviso(reagendar ? 'Tarefa reagendada para hoje.' : acao === 'pulada'
        ? historico ? 'Tarefa marcada como pulada. Use o filtro Puladas para encontrá-la e restaurar.'
          : foraDoDia ? 'Tarefa de ' + formatarData(dados.tarefa.data_prevista) + ' pulada. Ela continua no Histórico e pode ser restaurada.'
          : 'Tarefa movida para Puladas. Você pode restaurá-la quando quiser.'
        : 'Tarefa voltou para as pendentes.');
    } catch (falha) { definirErro(falha.message); }
    finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
  }

  function escolherData(dia) {
    definirCarregando(true); definirExcluindo(null); definirAviso('');
    definirDataSelecionada(dia); definirTentativa(valor => valor + 1);
  }

  const concluidas = tarefas.filter(tarefa => tarefa.situacao === 'concluida');
  const pendentes = tarefas.filter(tarefa => tarefa.situacao === 'pendente');
  const puladas = tarefas.filter(tarefa => tarefa.situacao === 'pulada');
  const totalAtivas = tarefas.length - puladas.length;
  pendentes.sort(compararTarefas(ordem));
  puladas.sort(compararTarefas(ordem));
  concluidas.sort(compararTarefas(ordem));
  const grupoDoDia = tarefa => tarefas.filter(item => item.situacao === tarefa.situacao && item.data_prevista === tarefa.data_prevista).sort(compararOrdemManual);
  async function mover(tarefa, deslocamento) {
    if (salvando || atualizando.length || aberto) return;
    const lista = grupoDoDia(tarefa); const indice = lista.findIndex(item => item.id === tarefa.id);
    if (!lista[indice + deslocamento]) return;
    const anteriores = lista.map(item => item.id); const ids = [...anteriores];
    ids.splice(indice, 1);
    ids.splice(indice + deslocamento, 0, tarefa.id);
    definirSalvando(true); definirErro(''); definirAviso('');
    try {
      const dados = await solicitar('/tarefas/ordem', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: tarefa.data_prevista, situacao: tarefa.situacao, ids, anteriores }) });
      const ordens = new Map(dados.tarefas.map(item => [item.id, item.ordem]));
      definirTarefas(atuais => atuais.map(item => ordens.has(item.id) ? { ...item, ordem: ordens.get(item.id) } : item));
      definirAviso('Ordem salva. ' + tarefa.titulo + ' está na posição ' + (indice + deslocamento + 1) + ' deste grupo no dia.');
      definirTarefaMovida({ id: tarefa.id, ordenacao: true });
    } catch (falha) { definirErro(falha.message); }
    finally { definirSalvando(false); }
  }
  async function executarLote(acao) {
    if (salvando || carregando || !selecionados.length) return;
    const itens = tarefas.filter(t => t.data_prevista === diaSelecao && selecionados.includes(t.id));
    definirSalvando(true); definirErro('');
    try {
      const resultado = await solicitar('/tarefas/selecao', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: diaSelecao, acao, tarefas: itens.map(({id,situacao}) => ({id,situacao})) }) });
      if (acao === 'pular') definirPuladasAbertas(estado => ({ ...estado, [diaSelecao]: true }));
      definirAviso(resultado.quantidade + ' tarefa(s) ' + ({ concluir: 'concluídas.', pular: 'puladas.', restaurar: 'restauradas.', desfazer: 'voltaram para pendentes.', excluir: 'excluídas.' }[acao]));
      cancelarSelecao(); definirCarregando(true); definirTentativa(valor => valor + 1);
    } catch (falha) { definirErro(falha.message); definirConfirmarLote(false); }
    finally { definirSalvando(false); }
  }
  const barraSelecao = dia => <BarraSelecao compacto={semanal} dia={dia} tarefas={tarefas.filter(t => t.data_prevista === dia)} ativo={diaSelecao === dia} selecionados={selecionados}
    bloqueado={salvando || carregando || aberto || atualizando.length > 0 || (diaSelecao !== null && diaSelecao !== dia)}
    iniciar={() => { definirDiaSelecao(dia); definirSelecionados([]); definirExcluindo(null); definirEncerrando(null); definirConfirmarLote(false); definirPuladasAbertas(estado => ({ ...estado, [dia]: true })); }}
    selecionar={ids => { definirSelecionados(ids); definirConfirmarLote(false); }} cancelar={cancelarSelecao} executar={executarLote} confirmar={confirmarLote} definirConfirmar={definirConfirmarLote} />;
  const linha = (tarefa, atrasada = false) => (
    <li className={`tarefa ${diaSelecao === tarefa.data_prevista && !atrasada ? 'modo-selecao' : ''} ${selecionados.includes(tarefa.id) ? 'tarefa-selecionada' : ''} ${diaSelecao === null && !historico && !atrasada && ordem === 'manual' ? 'tarefa-com-alca' : ''} tarefa-${tarefa.situacao} ${tarefa.situacao === 'concluida' ? 'concluida' : ''} ${arrasto?.origem === tarefa.id ? 'tarefa-arrastando' : ''} ${arrasto?.destino === tarefa.id && arrasto.origem !== tarefa.id ? (arrasto.depois ? 'destino-depois' : 'destino-antes') : ''}`} key={tarefa.id} tabIndex={-1} aria-labelledby={`titulo-tarefa-${tarefa.id} situacao-tarefa-${tarefa.id}`} ref={elemento => { if (elemento) cartoesRef.current.set(tarefa.id, elemento); else cartoesRef.current.delete(tarefa.id); }}>
      {diaSelecao === null && !historico && !atrasada && ordem === 'manual' && <AlcaOrdenacao tarefa={tarefa} lista={grupoDoDia(tarefa)} cartoes={cartoesRef} bloqueado={diaSelecao !== null || aberto || salvando || atualizando.length > 0 || carregando || Boolean(excluindo || encerrando)} mover={mover} indicar={definirArrasto} />}
      {diaSelecao === tarefa.data_prevista && !atrasada ? <button type="button" className="marcador-selecao" aria-label={'Selecionar: ' + tarefa.titulo} aria-pressed={selecionados.includes(tarefa.id)} disabled={salvando || carregando} onClick={() => { definirConfirmarLote(false); definirSelecionados(ids => ids.includes(tarefa.id) ? ids.filter(id => id !== tarefa.id) : [...ids, tarefa.id]); }}>{selecionados.includes(tarefa.id) && <Check size={16} aria-hidden="true" />}</button> : tarefa.situacao !== 'pulada' && <input type="checkbox" aria-label={`${tarefa.situacao === 'concluida' ? 'Desfazer conclusão' : 'Concluir'}: ${tarefa.titulo}`} checked={tarefa.situacao === 'concluida'} disabled={diaSelecao !== null || aberto || salvando || atualizando.includes(tarefa.id)} onChange={() => alternar(tarefa)} />}
      <div className="tarefa-conteudo"><div className="tarefa-cabecalho"><span className="tarefa-titulo" id={`titulo-tarefa-${tarefa.id}`}>{tarefa.titulo}</span></div>
        {tarefa.observacao && <p className="observacao">{tarefa.observacao}</p>}
        <div className="detalhes">{tarefa.serie_id && <span>Repetição</span>}{atrasada === true && <span>Prevista para {formatarData(tarefa.data_prevista, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>}<span><Clock size={13} aria-hidden="true" />{tarefa.horario ? tarefa.horario + (tarefa.horario_final ? ' às ' + tarefa.horario_final + (tarefa.horario_final < tarefa.horario ? ' (dia seguinte)' : '') : '') : 'Sem horário'}</span>
          {tarefa.prioridade && <span className="prioridade"><Star size={13} aria-hidden="true" />Prioridade</span>}</div>
      </div>
      <SeloSituacao situacao={tarefa.situacao} id={`situacao-tarefa-${tarefa.id}`} />
      <div className="acoes-tarefa">
        {diaSelecao === null && <>{tarefa.situacao === 'pendente' && <button type="button" className="editar-desktop" title="Editar esta tarefa" disabled={aberto || salvando || atualizando.includes(tarefa.id)} aria-label={`Editar: ${tarefa.titulo}`} onClick={() => abrirFormulario(tarefa)}><Pencil size={17} aria-hidden="true" /></button>}
        <MenuTarefa titulo={tarefa.titulo} bloqueado={diaSelecao !== null || aberto || salvando || atualizando.includes(tarefa.id)} opcoes={[
          ...(tarefa.situacao === 'pendente' ? [{ texto: 'Editar tarefa', Icone: Pencil, apenasMobile: true, executar: () => abrirFormulario(tarefa) }] : []),
          ...(atrasada === true ? [{ texto: 'Trazer para hoje', Icone: CalendarArrowUp, executar: () => alterarTarefa(tarefa, 'hoje') }] : []),
          ...(tarefa.situacao !== 'concluida' ? [{ texto: tarefa.situacao === 'pulada' ? 'Restaurar tarefa' : 'Pular esta tarefa', Icone: tarefa.situacao === 'pulada' ? RotateCcw : SkipForward, executar: () => alterarTarefa(tarefa, tarefa.situacao === 'pulada' ? 'pendente' : 'pulada') }] : []),
          ...(tarefa.serie_id && tarefa.situacao === 'pendente' ? [
            { texto: 'Editar próximas', Icone: ListRestart, separador: tarefa.situacao !== 'concluida' || atrasada === true, desabilitada: atualizando.length > 0, executar: () => abrirFormulario(tarefa, data, true) },
            { texto: 'Encerrar repetição', Icone: CircleStop, desabilitada: atualizando.length > 0, executar: () => { definirEncerrando(tarefa.id); definirExcluindo(null); } },
          ] : []),
          { texto: 'Excluir tarefa', Icone: Trash2, separador: true, executar: () => definirExcluindo(tarefa.id) },
        ]} /></>}
      </div>
      {encerrando === tarefa.id && <div className="confirmacao-exclusao" role="group" aria-label="Confirmar encerramento">
        <p>Excluir pendentes e puladas futuras desta série a partir de {formatarData(tarefa.data_prevista > hoje ? tarefa.data_prevista : hoje, { day: '2-digit', month: '2-digit', year: 'numeric' })}? Sem possibilidade de restaurar. Concluídas, dias anteriores e puladas de hoje ficam mantidos.</p>
        <button type="button" disabled={diaSelecao !== null || atualizando.length > 0} onClick={() => definirEncerrando(null)}>Cancelar</button>
        <button type="button" disabled={diaSelecao !== null || aberto || salvando || atualizando.length > 0} onClick={() => encerrarSerie(tarefa)}>Confirmar encerramento</button>
      </div>}
      {excluindo === tarefa.id && <div className="confirmacao-exclusao" role="group" aria-label="Confirmar exclusão">
        <p>Excluir só esta tarefa? Não pode ser desfeito.</p>
        <button type="button" disabled={diaSelecao !== null || atualizando.includes(tarefa.id)} onClick={() => definirExcluindo(null)}>Cancelar</button>
        <button type="button" disabled={diaSelecao !== null || aberto || salvando || atualizando.includes(tarefa.id)} onClick={() => excluir(tarefa)}>{atualizando.includes(tarefa.id) ? 'Excluindo…' : 'Confirmar exclusão'}</button>
      </div>}
    </li>
  );

  const grupoPuladas = (itens, dia) => itens.length > 0 && <details className="tarefas-concluidas grupo-puladas" open={Boolean(puladasAbertas[dia])} onToggle={evento => {
    const aberto = evento.currentTarget.open;
    definirPuladasAbertas(anteriores => Boolean(anteriores[dia]) === aberto ? anteriores : { ...anteriores, [dia]: aberto });
  }}>
    <summary><span className="grupo-titulo"><ChevronRight className="grupo-seta" size={17} aria-hidden="true" /><SkipForward size={18} aria-hidden="true" />Puladas<span className="grupo-contagem">{itens.length}</span></span></summary>
    <ul className="lista-tarefas">{itens.map(tarefa => linha(tarefa))}</ul>
  </details>;

  const bloqueado = diaSelecao !== null || aberto || salvando || carregando || atualizando.length > 0;
  const consultarPeriodo = valor => {
    definirCarregando(true); definirExcluindo(null); definirAviso('');
    definirPeriodo(valor); definirTentativa(atual => atual + 1);
  };
  const grupoConcluidas = itens => itens.length > 0 && <details className="tarefas-concluidas grupo-concluidas" open><summary><span className="grupo-titulo"><ChevronRight className="grupo-seta" size={17} aria-hidden="true" /><CircleCheck size={18} aria-hidden="true" />Concluídas<span className="grupo-contagem">{itens.length}</span></span></summary><ul className="lista-tarefas">{itens.map(tarefa => linha(tarefa))}</ul></details>;
  return <section className="planejamento" aria-label={historico ? "Histórico de tarefas" : semanal ? "Tarefas da semana" : "Tarefas do dia"} aria-busy={carregando}>
    <div className="lista-cabecalho"><div><h1>{historico ? "Meu histórico" : semanal ? "Minha semana" : "Minha rotina"}</h1>{!historico && data && <p className="data-planejamento">{semanal ? 'Sua rotina, dia a dia.' : formatarData(data, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}</div>{!historico && <button className="botao-principal" disabled={diaSelecao !== null || salvando || carregando || !data} onClick={() => abrirFormulario()} aria-expanded={aberto}><Plus size={17} aria-hidden="true" />Nova tarefa</button>}</div>
    {historico && periodoConsultado && <FiltroPeriodo hoje={hoje} periodo={periodoConsultado} bloqueado={bloqueado} aoConsultar={consultarPeriodo} />}
    {!historico && <div className="controles-planejamento">
      <NavegacaoDatas data={data} hoje={hoje} dias={dias} semanal={semanal} bloqueado={bloqueado} aoEscolher={escolherData} aoVoltar={() => escolherData('')} />
      {consultaValida && tarefas.length > 0 && <div className="controles-organizacao">
        {!semanal && diaSelecao === null && barraSelecao(data)}
        <label><span className="rotulo-ordenacao">Ordenar </span><select aria-label="Ordenar tarefas" value={ordem} disabled={bloqueado} onChange={evento => definirOrdem(evento.target.value)}><option value="manual">Minha ordem</option><option value="criacao">Criação</option><option value="horario">Horário</option></select></label>
      </div>}
    </div>}
    {aviso && <p className="aviso-tarefa" role="status">{aviso}</p>}
    {erro && <div className="mensagem-erro" role="alert">{erro} <button type="button" onClick={() => definirTentativa(valor => valor + 1)}>Recarregar lista</button></div>}
    <form key={(editando?.id ?? `nova-${novaData || data}`) + String(modoSerie)} ref={formularioRef} onSubmit={adicionar} className="formulario-tarefa" hidden={!aberto}>
      <fieldset disabled={diaSelecao !== null || salvando || carregando}><legend>{modoSerie ? "Editar próximas ocorrências" : editando ? "Editar tarefa" : "Nova tarefa"}</legend>
        <label>O que você quer fazer?<input defaultValue={editando?.titulo ?? ""} name="titulo" required maxLength={200} placeholder="Ex.: ler algumas páginas" /></label>
        {modoSerie && editando && <p className="inicio-alteracoes">Alterações a partir de <strong>{formatarData(editando.data_prevista > hoje ? editando.data_prevista : hoje, { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></p>}
        <div className="campos-opcionais">{!modoSerie && <label>Data<input defaultValue={editando?.data_prevista ?? (novaData || data)} name="data_prevista" type="date" required min="1000-01-01" max="9999-12-31" /></label>}<label>Horário inicial (opcional)<input defaultValue={editando?.horario ?? ""} name="horario" type="time" /></label><label>Horário final (opcional)<input defaultValue={editando?.horario_final ?? ""} name="horario_final" type="time" /></label><label className="campo-prioridade prioridade-horarios"><input defaultChecked={editando?.prioridade ?? false} name="prioridade" type="checkbox" />Marcar como prioridade</label></div>
        <p className="dica-horarios">Fim antes do início indica o dia seguinte.</p>
        {!editando && <div className="configuracao-repeticao">
          <label>Repetir<select value={repeticao} onChange={evento => definirRepeticao(evento.target.value)}><option value="nenhuma">Não repetir</option><option value="diaria">Todos os dias</option><option value="semanal">Dias da semana</option></select></label>
          {repeticao !== 'nenhuma' && <>
            <label>Repetir até<input name="repetir_ate" type="date" required min="1000-01-01" max="9999-12-31" defaultValue={deslocarData(novaData || data, 29)} /></label>
            {repeticao === 'semanal' && <fieldset className="dias-repeticao"><legend>Em quais dias?</legend>{[[1,'Seg'],[2,'Ter'],[3,'Qua'],[4,'Qui'],[5,'Sex'],[6,'Sáb'],[0,'Dom']].map(([dia,nome]) => <label key={dia}><input type="checkbox" name="dias_semana" value={dia} />{nome}</label>)}</fieldset>}
            <p>Repita por até 366 dias. Depois, edite ou encerre as próximas juntas.</p>
          </>}
        </div>}
        {modoSerie && editando && configuracaoSerie && <div className="configuracao-repeticao">
          <label>Data de término da repetição<input name="serie_ate" type="date" value={fimSerie} onChange={evento => definirFimSerie(evento.target.value)} required min="1000-01-01" max="9999-12-31" /></label>
          <p>Prolongar cria novas tarefas. Encurtar exclui pendentes e puladas futuras após o término, sem restauração.</p>
          {!configuracaoSerie.tipo && fimSerie > configuracaoSerie.ate && <>
            <p>Confirme os dias para prolongar esta série antiga.</p>
            <label>Repetir nas novas datas<select required value={tipoSerieAntiga} onChange={evento => definirTipoSerieAntiga(evento.target.value)}><option value="">Selecione</option><option value="diaria">Todos os dias</option><option value="semanal">Dias da semana</option></select></label>
            {tipoSerieAntiga === 'semanal' && <fieldset className="dias-repeticao"><legend>Em quais dias?</legend>{[[1,'Seg'],[2,'Ter'],[3,'Qua'],[4,'Qui'],[5,'Sex'],[6,'Sáb'],[0,'Dom']].map(([dia,nome]) => <label key={dia}><input type="checkbox" name="dias_serie_antiga" value={dia} />{nome}</label>)}</fieldset>}
          </>}
          <p>Atualiza pendentes e puladas futuras a partir de {formatarData(editando.data_prevista > hoje ? editando.data_prevista : hoje, { day: '2-digit', month: '2-digit', year: 'numeric' })}, incluindo edições individuais. Concluídas, passado e puladas de hoje ficam mantidos.</p><label className="campo-prioridade"><input type="checkbox" required />Confirmo as alterações e exclusões indicadas.</label></div>}
        {editando && !modoSerie && <p className="explicacao-historico">Altera só esta tarefa.</p>}
        <label>Observação (opcional)<textarea defaultValue={editando?.observacao ?? ""} name="observacao" maxLength={4000} rows={2} /></label>
        <div className="acoes-formulario"><button type="button" className="botao-secundario" onClick={() => { definirAberto(false); definirEditando(null); }}>Cancelar</button><button className="botao-principal" type="submit">{salvando ? 'Salvando…' : 'Salvar tarefa'}</button></div>
      </fieldset>
    </form>
    {carregando ? <p role="status" className="estado-lista">Carregando sua rotina…</p> : data && consultaValida && <>
      {!historico && tarefas.length > 0 && <div className="progresso"><div><span>{concluidas.length} de {totalAtivas} concluídas · {puladas.length} puladas</span><span>{totalAtivas ? Math.round(concluidas.length / totalAtivas * 100) : 0}%</span></div><progress aria-label={semanal ? "Progresso da semana" : "Progresso do dia"} value={concluidas.length} max={totalAtivas || 1} /></div>}
      {!historico && diaSelecao === null && ordem === 'manual' && tarefas.length > 0 && <p id="ajuda-ordenacao" className="ajuda-ordenacao">Arraste pelos seis pontos ou use ↑ e ↓, dentro do mesmo grupo e dia.</p>}
      {!historico && !semanal && diaSelecao === data && barraSelecao(data)}
      {!historico && !semanal && data === hoje && atrasadas.length > 0 && <section className="tarefas-atrasadas" aria-label="Pendências anteriores">
        <h3>Pendências anteriores ({atrasadas.length})</h3><p>Conclua, reagende ou pule.</p>
        <ul className="lista-tarefas">{atrasadas.map(tarefa => linha(tarefa, true))}</ul>
      </section>}

      {historico ? <ListaHistorico periodo={periodoConsultado} tarefas={tarefas} situacao={situacao} definirSituacao={definirSituacao} bloqueado={diaSelecao !== null || aberto || salvando || atualizando.length > 0} renderizarTarefa={tarefa => linha(tarefa)} /> : semanal ? <div className="grade-semana">{dias.map(dia => {
        const itens = tarefas.filter(tarefa => tarefa.data_prevista === dia).sort((a, b) => Number(a.situacao === 'concluida') - Number(b.situacao === 'concluida') || compararTarefas(ordem)(a, b));
        return <section className={dia === hoje ? 'dia-semana dia-atual' : 'dia-semana'} key={dia} aria-label={formatarData(dia, { weekday: 'long', day: 'numeric', month: 'long' })}>
          <header><h3>{formatarData(dia, { weekday: 'short' })} <span>{formatarData(dia)}</span>{dia === hoje && <small>Hoje</small>}</h3>
          <div className="controles-dia">{diaSelecao !== dia && barraSelecao(dia)}<button className="botao-secundario" disabled={diaSelecao !== null || salvando || atualizando.length > 0} aria-label={'Adicionar tarefa em ' + formatarData(dia)} onClick={() => abrirFormulario(null, dia)}><Plus size={16} aria-hidden="true" />Tarefa</button></div></header>
          {diaSelecao === dia && barraSelecao(dia)}
          <p className="resumo-dia">{itens.filter(tarefa => tarefa.situacao === 'concluida').length} de {itens.filter(tarefa => tarefa.situacao !== "pulada").length} concluídas · {itens.filter(tarefa => tarefa.situacao === "pulada").length} puladas</p>
          {itens.some(tarefa => tarefa.situacao === 'pendente') ? <ul className="lista-tarefas">{itens.filter(tarefa => tarefa.situacao === 'pendente').map(tarefa => linha(tarefa))}</ul> : itens.length === 0 && <p className="dia-vazio">Sem tarefas neste dia.</p>}
          {grupoPuladas(itens.filter(tarefa => tarefa.situacao === 'pulada'), dia)}
          {grupoConcluidas(itens.filter(tarefa => tarefa.situacao === 'concluida'))}
        </section>;
      })}</div> : <>
      {pendentes.length > 0 && <><ul className="lista-tarefas">{pendentes.map(tarefa => linha(tarefa))}</ul></>}
      {tarefas.length === 0 && <div className="initial-state"><ListTodo size={26} aria-hidden="true" /><h2>Um dia com espaço livre</h2><p>Nenhuma tarefa nesta data.</p></div>}
      {tarefas.length > 0 && pendentes.length === 0 && <p className="estado-lista">Nenhuma tarefa pendente nesta data.</p>}
      {grupoPuladas(puladas, data)}
      {grupoConcluidas(concluidas)}
    </>}
    </>}
  </section>;
}
