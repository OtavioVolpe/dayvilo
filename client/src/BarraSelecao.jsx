import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import { ListChecks, Check, SkipForward, RotateCcw, Trash2, X } from 'lucide-react';

export default function BarraSelecao({ dia, tarefas, ativo, selecionados, bloqueado, iniciar, selecionar, cancelar, executar, confirmar, definirConfirmar, compacto = false, erro }) {
  if (!tarefas.length) return null;
  if (!ativo) return <button type="button" className="abrir-selecao" disabled={bloqueado} onClick={iniciar} title="Selecionar tarefas" aria-label={'Selecionar tarefas de ' + dia}><ListChecks size={18} aria-hidden="true" />{!compacto && <span>Selecionar</span>}</button>;
  const itens = tarefas.filter(t => selecionados.includes(t.id));
  const financeiro = itens.some(t => t.financeiro_id);
  const todas = itens.length === tarefas.length;
  const mesma = situacao => itens.length > 0 && itens.every(t => t.situacao === situacao);
  const acao = (nome, Icone, executarAcao, desabilitado = false) => <button type="button" className="acao-selecao" title={nome} aria-label={nome} disabled={bloqueado || desabilitado} onClick={executarAcao}><Icone size={18} aria-hidden="true" /></button>;
  return <div className="barra-selecao" role="group" aria-label={'Seleção de ' + dia}>
    <span className="quantidade-selecao" aria-live="polite">{itens.length} selecionada(s)</span>
    <button type="button" className="selecionar-todas" disabled={bloqueado} onClick={() => selecionar(todas ? [] : tarefas.map(t => t.id))}>{todas ? 'Limpar' : 'Todas'}</button>
    <div className="acoes-selecao">
      {mesma('pendente') && <>{acao('Concluir', Check, () => executar('concluir'), financeiro)}{acao('Pular', SkipForward, () => executar('pular'), financeiro)}</>}
      {mesma('pulada') && acao('Restaurar', RotateCcw, () => executar('restaurar'), financeiro)}
      {mesma('concluida') && acao('Desfazer conclusão', RotateCcw, () => executar('desfazer'), financeiro)}
      {acao('Excluir selecionadas', Trash2, () => definirConfirmar(true), !itens.length)}
      {acao('Sair da seleção', X, cancelar)}
    </div>
    {financeiro && <p>Confirme pagamentos individualmente pelo lembrete. Excluir remove apenas o lembrete, mantendo a conta no Financeiro.</p>}
    {new Set(itens.map(t => t.situacao)).size > 1 && <p>Para mudar a situação, selecione tarefas do mesmo grupo.</p>}
    {confirmar && <ConfirmacaoTreino destrutiva rotulo="Excluir selecionadas" erro={erro} ocupado={bloqueado} cancelar={() => definirConfirmar(false)} confirmar={() => executar('excluir')} mensagem={`Excluir ${itens.length} tarefa(s) de ${dia.split('-').reverse().join('/')}?\n\nSomente as ocorrências selecionadas serão removidas. ${itens.some(t => t.financeiro_id) ? 'As contas no Financeiro serão mantidas. ' : ''}${itens.some(t => t.treino_sessao_id) ? 'Os registros dos treinos selecionados também serão excluídos. ' : ''}${itens.some(t => t.refeicao_id) ? 'As refeições selecionadas e suas anotações também serão excluídas da Alimentação. ' : ''}Não pode ser desfeito.`} />}
  </div>;
}
