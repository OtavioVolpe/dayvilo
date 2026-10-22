import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { apresentacaoEstatica } from './seo-build.js';

export default defineConfig({
  plugins: [react(), apresentacaoEstatica(), {
    name: 'politica-publica-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/privacidade') req.url = '/privacidade.html';
        next();
      });
    },
  }],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
});
