import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// O mesmo componente público gera o HTML inicial e a interface interativa.
export function apresentacaoEstatica() {
  let config;
  return {
    name: 'dayvilo-apresentacao-estatica', apply: 'build',
    configResolved(resolved) { config = resolved; },
    async closeBundle() {
      const server = await createServer({ configFile: false, root: config.root, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
      try {
        const { default: Apresentacao } = await server.ssrLoadModule('/src/Apresentacao.jsx');
        for (const cadastroAberto of [true, false]) {
          const html = renderToStaticMarkup(createElement(Apresentacao, { cadastroAberto }));
          await writeFile(resolve(config.root, config.build.outDir, `.apresentacao-${cadastroAberto ? 'aberta' : 'fechada'}.html`), html);
        }
      } finally { await server.close(); }
    },
  };
}
