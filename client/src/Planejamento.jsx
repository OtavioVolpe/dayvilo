import CampoHorario from './CampoHorario.jsx';
import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import './casa.css';
import ObservacaoTarefa from './ObservacaoTarefa.jsx';
import RepeticaoTarefa from './RepeticaoTarefa.jsx';
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
import RotinaVazia from './RotinaVazia.jsx';
import CasaVazia from './CasaVazia.jsx';
import { deslocarData, formatarData } from './datas.js';
import { Check, Plus, Star, Clock, ListTodo, Pencil, Trash2, SkipForward, CircleCheck, ChevronRight, RotateCcw, CalendarArrowUp, RefreshCw, House, Dumbbell, ArrowUpRight, Utensils, NotebookText, BookOpen, Wallet } from 'lucide-react';

export default function Planejamento({ semanal = false, historico = false, casa = false, aoAbrirTreino, aoAbrirRefeicao, aoAbrirLivro, aoAbrirFinanceiro }) {
  const [observacaoAberta, definirObservacaoAberta] = useState(null);
  const [repeticaoAberta, definirRepeticaoAberta] = useState(null);
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
  const [rascunhoInicial, definirRascunhoInicial] = useState({ titulo: '', abertura: 0 });
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
  const [diaCasa, definirDiaCasa] = useState('');
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
          !historico && (casa || (!semanal && dia === perfil.data_hoje)) ? solicitar('/tarefas/atrasadas') : Promise.resolve({ tarefas: [] }),
        ]);
        if (ativo) { definirAtrasadas(casa ? anteriores.tarefas.filter(t => t.area === 'casa' && !dados.dias.includes(t.data_prevista)) : anteriores.tarefas); definirConsultaValida(true); if (historico) definirPeriodoConsultado({ inicio: dados.inicio, fim: dados.fim }); definirData(dia); definirDias(dados.dias || []); definirHoje(perfil.data_hoje); definirTarefas(casa ? dados.tarefas.filter(t => t.area === 'casa') : dados.tarefas); if (casa) definirDiaCasa(d => dados.dias.includes(d) ? d : dados.dias.includes(perfil.data_hoje) ? perfil.data_hoje : dados.dias[0]); }
      } catch (falha) { if (ativo) definirErro(falha.message); }
      finally { if (ativo) definirCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [tentativa, dataSelecionada, semanal, historico, periodo, casa]);

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

  async function abrirFormulario(tarefa = null, dia = data, serie = false, tituloInicial = '', sugestaoCasa = null) {
    if (tarefa?.financeiro_id) { aoAbrirFinanceiro?.(tarefa.financeiro_id, 'editar'); return; }
    if (tarefa?.refeicao_id) { aoAbrirRefeicao?.(tarefa); return; }
    definirConfiguracaoSerie(null); definirFimSerie(''); definirTipoSerieAntiga('');
    if (serie) {
      definirAtualizando(ids => [...ids, tarefa.id]);
      try {
        const configuracao = await solicitar('/tarefas/' + tarefa.id + '/serie');
        definirConfiguracaoSerie(configuracao); definirFimSerie(configuracao.ate);
      } catch (falha) { definirAviso(''); definirErro(falha.message); return; }
      finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
    }
    definirModoSerie(serie);
    definirRascunhoInicial(anterior => ({ titulo: tarefa ? '' : tituloInicial, ambiente: sugestaoCasa?.ambiente || '', abertura: anterior.abertura + 1 }));
    definirRepeticao(casa && !tarefa && !sugestaoCasa ? 'semanal' : 'nenhuma');
    definirNovaData(dia);
    definirEditando(tarefa); definirAberto(true); definirErro(''); definirAviso('');
    requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
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
    } catch (falha) { definirAviso(''); definirErro(falha.message); }
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
        observacao: campos.get('observacao'), prioridade: campos.has('prioridade'), data_prevista: campos.get('data_prevista'),
        ...((editando?.area === 'casa' || (!editando && casa)) ? { area: 'casa', ambiente: campos.get('ambiente') } : {}) };
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
        ...(['semanal', 'quinzenal'].includes(repeticao) ? { dias: campos.getAll('dias_semana').map(Number) } : {}) } } : dadosTarefa;
      const { tarefa, quantidade } = await solicitar(editando ? '/tarefas/' + editando.id : repetir ? '/tarefas/repetidas' : '/tarefas', {
        method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (casa) definirDiaCasa(tarefa.data_prevista);
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
    } catch (falha) { definirAviso(''); definirErro(falha.message); }
    finally { definirSalvando(false); }
  }

  async function encerrarSerie(tarefa) {
    definirAtualizando(ids => [...ids, tarefa.id]); definirErro('');
    try {
      const resultado = await solicitar('/tarefas/' + tarefa.id + '/serie/encerramento', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      definirAviso(resultado.quantidade ? resultado.quantidade + ' tarefa(s) removidas. Histórico preservado.' : 'Não há ocorrências elegíveis para encerrar a partir dessa data. Demais tarefas mantidas.');
      definirRepeticaoAberta(null);
      definirCarregando(true); definirTentativa(valor => valor + 1);
    } catch (falha) { definirAviso(''); throw falha; }
    finally { definirAtualizando(ids => ids.filter(id => id !== tarefa.id)); }
  }

  async function alternar(tarefa) {
    if (tarefa.financeiro_id) { aoAbrirFinanceiro?.(tarefa.financeiro_id, 'pagar'); return; }
    definirAtualizando(ids => [...ids, tarefa.id]); definirErro('');
    try {
      const dados = await solicitar(`/tarefas/${tarefa.id}/conclusao`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluida: tarefa.situacao !== 'concluida' }),
      });
      atualizarTarefa(dados.tarefa);
    } catch (falha) { definirAviso(''); definirErro(falha.message); }
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
      return tarefa.situacao === 'pendente' && tarefa.data_prevista && tarefa.data_prevista < hoje && (!casa || !dias.includes(tarefa.data_prevista))
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
    } catch (falha) { definirAviso(''); definirErro(falha.message); }
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
      const dados = await solicitar('/tarefas/ordem', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: tarefa.data_prevista, situacao: tarefa.situacao, ids, anteriores, ...(casa ? { area: 'casa' } : {}) }) });
      const ordens = new Map(dados.tarefas.map(item => [item.id, item.ordem]));
      definirTarefas(atuais => atuais.map(item => ordens.has(item.id) ? { ...item, ordem: ordens.get(item.id) } : item));
      definirAviso('Ordem salva. ' + tarefa.titulo + ' está na posição ' + (indice + deslocamento + 1) + ' deste grupo no dia.');
      definirTarefaMovida({ id: tarefa.id, ordenacao: true });
    } catch (falha) { definirAviso(''); definirErro(falha.message); }
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
    } catch (falha) { definirAviso(''); definirErro(falha.message); definirConfirmarLote(false); }
    finally { definirSalvando(false); }
  }
  const barraSelecao = dia => <BarraSelecao compacto={semanal} dia={dia} tarefas={tarefas.filter(t => t.data_prevista === dia)} ativo={diaSelecao === dia} selecionados={selecionados}
    bloqueado={salvando || carregando || aberto || atualizando.length > 0 || (diaSelecao !== null && diaSelecao !== dia)}
    iniciar={() => { definirDiaSelecao(dia); definirSelecionados([]); definirExcluindo(null); definirConfirmarLote(false); definirPuladasAbertas(estado => ({ ...estado, [dia]: true })); }}
    selecionar={ids => { definirSelecionados(ids); definirConfirmarLote(false); }} cancelar={cancelarSelecao} executar={executarLote} erro={erro} confirmar={confirmarLote} definirConfirmar={definirConfirmarLote} />;
  const linha = (tarefa, atrasada = false) => (
    <li className={`tarefa ${diaSelecao === tarefa.data_prevista && !atrasada ? 'modo-selecao' : ''} ${selecionados.includes(tarefa.id) ? 'tarefa-selecionada' : ''} ${diaSelecao === null && !historico && !atrasada && ordem === 'manual' ? 'tarefa-com-alca' : ''} tarefa-${tarefa.situacao} ${tarefa.situacao === 'concluida' ? 'concluida' : ''} ${arrasto?.origem === tarefa.id ? 'tarefa-arrastando' : ''} ${arrasto?.destino === tarefa.id && arrasto.origem !== tarefa.id ? (arrasto.depois ? 'destino-depois' : 'destino-antes') : ''}`} key={tarefa.id} tabIndex={-1} aria-labelledby={`titulo-tarefa-${tarefa.id} situacao-tarefa-${tarefa.id}`} ref={elemento => { if (elemento) cartoesRef.current.set(tarefa.id, elemento); else cartoesRef.current.delete(tarefa.id); }}>
      {!casa && diaSelecao === null && !historico && !atrasada && ordem === 'manual' && <AlcaOrdenacao tarefa={tarefa} lista={grupoDoDia(tarefa)} cartoes={cartoesRef} bloqueado={diaSelecao !== null || aberto || salvando || atualizando.length > 0 || carregando || Boolean(excluindo || repeticaoAberta)} mover={mover} indicar={definirArrasto} />}
      {diaSelecao === tarefa.data_prevista && !atrasada ? <button type="button" className="marcador-selecao" aria-label={'Selecionar: ' + tarefa.titulo} aria-pressed={selecionados.includes(tarefa.id)} disabled={salvando || carregando} onClick={() => { definirConfirmarLote(false); definirSelecionados(ids => ids.includes(tarefa.id) ? ids.filter(id => id !== tarefa.id) : [...ids, tarefa.id]); }}>{selecionados.includes(tarefa.id) && <Check size={16} aria-hidden="true" />}</button> : tarefa.situacao !== 'pulada' && <input type="checkbox" aria-label={`${tarefa.financeiro_id ? (tarefa.situacao === 'concluida' ? 'Abrir pagamento' : 'Confirmar pagamento') : tarefa.situacao === 'concluida' ? 'Desfazer conclusão' : 'Concluir'}: ${tarefa.titulo}`} checked={tarefa.situacao === 'concluida'} disabled={diaSelecao !== null || aberto || salvando || atualizando.includes(tarefa.id)} onChange={() => alternar(tarefa)} />}
      <div className="tarefa-conteudo"><div className="tarefa-cabecalho"><span className="tarefa-titulo" id={`titulo-tarefa-${tarefa.id}`}>{tarefa.treino_sessao_id ? tarefa.titulo.replace(/^Treino — /, '') : tarefa.titulo}</span></div>
        <div className="detalhes">{tarefa.financeiro_id && <span className="selo-treino"><Wallet size={13} aria-hidden="true" />Financeiro</span>}{Boolean(tarefa.leitura) && <span className="selo-treino"><BookOpen size={13} aria-hidden="true" />Leitura</span>}{tarefa.refeicao_id && <span className="selo-alimentacao"><Utensils size={13} aria-hidden="true" />Alimentação</span>}{tarefa.treino_sessao_id && <span className="selo-treino"><Dumbbell size={13} aria-hidden="true" />Treino</span>}{tarefa.area === 'casa' && <span className="selo-casa"><House size={13} aria-hidden="true" />Casa</span>}{tarefa.serie_id && <span><RefreshCw size={13} style={{ flexShrink: 0 }} aria-hidden="true" />Repetição</span>}{atrasada === true && <span>Prevista para {formatarData(tarefa.data_prevista, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>}<span><Clock size={13} aria-hidden="true" />{tarefa.horario ? tarefa.horario + (tarefa.horario_final ? ' às ' + tarefa.horario_final + (tarefa.horario_final < tarefa.horario ? ' (dia seguinte)' : '') : '') : 'Sem horário'}</span>
          {tarefa.prioridade && <span className="prioridade"><Star size={13} aria-hidden="true" />Prioridade</span>}</div>
      </div>
      <SeloSituacao situacao={tarefa.situacao} id={`situacao-tarefa-${tarefa.id}`} />
      <div className={`acoes-tarefa${(tarefa.treino_sessao_id || tarefa.refeicao_id || tarefa.livro_id || tarefa.financeiro_id) ? ' acoes-com-treino' : ''}${!tarefa.refeicao_id && tarefa.observacao?.trim() ? ' acoes-com-observacao' : ''}`}>
        {diaSelecao === null && !tarefa.refeicao_id && tarefa.observacao?.trim() && <button type="button" title="Ver observação" aria-label={`Ver observação: ${tarefa.titulo}`} aria-haspopup="dialog" disabled={bloqueado} onClick={() => definirObservacaoAberta(tarefa)}><NotebookText size={18} aria-hidden="true" /></button>}
        {diaSelecao === null && tarefa.financeiro_id && <button type="button" className="abrir-treino-rotina" aria-label={`Abrir lançamento: ${tarefa.titulo}`} title="Abrir lançamento" disabled={bloqueado} onClick={() => aoAbrirFinanceiro?.(tarefa.financeiro_id, 'editar')}><ArrowUpRight size={18} aria-hidden="true" /></button>}
        {diaSelecao === null && tarefa.livro_id && <button type="button" className="abrir-treino-rotina" aria-label={`Abrir livro: ${tarefa.titulo}`} title="Abrir livro" disabled={bloqueado} onClick={() => aoAbrirLivro?.(tarefa.livro_id)}><ArrowUpRight size={18} aria-hidden="true" /></button>}
        {diaSelecao === null && tarefa.refeicao_id && <button type="button" className="abrir-treino-rotina" aria-label={`Abrir refeição: ${tarefa.titulo}`} title="Abrir refeição" disabled={bloqueado} onClick={() => aoAbrirRefeicao?.(tarefa)}><ArrowUpRight size={18} aria-hidden="true" /></button>}
        {diaSelecao === null && tarefa.treino_sessao_id && <button type="button" className="abrir-treino-rotina" aria-label={`Abrir treino: ${tarefa.titulo}`} title="Abrir treino" disabled={bloqueado} onClick={() => aoAbrirTreino?.(tarefa.treino_sessao_id)}><ArrowUpRight size={18} aria-hidden="true" /></button>}
      {casa && diaSelecao === null && !historico && !atrasada && ordem === 'manual' && <AlcaOrdenacao tarefa={tarefa} lista={grupoDoDia(tarefa)} cartoes={cartoesRef} bloqueado={diaSelecao !== null || aberto || salvando || atualizando.length > 0 || carregando || Boolean(excluindo || repeticaoAberta)} mover={mover} indicar={definirArrasto} />}
        {diaSelecao === null && <>
        <MenuTarefa titulo={tarefa.titulo} bloqueado={diaSelecao !== null || aberto || salvando || atualizando.includes(tarefa.id)} opcoes={[
          ...(tarefa.situacao === 'pendente' ? [{ texto: tarefa.financeiro_id ? 'Editar lançamento' : 'Editar tarefa', Icone: Pencil, executar: () => abrirFormulario(tarefa) }] : []),
          ...(atrasada === true && !tarefa.financeiro_id ? [{ texto: 'Trazer para hoje', Icone: CalendarArrowUp, executar: () => alterarTarefa(tarefa, 'hoje') }] : []),
          ...(!tarefa.financeiro_id && tarefa.situacao !== 'concluida' ? [{ texto: tarefa.situacao === 'pulada' ? 'Restaurar tarefa' : 'Pular esta tarefa', Icone: tarefa.situacao === 'pulada' ? RotateCcw : SkipForward, executar: () => alterarTarefa(tarefa, tarefa.situacao === 'pulada' ? 'pendente' : 'pulada') }] : []),
          ...(tarefa.serie_id ? [{ texto: 'Ver repetição', Icone: RefreshCw, executar: () => definirRepeticaoAberta(tarefa) }] : []),
          { texto: tarefa.financeiro_id ? 'Remover lembrete' : 'Excluir tarefa', Icone: Trash2, separador: true, executar: () => { definirErro(''); definirExcluindo(tarefa.id); } },
        ]} /></>}
      </div>
      {excluindo === tarefa.id && <ConfirmacaoTreino destrutiva rotulo={tarefa.financeiro_id ? 'Remover lembrete' : 'Excluir tarefa'} ocupado={atualizando.includes(tarefa.id)} erro={erro} cancelar={() => definirExcluindo(null)} confirmar={() => excluir(tarefa)} mensagem={`“${tarefa.titulo}” · ${formatarData(tarefa.data_prevista)}.\n\n${tarefa.financeiro_id ? 'Remove apenas o lembrete da Rotina. A conta e seu pagamento permanecem no Financeiro.' : tarefa.refeicao_id ? 'A refeição e sua anotação também serão excluídas da Alimentação. Não pode ser desfeito.' : tarefa.treino_sessao_id ? 'Este treino e seus registros de execução serão excluídos. A ficha e os demais treinos permanecem. Não pode ser desfeito.' : (tarefa.serie_id ? 'As outras ocorrências da repetição serão mantidas. ' : '') + 'Esta ação não pode ser desfeita.'}`} />}
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
  const orientarCasa = casa && !historico && consultaValida && !carregando && !aberto && tarefas.length === 0 && diaCasa >= hoje && dias.includes(diaCasa);
  const consultarPeriodo = valor => {
    definirCarregando(true); definirExcluindo(null); definirAviso('');
    definirPeriodo(valor); definirTentativa(atual => atual + 1);
  };
  const grupoConcluidas = itens => itens.length > 0 && <details className="tarefas-concluidas grupo-concluidas" open><summary><span className="grupo-titulo"><ChevronRight className="grupo-seta" size={17} aria-hidden="true" /><CircleCheck size={18} aria-hidden="true" />Concluídas<span className="grupo-contagem">{itens.length}</span></span></summary><ul className="lista-tarefas">{itens.map(tarefa => linha(tarefa))}</ul></details>;
  return <section className={`planejamento ${casa ? 'planejamento-casa' : ''}`} aria-label={casa ? "Tarefas de casa" : historico ? "Histórico de tarefas" : semanal ? "Tarefas da semana" : "Tarefas do dia"} aria-busy={carregando}>
    {repeticaoAberta && <RepeticaoTarefa tarefa={repeticaoAberta} hoje={hoje} fechar={() => definirRepeticaoAberta(null)}
      bloqueado={salvando || carregando || atualizando.length > 0}
      editar={() => { const tarefa = repeticaoAberta; definirRepeticaoAberta(null); abrirFormulario(tarefa, data, true); }}
      encerrar={() => encerrarSerie(repeticaoAberta)} />}
    {observacaoAberta && <ObservacaoTarefa tarefa={observacaoAberta} fechar={() => definirObservacaoAberta(null)} aoSalvar={tarefa => {
      definirObservacaoAberta(tarefa);
      definirTarefas(lista => lista.map(t => t.id === tarefa.id ? tarefa : t));
      definirAtrasadas(lista => lista.map(t => t.id === tarefa.id ? tarefa : t));
    }} />}
    <div className="lista-cabecalho"><div><h1>{casa ? "Minha casa" : historico ? "Meu histórico" : semanal ? "Minha semana" : "Minha rotina"}</h1>{!historico && data && <p className="data-planejamento">{casa ? 'Planeje aqui. Acompanhe também na Rotina.' : semanal ? 'Sua rotina, dia a dia.' : formatarData(data, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}</div>{!historico && <button className="botao-principal" disabled={diaSelecao !== null || salvando || carregando || !data} onClick={() => abrirFormulario(null, casa ? diaCasa : data)} aria-expanded={aberto}><Plus size={17} aria-hidden="true" />Nova tarefa</button>}</div>
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
    <form key={(editando?.id ?? `nova-${novaData || data}`) + String(modoSerie) + '-' + rascunhoInicial.abertura} ref={formularioRef} onSubmit={adicionar} className="formulario-tarefa" hidden={!aberto}>
      <fieldset disabled={diaSelecao !== null || salvando || carregando}><legend>{modoSerie ? "Editar próximas ocorrências" : editando ? "Editar tarefa" : "Nova tarefa"}</legend>
        {!editando && rascunhoInicial.titulo && <p className="rotina-sugestao-nota">{casa ? 'Preenchemos uma sugestão de título e ambiente.' : 'Preenchemos só uma sugestão de título.'} Revise a data e os detalhes; a tarefa só será criada quando você salvar.</p>}
        <label>O que você quer fazer?<input defaultValue={editando?.titulo ?? rascunhoInicial.titulo} name="titulo" required maxLength={200} placeholder={casa ? "Ex.: limpar o banheiro" : "Ex.: ler algumas páginas"} /></label>
        {(editando?.area === 'casa' || (!editando && casa)) && <label>Ambiente<input name="ambiente" defaultValue={editando?.ambiente ?? rascunhoInicial.ambiente ?? ''} required maxLength={60} list="ambientes-casa" placeholder="Ex.: banheiro" /><datalist id="ambientes-casa">{['Quarto', 'Banheiro', 'Cozinha', 'Sala', 'Lavanderia', 'Área externa', 'Casa toda'].map(ambiente => <option key={ambiente} value={ambiente} />)}</datalist></label>}
        {modoSerie && editando && <p className="inicio-alteracoes">Alterações a partir de <strong>{formatarData(editando.data_prevista > hoje ? editando.data_prevista : hoje, { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></p>}
        <div className="campos-opcionais">{!modoSerie && <label>Data<input defaultValue={editando?.data_prevista ?? (novaData || data)} name="data_prevista" type="date" required min="1000-01-01" max="9999-12-31" /></label>}<label>Horário inicial (opcional)<CampoHorario defaultValue={editando?.horario ?? ""} name="horario"  /></label><label>Horário final (opcional)<CampoHorario defaultValue={editando?.horario_final ?? ""} name="horario_final"  /></label><label className="campo-prioridade prioridade-horarios"><input defaultChecked={editando?.prioridade ?? false} name="prioridade" type="checkbox" />Marcar como prioridade</label></div>
        <p className="dica-horarios">Fim antes do início indica o dia seguinte.</p>
        {!editando && <div className="configuracao-repeticao">
          <label>Repetir<select value={repeticao} onChange={evento => definirRepeticao(evento.target.value)}><option value="nenhuma">Não repetir</option><option value="diaria">Todos os dias</option><option value="semanal">Toda semana</option><option value="quinzenal">A cada duas semanas</option><option value="mensal">Todo mês</option></select></label>
          {repeticao !== 'nenhuma' && <>
            <label>Repetir até<input name="repetir_ate" type="date" required min="1000-01-01" max="9999-12-31" defaultValue={deslocarData(novaData || data, casa ? 89 : 29)} /></label>
            {['semanal', 'quinzenal'].includes(repeticao) && <fieldset className="dias-repeticao"><legend>Em quais dias?</legend>{[[1,'Seg'],[2,'Ter'],[3,'Qua'],[4,'Qui'],[5,'Sex'],[6,'Sáb'],[0,'Dom']].map(([dia,nome]) => <label key={dia}><input type="checkbox" name="dias_semana" value={dia} defaultChecked={casa && dia === new Date((novaData || data) + 'T12:00:00').getDay()} />{nome}</label>)}</fieldset>}
            {repeticao === 'mensal' && <p>No dia da data inicial; em meses curtos, no último dia.</p>}{repeticao === 'quinzenal' && <p>Uma semana sim, outra não, a partir da semana inicial.</p>}<p>Repita por até 366 dias. Depois, edite ou encerre as próximas juntas.</p>
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
      {!historico && diaSelecao === null && ordem === 'manual' && tarefas.length > 0 && <p id="ajuda-ordenacao" className="ajuda-ordenacao">Arraste as tarefas para mudar a ordem.</p>}
      {!historico && !semanal && diaSelecao === data && barraSelecao(data)}
      {!historico && ((casa && dias.includes(hoje)) || (!semanal && data === hoje)) && atrasadas.length > 0 && <section className="tarefas-atrasadas" aria-label="Pendências anteriores">
        <h3>Pendências anteriores ({atrasadas.length})</h3><p>Conclua, reagende ou pule.</p>
        <ul className="lista-tarefas">{atrasadas.map(tarefa => linha(tarefa, true))}</ul>
      </section>}

      {casa && !orientarCasa && <nav className="dias-casa" aria-label="Dia da limpeza">{dias.map(dia => <button key={dia} type="button" aria-pressed={diaCasa === dia} disabled={bloqueado} onClick={() => definirDiaCasa(dia)}><span>{formatarData(dia, { weekday: 'short' })}</span><strong>{formatarData(dia, { day: '2-digit' })}</strong></button>)}</nav>}
      {orientarCasa ? <CasaVazia dias={dias} dia={diaCasa} hoje={hoje} bloqueado={bloqueado} aoEscolherDia={definirDiaCasa} aoCriar={sugestao => abrirFormulario(null, diaCasa, false, sugestao.titulo, sugestao)} /> : historico ? <ListaHistorico periodo={periodoConsultado} tarefas={tarefas} situacao={situacao} definirSituacao={definirSituacao} bloqueado={diaSelecao !== null || aberto || salvando || atualizando.length > 0} renderizarTarefa={tarefa => linha(tarefa)} /> : semanal ? <div className="grade-semana">{dias.map(dia => {
        const itens = tarefas.filter(tarefa => tarefa.data_prevista === dia).sort((a, b) => Number(a.situacao === 'concluida') - Number(b.situacao === 'concluida') || compararTarefas(ordem)(a, b));
        return <section className={`dia-semana ${dia === hoje ? 'dia-atual' : ''} ${casa && dia !== diaCasa ? 'dia-casa-oculto' : ''}`} key={dia} aria-label={formatarData(dia, { weekday: 'long', day: 'numeric', month: 'long' })}>
          <header><h3>{formatarData(dia, { weekday: 'short' })} <span>{formatarData(dia)}</span>{dia === hoje && <small>Hoje</small>}</h3>
          <div className="controles-dia">{!casa && diaSelecao !== dia && barraSelecao(dia)}<button className="botao-secundario" disabled={diaSelecao !== null || salvando || atualizando.length > 0} aria-label={'Adicionar tarefa em ' + formatarData(dia)} onClick={() => abrirFormulario(null, dia)}><Plus size={16} aria-hidden="true" />Tarefa</button></div></header>
          {diaSelecao === dia && barraSelecao(dia)}
          <div className="resumo-controles-dia"><p className="resumo-dia">{itens.filter(tarefa => tarefa.situacao === 'concluida').length} de {itens.filter(tarefa => tarefa.situacao !== "pulada").length} concluídas · {itens.filter(tarefa => tarefa.situacao === "pulada").length} puladas</p>{casa && diaSelecao !== dia && barraSelecao(dia)}</div>
          {itens.some(tarefa => tarefa.situacao === 'pendente') ? <ul className="lista-tarefas">{itens.filter(tarefa => tarefa.situacao === 'pendente').map(tarefa => linha(tarefa))}</ul> : itens.length === 0 && <p className="dia-vazio">Sem tarefas neste dia.</p>}
          {grupoPuladas(itens.filter(tarefa => tarefa.situacao === 'pulada'), dia)}
          {grupoConcluidas(itens.filter(tarefa => tarefa.situacao === 'concluida'))}
        </section>;
      })}</div> : <>
      {pendentes.length > 0 && <><ul className="lista-tarefas">{pendentes.map(tarefa => linha(tarefa))}</ul></>}
      {tarefas.length === 0 && !aberto && (!casa && data >= hoje ? <RotinaVazia data={data} hoje={hoje} bloqueado={bloqueado} aoCriar={titulo => abrirFormulario(null, data, false, titulo)} /> : <div className="initial-state"><ListTodo size={26} aria-hidden="true" /><h2>Um dia com espaço livre</h2><p>Nenhuma tarefa nesta data.</p></div>)}
      {tarefas.length > 0 && pendentes.length === 0 && <p className="estado-lista">Nenhuma tarefa pendente nesta data.</p>}
      {grupoPuladas(puladas, data)}
      {grupoConcluidas(concluidas)}
    </>}
    </>}
  </section>;
}
