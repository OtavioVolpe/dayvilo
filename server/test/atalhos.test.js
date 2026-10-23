import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { criarRotasAtalhos, validarAtalhos } from '../src/rotas/atalhos.js';

test('atalhos preservam ordem, permitem nenhum e rejeitam opções inválidas', () => {
  assert.deepEqual(validarAtalhos({ areas: [] }), []);
  assert.deepEqual(validarAtalhos({ areas: ['Treino', 'Casa'] }), ['Treino', 'Casa']);
  assert.deepEqual(validarAtalhos({ areas: ['Metas', 'Treino'] }), ['Metas', 'Treino']);
  for (const areas of [['Rotina'], ['Mais'], ['Casa', 'Casa'], ['Casa', 'Treino', 'Leitura'], 'Casa', null]) assert.throws(() => validarAtalhos({ areas }));
  assert.throws(() => validarAtalhos({ areas: [], usuario_id: 4 }));
});
test('rotas consultam e salvam somente para o usuário autenticado', async () => {
  const chamadas = [];
  const banco = { execute: async (sql, args) => { chamadas.push({ sql, args }); return sql.startsWith('SELECT') ? [[{ areas: '["Treino"]' }]] : [{}]; } };
  const app = express(); app.use(express.json()); app.use((req, res, next) => { req.usuario = { id: 42 }; next(); }); app.use('/atalhos', criarRotasAtalhos(banco));
  const servidor = app.listen(0, '127.0.0.1'); await new Promise(resolve => servidor.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${servidor.address().port}/atalhos`;
    assert.deepEqual(await (await fetch(url)).json(), { areas: ['Treino'] });
    assert.deepEqual(chamadas[0].args, [42]);
    assert.equal((await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ areas: ['Leitura', 'Casa'] }) })).status, 200);
    assert.deepEqual(chamadas[1].args, [42, '["Leitura","Casa"]', '["Leitura","Casa"]']);
  } finally { await new Promise(resolve => servidor.close(resolve)); }
});
