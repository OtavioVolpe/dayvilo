import { transacionar } from './autenticacao.js';
import { validarObjeto, validarData, ErroValidacao } from '../validacoes/tarefas.js';
import { ErroAplicacao } from '../erros/aplicacao.js';
import { criarRepositorioTarefas } from '../repositorios/tarefas.js';

export async function alterarSelecao(banco, usuarioId, entrada) {
  validarObjeto(entrada, ['data', 'acao', 'tarefas']);
  const data = validarData(entrada.data);
  const regras = { concluir: ['pendente','concluida'], pular: ['pendente','pulada'], restaurar: ['pulada','pendente'], desfazer: ['concluida','pendente'], excluir: null };
  if (!Object.hasOwn(regras, entrada.acao)) throw new ErroValidacao('Ação inválida.');
  const itens = entrada.tarefas;
  if (!Array.isArray(itens) || !itens.length || itens.length > 1000) throw new ErroValidacao('Selecione de 1 a 1000 tarefas.');
  for (const item of itens) {
    validarObjeto(item, ['id','situacao']);
    if (!Number.isSafeInteger(item.id) || item.id < 1 || !['pendente','pulada','concluida'].includes(item.situacao)) throw new ErroValidacao('Seleção inválida.');
  }
  if (new Set(itens.map(item => item.id)).size !== itens.length) throw new ErroValidacao('Seleção duplicada.');
  return transacionar(banco, async conexao => {
    const repo = criarRepositorioTarefas(conexao);
    const ordenadas = [...itens].sort((a,b) => a.id-b.id);
    for (const item of ordenadas) {
      const atual = await repo.buscar(usuarioId, item.id, true);
      if (!atual || atual.data_prevista !== data || atual.situacao !== item.situacao) throw new ErroAplicacao(409, 'A lista mudou. Recarregue e selecione novamente.');
      if (regras[entrada.acao] && atual.situacao !== regras[entrada.acao][0]) throw new ErroAplicacao(409, 'Selecione tarefas com a mesma situação para esta ação.');
    }
    for (const item of ordenadas) {
      if (entrada.acao === 'excluir') await repo.excluir(usuarioId,item.id);
      else await repo.definirSituacao(usuarioId,item.id,regras[entrada.acao][1]);
    }
    return { quantidade: itens.length };
  });
}
