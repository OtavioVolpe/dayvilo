import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { criarPoolBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { prepararSessaoTeste } from './sessao-fixture.js';

test('água: registros isolados, repetição segura, metas históricas e desfazer apenas o último', async () => {
  const pool = criarPoolBanco(), banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Água']);
    const [v] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Outra conta']);
    const headers = await prepararSessaoTeste(banco, u.insertId), outros = await prepararSessaoTeste(banco, v.insertId);
    servidor = criarAplicacao({ banco }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const url = `http://127.0.0.1:${servidor.address().port}/api/alimentacao/agua`;
    async function chamar(path, method = 'GET', body, h = headers) {
      const r = await fetch(url + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, dados: await r.json() };
    }
    const data = '2026-10-16';
    assert.deepEqual((await chamar('?data=' + data)).dados, { data, total: 0, meta: null, ultimo: null });
    const pedido = { data, ml: 200, chave: randomUUID() };
    const primeiro = await chamar('', 'POST', pedido); assert.equal(primeiro.status, 201); assert.equal(primeiro.dados.total, 200);
    assert.equal((await chamar('', 'POST', pedido)).dados.total, 200);
    assert.equal((await chamar('', 'POST', { ...pedido, ml: 300 })).status, 409);
    const segundo = await chamar('', 'POST', { data, ml: 300, chave: randomUUID() }); assert.equal(segundo.dados.total, 500);
    assert.equal((await chamar('/ultimo', 'DELETE', { data, id: primeiro.dados.ultimo.id })).status, 409);
    assert.equal((await chamar('/ultimo', 'DELETE', { data, id: segundo.dados.ultimo.id }, outros)).status, 409);
    assert.equal((await chamar('?data=' + data, 'GET', undefined, outros)).dados.total, 0);
    assert.equal((await chamar('/ultimo', 'DELETE', { data, id: segundo.dados.ultimo.id })).dados.total, 200);
    assert.equal((await chamar('/meta', 'PUT', { data, ml: 2000 })).dados.meta, 2000);
    await chamar('/meta', 'PUT', { data: '2026-10-17', ml: 2500 });
    assert.equal((await chamar('?data=' + data)).dados.meta, 2000);
    assert.equal((await chamar('?data=2026-10-18')).dados.meta, 2500);
    assert.equal((await chamar('?data=2026-10-15')).dados.meta, null);
    await chamar('/meta', 'PUT', { data: '2026-10-18', ml: null });
    assert.equal((await chamar('?data=2026-10-18')).dados.meta, null);
    assert.equal((await chamar('?data=2026-10-17')).dados.meta, 2500);
    for (const ml of [0, -1, 1.5, '200', 10001]) assert.equal((await chamar('', 'POST', { data, ml, chave: randomUUID() })).status, 400);
    assert.equal((await chamar('?data=2026-02-30')).status, 400);
    assert.equal((await chamar('?data=2026-10-17')).dados.total, 0);
  } finally { if (servidor) { servidor.closeAllConnections(); await new Promise(r => servidor.close(r)); } await banco.rollback(); banco.release(); await pool.end(); }
});
