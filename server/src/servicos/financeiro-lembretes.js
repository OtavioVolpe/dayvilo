import { ErroValidacao } from '../validacoes/tarefas.js';

export function validarLembrete(d) {
  if (d.lembrar_rotina !== undefined && typeof d.lembrar_rotina !== 'boolean') throw new ErroValidacao('Informe se deseja lembrar na Rotina.');
  if (d.lembrar_rotina && d.tipo !== 'despesa') throw new ErroValidacao('Lembretes estão disponíveis para contas a pagar.');
  if (d.horario_lembrete != null && (typeof d.horario_lembrete !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.horario_lembrete))) throw new ErroValidacao('Informe um horário válido.');
}

export async function sincronizarLembrete(c, usuario, id, d = {}) {
  const [[l]] = await c.execute('SELECT * FROM financeiro_lancamentos WHERE usuario_id=? AND id=?', [usuario.id, id]);
  const [[vinculo]] = await c.execute('SELECT f.tarefa_id, t.horario FROM financeiro_lembretes f JOIN tarefas t ON t.id=f.tarefa_id WHERE f.lancamento_id=? AND t.usuario_id=?', [id, usuario.id]);
  const ativo = l.tipo === 'despesa' && (d.lembrar_rotina ?? Boolean(vinculo));
  if (!ativo) {
    if (vinculo) await c.execute('DELETE FROM tarefas WHERE id=? AND usuario_id=?', [vinculo.tarefa_id, usuario.id]);
    return;
  }
  const horario = d.horario_lembrete === undefined ? vinculo?.horario ?? null : d.horario_lembrete;
  const situacao = l.data_pagamento ? 'concluida' : 'pendente';
  if (vinculo) {
    await c.execute("UPDATE tarefas SET titulo=?, ordem=IF(data_prevista=?,ordem,0), data_prevista=?, horario=?, situacao=?, concluida_em=IF(?='concluida',COALESCE(concluida_em,CURRENT_TIMESTAMP),NULL) WHERE id=? AND usuario_id=?", ['Pagar ' + l.descricao, l.data_prevista, l.data_prevista, horario, situacao, situacao, vinculo.tarefa_id, usuario.id]);
  } else {
    const [t] = await c.execute("INSERT INTO tarefas (usuario_id,titulo,data_prevista,horario,situacao,concluida_em) VALUES (?,?,?,?,?,IF(?='concluida',CURRENT_TIMESTAMP,NULL))", [usuario.id, 'Pagar ' + l.descricao, l.data_prevista, horario, situacao, situacao]);
    await c.execute('INSERT INTO financeiro_lembretes (lancamento_id,tarefa_id) VALUES (?,?)', [id, t.insertId]);
  }
}

export async function removerLembretes(c, usuario, ids) {
  for (const id of ids) await c.execute('DELETE t FROM tarefas t JOIN financeiro_lembretes f ON f.tarefa_id=t.id WHERE f.lancamento_id=? AND t.usuario_id=?', [id, usuario.id]);
}
