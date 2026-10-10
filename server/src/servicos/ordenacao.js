import { ErroConta, transacionar } from './autenticacao.js';
import { validarObjeto, validarData, ErroValidacao } from '../validacoes/tarefas.js';

export async function ordenarTarefas(banco, usuarioId, dados) {
  validarObjeto(dados, ['data', 'situacao', 'ids', 'anteriores', 'area']);
  if (dados.area !== undefined && dados.area !== 'casa') throw new ErroValidacao('Área inválida.');
  const data = validarData(dados.data);
  const situacao = dados.situacao ?? 'pendente';
  if (!['pendente', 'pulada', 'concluida'].includes(situacao)) throw new ErroValidacao('Situação inválida.');
  for (const ids of [dados.ids, dados.anteriores]) {
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 1000 || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) throw new ErroValidacao('Informe uma sequência válida de tarefas (até 1000).');
  }
  if (dados.ids.length !== dados.anteriores.length || dados.ids.some(id => !dados.anteriores.includes(id))) throw new ErroValidacao('As sequências devem conter as mesmas tarefas.');
  return transacionar(banco, async conexao => {
    const [todas] = await conexao.execute("SELECT id, area FROM tarefas WHERE usuario_id = ? AND data_prevista = ? AND situacao = ? ORDER BY ordem = 0, ordem, id FOR UPDATE", [usuarioId, data, situacao]);
    const atuais = dados.area ? todas.filter(tarefa => tarefa.area === dados.area) : todas;
    if (atuais.length !== dados.anteriores.length || atuais.some((tarefa, indice) => tarefa.id !== dados.anteriores[indice])) throw new ErroConta(409, 'A lista mudou. Atualize a página antes de organizar novamente.');
    let proximo = 0;
    const ids = todas.map(tarefa => !dados.area || tarefa.area === dados.area ? dados.ids[proximo++] : tarefa.id);
    for (const [indice, id] of ids.entries()) await conexao.execute('UPDATE tarefas SET ordem = ? WHERE usuario_id = ? AND id = ?', [indice + 1, usuarioId, id]);
    return { tarefas: ids.map((id, indice) => ({ id, ordem: indice + 1 })) };
  });
}
