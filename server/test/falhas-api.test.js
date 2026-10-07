import test from 'node:test';
import assert from 'node:assert/strict';
import { solicitar, definirCsrf } from '../../client/src/api.js';
import { criarAplicacao } from '../src/app.js';
import { once } from 'node:events';

test('cliente: falhas de rede, servidor e JSON nunca são sucesso nem repetem gravações', async t => {
  let chamadas = 0;
  const mockFetch = t.mock.method(globalThis, 'fetch', async () => { chamadas++; throw new TypeError('Falha de rede'); });
  await assert.rejects(solicitar('/tarefas'), /Não foi possível carregar/);
  await assert.rejects(solicitar('/tarefas', { method: 'POST' }), /Recarregue a lista antes de repetir/);
  assert.equal(chamadas, 2, 'Não deve repetir automaticamente uma gravação.');
  for (const corpo of ['<html>Servidor iniciando</html>', '', '{}', 'null', '[]']) {
    mockFetch.mock.mockImplementation(async () => new Response(corpo, { status: 200 }));
    await assert.rejects(solicitar('/tarefas/1', { method: 'DELETE' }), /Não foi possível confirmar/);
  }
  mockFetch.mock.mockImplementation(async () => new Response(JSON.stringify({ erro: 'Detalhe interno do banco' }), { status: 503 }));
  await assert.rejects(solicitar('/tarefas'), erro => !erro.message.includes('Detalhe interno'));
  mockFetch.mock.mockImplementation(async () => new Response(JSON.stringify({ erro: 'Título obrigatório.' }), { status: 400 }));
  await assert.rejects(solicitar('/tarefas', { method: 'POST' }), /Título obrigatório/);
  mockFetch.mock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => { throw new Error('Conexão interrompida ao ler corpo'); } }));
  await assert.rejects(solicitar('/tarefas'), /Não foi possível carregar/);
});

test('cliente: cancelamento, prazo, CSRF e sucesso confirmado', async t => {
  const originalTimeout = AbortSignal.timeout;
  const prazo = t.mock.method(AbortSignal, 'timeout', ms => { assert.equal(ms, 90000); return originalTimeout(5); });
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.headers.get('X-CSRF-Token'), 'token-teste');
    return new Promise((resolve, reject) => {
      const manter = setTimeout(resolve, 1000);
      const falhar = () => { clearTimeout(manter); reject(options.signal.reason); };
      if (options.signal.aborted) falhar(); else options.signal.addEventListener('abort', falhar, { once: true });
    });
  });
  definirCsrf('token-teste');
  await assert.rejects(solicitar('/tarefas', { method: 'post' }), /Não foi possível confirmar/);
  const controle = new AbortController(); controle.abort();
  await assert.rejects(solicitar('/tarefas', { method: 'POST', signal: controle.signal }), /Não foi possível confirmar/);
  prazo.mock.restore();
  globalThis.fetch = async () => new Response(JSON.stringify({ excluida: true }), { status: 200 });
  assert.deepEqual(await solicitar('/tarefas/1', { method: 'DELETE' }), { excluida: true });
  definirCsrf('');
});

test('API: banco indisponível não vira sucesso nem sessão expirada', async t => {
  const banco = { execute: async () => { throw Object.assign(new Error('Credencial e SQL privados'), { code: 'ETIMEDOUT' }); } };
  t.mock.method(console, 'error', () => {});
  const servidor = criarAplicacao({ banco }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  try {
    const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}/api/contas/sessao`, { headers: { Cookie: 'dayvilo_sessao=' + 'a'.repeat(64) } });
    assert.equal(resposta.status, 500);
    assert.equal(resposta.headers.get('set-cookie'), null);
    const dados = await resposta.json();
    assert.equal(dados.usuario, undefined);
    assert.equal(dados.erro.includes('privados'), false);
  } finally { servidor.closeAllConnections(); await new Promise(r => servidor.close(r)); }
});
