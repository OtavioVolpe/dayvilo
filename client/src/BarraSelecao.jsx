import { ListChecks, Check, SkipForward, RotateCcw, Trash2, X } from 'lucide-react';

export default function BarraSelecao({ dia, tarefas, ativo, selecionados, bloqueado, iniciar, selecionar, cancelar, executar, confirmar, definirConfirmar, compacto = false }) {
  if (!tarefas.length) return null;
  if (!ativo) return <button type="button" className="abrir-selecao" disabled={bloqueado} onClick={iniciar} title="Selecionar tarefas" aria-label={'Selecionar tarefas de ' + dia}><ListChecks size={18} aria-hidden="true" />{!compacto && <span>Selecionar</span>}</button>;
  const itens = tarefas.filter(t => selecionados.includes(t.id));
  const todas = itens.length === tarefas.length;
  const mesma = situacao => itens.length > 0 && itens.every(t => t.situacao === situacao);
  const acao = (nome, Icone, executarAcao, desabilitado = false) => <button type="button" className="acao-selecao" title={nome} aria-label={nome} disabled={bloqueado || desabilitado} onClick={executarAcao}><Icone size={18} aria-hidden="true" /></button>;
  return <div className="barra-selecao" role="group" aria-label={'Seleção de ' + dia}>
    <span className="quantidade-selecao" aria-live="polite">{itens.length} selecionada(s)</span>
    <button type="button" className="selecionar-todas" disabled={bloqueado} onClick={() => selecionar(todas ? [] : tarefas.map(t => t.id))}>{todas ? 'Limpar' : 'Todas'}</button>
    <div className="acoes-selecao">
      {mesma('pendente') && <>{acao('Concluir', Check, () => executar('concluir'))}{acao('Pular', SkipForward, () => executar('pular'))}</>}
      {mesma('pulada') && acao('Restaurar', RotateCcw, () => executar('restaurar'))}
      {mesma('concluida') && acao('Desfazer conclusão', RotateCcw, () => executar('desfazer'))}
      {acao('Excluir selecionadas', Trash2, () => definirConfirmar(true), !itens.length)}
      {acao('Sair da seleção', X, cancelar)}
    </div>
    {new Set(itens.map(t => t.situacao)).size > 1 && <p>Para mudar a situação, selecione tarefas do mesmo grupo.</p>}
    {confirmar && <div className="confirmacao-lote" role="group" aria-label="Confirmar exclusão da seleção"><p>Excluir estas {itens.length} tarefas? Não pode ser desfeito.</p><div><button type="button" disabled={bloqueado} onClick={() => definirConfirmar(false)}>Voltar</button><button type="button" disabled={bloqueado || !itens.length} onClick={() => executar('excluir')}>Confirmar exclusão</button></div></div>}
  </div>;
}
