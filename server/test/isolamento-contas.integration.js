import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { criarAplicacao } from '../src/app.js';
import { criarPoolBanco } from '../src/db.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';
import { prepararSessaoTeste } from './sessao-fixture.js';

test('isolamento HTTP: duas contas, todas as rotas de tarefas e CSRF cruzado', async () => {
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.MYSQL_HOST), 'Executar somente no MySQL local.');
  const pool = criarPoolBanco(), banco = await pool.getConnection();
  let servidor;
  try {
    await banco.beginTransaction();
    const contas = [];
    const hoje = obterDataHoje('America/Sao_Paulo');
    const ontemDate = new Date(hoje + 'T12:00:00Z'); ontemDate.setUTCDate(ontemDate.getUTCDate() - 1);
    const ontem = ontemDate.toISOString().slice(0, 10);
    for (const nome of ['Isolamento A', 'Isolamento B']) {
      const [u] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', [nome]);
      const headers = await prepararSessaoTeste(banco, u.insertId);
      const ids = [];
      for (const data of [hoje, hoje, ontem]) {
        const [t] = await banco.execute('INSERT INTO tarefas (usuario_id,titulo,data_prevista) VALUES (?,?,?)', [u.insertId, nome, data]); ids.push(t.insertId);
      }
      const serie = randomUUID();
      await banco.execute('INSERT INTO ocorrencias_series (tarefa_id,serie_id) VALUES (?,?),(?,?)', [ids[0], serie, ids[1], serie]);
      await banco.execute('INSERT INTO configuracoes_series (serie_id,usuario_id,tipo,dias,ate) VALUES (?,?,?,?,?)', [serie, u.insertId, 'diaria', 'null', hoje]);
      contas.push({ id: u.insertId, headers, ids, nome });
    }
    servidor = criarAplicacao({ banco }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const chamar = async (headers, rota, metodo = 'GET', body) => {
      const r = await fetch(`http://127.0.0.1:${servidor.address().port}/api${rota}`, { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, dados: await r.json(), cache: r.headers.get('cache-control') };
    };
    const estado = async () => {
      const [tarefas] = await banco.query('SELECT * FROM tarefas WHERE usuario_id IN (?,?) ORDER BY id', contas.map(c => c.id));
      const [series] = await banco.query('SELECT * FROM configuracoes_series WHERE usuario_id IN (?,?) ORDER BY usuario_id', contas.map(c => c.id));
      return JSON.stringify({ tarefas, series });
    };
    const inicial = await estado();
    for (const [dona, outra] of [[contas[0], contas[1]], [contas[1], contas[0]]]) {
      for (const rota of [`/tarefas?data=${hoje}&usuario_id=${outra.id}`, `/tarefas/semana?data=${hoje}&usuario_id=${outra.id}`, `/tarefas/historico?inicio=${ontem}&fim=${hoje}&usuario_id=${outra.id}`, '/tarefas/atrasadas']) {
        const r = await chamar(dona.headers, rota);
        assert.equal(r.status, 200, rota); assert.equal(r.cache, 'no-store');
        assert.ok(r.dados.tarefas.length > 0);
        assert.ok(r.dados.tarefas.every(t => dona.ids.includes(t.id)), rota);
        assert.equal((await chamar({ 'X-Dayvilo': '1' }, rota)).status, 401);
      }
      assert.equal((await chamar(dona.headers, '/perfil')).dados.nome, dona.nome);
      assert.equal((await chamar({}, '/perfil')).status, 401);
      assert.equal((await chamar(dona.headers, `/tarefas/${outra.ids[0]}/serie`)).status, 404);
      assert.equal((await chamar({}, `/tarefas/${outra.ids[0]}/serie`)).status, 401);
      assert.equal((await chamar(dona.headers, `/tarefas/${dona.ids[0]}/serie`)).status, 200);
      const tentativas = [
        [`/tarefas/${outra.ids[0]}`, 'PUT', { titulo: 'Tentativa' }, 404],
        [`/tarefas/${outra.ids[0]}`, 'DELETE', undefined, 404],
        [`/tarefas/${outra.ids[0]}/conclusao`, 'PATCH', { concluida: true }, 404],
        [`/tarefas/${outra.ids[0]}/situacao`, 'PATCH', { situacao: 'pulada' }, 404],
        [`/tarefas/${outra.ids[0]}/agendamento`, 'PATCH', { data_prevista: hoje }, 404],
        [`/tarefas/${outra.ids[0]}/serie`, 'PUT', { titulo: 'Tentativa', ate: hoje }, 404],
        [`/tarefas/${outra.ids[0]}/serie/encerramento`, 'PATCH', {}, 404],
        ['/tarefas/ordem', 'PATCH', { data: hoje, anteriores: [dona.ids[0], outra.ids[0]], ids: [outra.ids[0], dona.ids[0]] }, 409],
        ...['concluir', 'pular', 'excluir'].map(acao => ['/tarefas/selecao', 'PATCH', { data: hoje, acao, tarefas: [dona.ids[0], outra.ids[0]].map(id => ({ id, situacao: 'pendente' })) }, 409]),
        ['/tarefas', 'POST', { titulo: 'Tentativa', data_prevista: hoje, usuario_id: outra.id }, 400],
        ['/tarefas/repetidas', 'POST', { tarefa: { titulo: 'Tentativa', data_prevista: hoje, usuario_id: outra.id }, repeticao: { tipo: 'diaria', ate: hoje } }, 400],
      ];
      for (const [rota, metodo, body, status] of tentativas) {
        assert.equal((await chamar(dona.headers, rota, metodo, body)).status, status, `${metodo} ${rota}`);
        assert.equal((await chamar({ ...dona.headers, 'X-CSRF-Token': outra.headers['X-CSRF-Token'] }, rota, metodo, body)).status, 403);
        assert.equal((await chamar({ 'Content-Type': 'application/json', 'X-Dayvilo': '1' }, rota, metodo, body)).status, 401);
      }
    }
    assert.equal(await estado(), inicial, 'As tentativas recusadas não podem alterar nenhuma das duas contas.');
    const a = contas[0], b = contas[1];
    assert.equal((await chamar(a.headers, `/tarefas/${a.ids[0]}/conclusao`, 'PATCH', { concluida: true })).status, 200);
    const listaB = await chamar(b.headers, `/tarefas?data=${hoje}`);
    assert.ok(listaB.dados.tarefas.every(t => t.situacao === 'pendente'));
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(r => servidor.close(r)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});
