import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarAplicacao } from '../src/app.js';
import { criarPoolBanco } from '../src/db.js';

test('MySQL: criar, listar, concluir e isolar tarefas por usuário', async () => {
  const pool = criarPoolBanco();
  const banco = await pool.getConnection();
  let servidor;
  try {
    await banco.beginTransaction();
    const [perfil] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Teste transacional']);
    const [outro] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Outro teste']);
    servidor = criarAplicacao({ banco, usuario: { id: perfil.insertId, nome: 'Teste', fuso_horario: 'America/Sao_Paulo' } }).listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const endereco = `http://127.0.0.1:${servidor.address().port}/api`;
    const chamar = async (rota, method = 'GET', body) => {
      const resposta = await fetch(endereco + rota, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: resposta.status, dados: await resposta.json() };
    };
    const criada = await chamar('/tarefas', 'POST', { titulo: ' Ler ', data_prevista: '2026-09-24', horario: '09:30', prioridade: true });
    assert.equal(criada.status, 201);
    assert.equal(criada.dados.tarefa.titulo, 'Ler');
    assert.equal(criada.dados.tarefa.horario, '09:30');
    const id = criada.dados.tarefa.id;
    assert.equal((await chamar('/tarefas?data=2026-09-24')).dados.tarefas.length, 1);
    assert.equal((await chamar(`/tarefas/${id}/conclusao`, 'PATCH', { concluida: true })).dados.tarefa.situacao, 'concluida');
    assert.equal((await chamar(`/tarefas/${id}/conclusao`, 'PATCH', { concluida: false })).dados.tarefa.situacao, 'pendente');
    const [alheia] = await banco.execute('INSERT INTO tarefas (usuario_id,titulo,data_prevista) VALUES (?,?,?)', [outro.insertId, 'Privada', '2026-09-24']);
    assert.equal((await chamar('/tarefas?data=2026-09-24')).dados.tarefas.length, 1);
    assert.equal((await chamar(`/tarefas/${alheia.insertId}/conclusao`, 'PATCH', { concluida: true })).status, 404);
    assert.equal((await chamar('/tarefas', 'POST', { titulo: 'Teste', usuario_id: outro.insertId })).status, 400);
    assert.equal((await chamar('/tarefas?data=2026-02-30')).status, 400);
    const alteracao = { titulo: 'Leitura revisada', horario: '18:15', prioridade: false, observacao: 'Capítulo 2' };
    await chamar('/tarefas/' + id + '/conclusao', 'PATCH', { concluida: true });
    const editada = await chamar('/tarefas/' + id, 'PUT', alteracao);
    assert.equal(editada.status, 200);
    assert.equal(editada.dados.tarefa.situacao, 'concluida');
    assert.equal(editada.dados.tarefa.data_prevista, '2026-09-24');
    assert.equal(editada.dados.tarefa.horario, '18:15');
    assert.equal(editada.dados.tarefa.prioridade, false);
    assert.equal((await chamar('/tarefas?data=2026-09-24')).dados.tarefas[0].titulo, 'Leitura revisada');
    assert.equal((await chamar('/tarefas/' + id, 'PUT', { titulo: ' ' })).status, 400);
    assert.equal((await chamar('/tarefas/' + alheia.insertId, 'PUT', alteracao)).status, 404);
    assert.equal((await chamar('/tarefas/' + alheia.insertId, 'DELETE')).status, 404);
    const reagendada = await chamar('/tarefas/' + id, 'PUT', { ...alteracao, data_prevista: '2026-09-25' });
    assert.equal(reagendada.status, 200);
    assert.equal(reagendada.dados.tarefa.situacao, 'concluida');
    assert.equal((await chamar('/tarefas?data=2026-09-24')).dados.tarefas.length, 0);
    assert.equal((await chamar('/tarefas?data=2026-09-25')).dados.tarefas[0].id, id);
    assert.equal((await chamar('/tarefas/' + id, 'PUT', { ...alteracao, data_prevista: '2026-02-30' })).status, 400);
    assert.equal((await chamar('/tarefas/' + id, 'PUT', { ...alteracao, data_prevista: null })).status, 400);
    assert.equal((await chamar('/tarefas?data=2026-09-25')).dados.tarefas[0].data_prevista, '2026-09-25');
    assert.equal((await chamar('/tarefas/' + id, 'DELETE')).status, 200);
    assert.equal((await chamar('/tarefas?data=2026-09-24')).dados.tarefas.length, 0);
    assert.equal((await chamar('/tarefas/' + id, 'DELETE')).status, 404);
    assert.equal((await chamar('/tarefas/' + id, 'PUT', alteracao)).status, 404);
    assert.equal((await fetch(endereco + '/tarefas', { headers: { Origin: 'https://example.com' } })).status, 403);
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});
