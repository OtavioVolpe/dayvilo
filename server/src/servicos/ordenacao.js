import { ErroConta, transacionar } from './autenticacao.js';
import { validarObjeto, validarData, ErroValidacao } from '../validacoes/tarefas.js';

export async function ordenarTarefas(banco, usuarioId, dados) {
  validarObjeto(dados, ['data', 'situacao', 'ids', 'anteriores']);
  const data = validarData(dados.data);
  const situacao = dados.situacao ?? 'pendente';
  if (!['pendente', 'pulada', 'concluida'].includes(situacao)) throw new ErroValidacao('Situação inválida.');
  for (const ids of [dados.ids, dados.anteriores]) {
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 1000 || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) throw new ErroValidacao('Informe uma sequência válida de tarefas (até 1000).');
  }
  if (dados.ids.length !== dados.anteriores.length || dados.ids.some(id => !dados.anteriores.includes(id))) throw new ErroValidacao('As sequências devem conter as mesmas tarefas.');
  return transacionar(banco, async conexao => {
    const [atuais] = await conexao.execute("SELECT id FROM tarefas WHERE usuario_id = ? AND data_prevista = ? AND situacao = ? ORDER BY ordem = 0, ordem, id FOR UPDATE", [usuarioId, data, situacao]);
    if (atuais.length !== dados.anteriores.length || atuais.some((tarefa, indice) => tarefa.id !== dados.anteriores[indice])) throw new ErroConta(409, 'A lista mudou. Atualize a página antes de organizar novamente.');
    for (const [indice, id] of dados.ids.entries()) await conexao.execute('UPDATE tarefas SET ordem = ? WHERE usuario_id = ? AND id = ?', [indice + 1, usuarioId, id]);
    return { tarefas: dados.ids.map((id, indice) => ({ id, ordem: indice + 1 })) };
  });
}
