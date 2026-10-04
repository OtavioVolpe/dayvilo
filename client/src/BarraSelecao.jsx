export default function BarraSelecao({ dia, tarefas, ativo, selecionados, bloqueado, iniciar, selecionar, cancelar, executar, confirmar, definirConfirmar }) {
  if (!tarefas.length) return null;
  if (!ativo) return <button type="button" className="botao-secundario" disabled={bloqueado} onClick={iniciar} aria-label={'Selecionar tarefas de ' + dia}>Selecionar</button>;
  const itens = tarefas.filter(t => selecionados.includes(t.id));
  const todas = itens.length === tarefas.length;
  const mesma = situacao => itens.length > 0 && itens.every(t => t.situacao === situacao);
  return <div className="barra-selecao" role="group" aria-label={'Seleção de ' + dia}>
    <strong aria-live="polite">{itens.length} selecionada(s)</strong>
    <button type="button" disabled={bloqueado} onClick={() => selecionar(todas ? [] : tarefas.map(t => t.id))}>{todas ? 'Limpar seleção' : 'Selecionar todas'}</button>
    {mesma('pendente') && <><button type="button" disabled={bloqueado} onClick={() => executar('concluir')}>Concluir</button><button type="button" disabled={bloqueado} onClick={() => executar('pular')}>Pular</button></>}
    {mesma('pulada') && <button type="button" disabled={bloqueado} onClick={() => executar('restaurar')}>Restaurar</button>}
    {mesma('concluida') && <button type="button" disabled={bloqueado} onClick={() => executar('desfazer')}>Desfazer conclusão</button>}
    <button type="button" disabled={bloqueado || !itens.length} onClick={() => definirConfirmar(true)}>Excluir</button>
    <button type="button" disabled={bloqueado} onClick={cancelar}>Cancelar</button>
    {new Set(itens.map(t => t.situacao)).size > 1 && <p>Para mudar a situação, selecione tarefas do mesmo grupo.</p>}
    {confirmar && <div className="confirmacao-lote" role="group" aria-label="Confirmar exclusão da seleção"><p>Excluir estas {itens.length} tarefas? Não pode ser desfeito.</p><button type="button" disabled={bloqueado} onClick={() => definirConfirmar(false)}>Voltar</button><button type="button" disabled={bloqueado || !itens.length} onClick={() => executar('excluir')}>Confirmar exclusão</button></div>}
  </div>;
}
