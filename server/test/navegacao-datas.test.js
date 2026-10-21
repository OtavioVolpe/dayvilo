import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('seletor renderiza a transição diária para semanal sem derrubar a tela', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../../client/', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: NavegacaoDatas } = await server.ssrLoadModule('/src/NavegacaoDatas.jsx');
    const renderizar = props => renderToStaticMarkup(createElement(NavegacaoDatas, { data: '2026-10-21', hoje: '2026-10-21', ...props }));
    for (const bloqueado of [false, true]) {
      const transicao = renderizar({ dias: ['2026-10-21'], semanal: true, bloqueado });
      assert.match(transicao, /21 de out/);
      assert.doesNotMatch(transicao, /Invalid|undefined/);
    }
    assert.doesNotThrow(() => renderizar({ dias: [], semanal: true }));
    assert.doesNotThrow(() => renderizar({ semanal: true }));
    assert.match(renderizar({ dias: ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'], semanal: true }), /19\/10.*25\/10/);
    assert.match(renderizar({ dias: ['2026-10-21'], semanal: false }), /21 de out/);
  } finally { await server.close(); }
});
