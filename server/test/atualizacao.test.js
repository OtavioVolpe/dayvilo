import test from 'node:test';
import assert from 'node:assert/strict';
import { versaoAplicativo } from '../../client/versao-build.js';
import { solicitar, obterEscritasPendentes } from '../../client/src/api.js';

test('atualização: o identificador no cliente corresponde ao manifesto do mesmo build', () => {
  const plugin = versaoAplicativo();
  const versao = JSON.parse(plugin.config().define.__DAYVILO_VERSAO__);
  let arquivo;
  plugin.generateBundle.call({ emitFile(valor) { arquivo = valor; } });
  assert.equal(arquivo.fileName, 'versao.json');
  assert.equal(JSON.parse(arquivo.source).versao, versao);
  assert.notEqual(versaoAplicativo().config().define.__DAYVILO_VERSAO__, JSON.stringify(versao));
});

test('atualização: aguarda inclusive o corpo da resposta e libera a proteção após falha concorrente', async t => {
  let entregarCorpo;
  const corpo = new Promise(resolve => { entregarCorpo = resolve; });
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/falha')) throw new Error('Offline');
    return { status: 200, ok: true, json: () => corpo };
  });
  const primeira = solicitar('/leitura/1', { method: 'PUT' });
  assert.equal(obterEscritasPendentes(), 1);
  const segunda = solicitar('/falha', { method: 'POST' });
  assert.equal(obterEscritasPendentes(), 2);
  await assert.rejects(segunda, /Não foi possível confirmar/);
  assert.equal(obterEscritasPendentes(), 1);
  entregarCorpo({ salvo: true });
  await primeira;
  assert.equal(obterEscritasPendentes(), 0);
});
