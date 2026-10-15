import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoTarefas } from '../src/servicos/tarefas.js';

test('Observação: atualização isolada, conflito, propriedade e tarefa concluída', async () => {
  if (!['127.0.0.1', 'localhost'].includes(process.env.MYSQL_HOST)) throw new Error('Use MySQL local para este teste.');
  const pool = criarPoolBanco(), c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [a] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Teste de observação']);
    const u = { id: a.insertId }, s = criarServicoTarefas(c);
    const { tarefa: t } = await s.criar(u, { titulo: 'Tarefa', observacao: 'Original', data_prevista: '2030-01-01', horario: '08:30', prioridade: true });
    await assert.rejects(s.observacao({ id: 0 }, { anterior: 'Original', observacao: 'Outra conta' }, t.id), { status: 404 });
    await s.concluir(u, { concluida: true }, t.id);
    const { tarefa: nova } = await s.observacao(u, { anterior: 'Original', observacao: 'Nova\nSegunda linha' }, t.id);
    assert.equal(nova.observacao, 'Nova\nSegunda linha');
    assert.equal(nova.situacao, 'concluida'); assert.equal(nova.titulo, t.titulo);
    assert.equal(nova.horario, t.horario); assert.equal(nova.data_prevista, t.data_prevista); assert.equal(nova.prioridade, true);
    await assert.rejects(s.observacao(u, { anterior: 'Original', observacao: 'Desatualizada' }, t.id), { status: 409 });
    await assert.rejects(s.observacao(u, { anterior: nova.observacao, observacao: 'a'.repeat(4001) }, t.id), { status: 400 });
    const { tarefa: limpa } = await s.observacao(u, { anterior: nova.observacao, observacao: '' }, t.id);
    assert.equal(limpa.observacao, null);
    await c.execute('INSERT INTO refeicoes(tarefa_id) VALUES (?)', [t.id]);
    await assert.rejects(s.observacao(u, { anterior: '', observacao: 'Alimentos' }, t.id), { status: 400 });
  } finally { await c.rollback(); c.release(); await pool.end(); }
});
