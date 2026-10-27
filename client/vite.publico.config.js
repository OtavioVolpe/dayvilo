import { defineConfig, createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const site = 'https://dayvilo.com.br/';
const app = 'https://app.dayvilo.com.br/';
const analyticsId = process.env.PUBLIC_ANALYTICS_ID || '';
if (analyticsId && !/^G-[A-Z0-9]{5,20}$/.test(analyticsId)) throw new Error('PUBLIC_ANALYTICS_ID inválido.');
const cadastro = process.env.PUBLIC_CADASTRO_ABERTO === 'true';
const preview = process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== (process.env.PUBLIC_PRODUCTION_BRANCH || 'main');
const id = preview ? '' : analyticsId;

export default defineConfig({
  publicDir: false,
  define: { __DAYVILO_APP__: JSON.stringify(app), __DAYVILO_CADASTRO__: JSON.stringify(cadastro) },
  build: { outDir: 'dist-publico' },
  plugins: [react(), {
    name: 'dayvilo-site-publico',
    transformIndexHtml: { order: 'pre', handler(html) {
      return html.replace('/src/main.jsx', '/src/site-publico.jsx')
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
        .replace('<!--dayvilo-seo-->', `<link rel="canonical" href="${site}" />
        ${preview ? '<meta name="robots" content="noindex" />' : ''}
        ${id ? `<meta name="dayvilo-analytics" content="${id}" />` : ''}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content="Dayvilo" />
        <meta property="og:title" content="Dayvilo — seu dia, no seu ritmo" />
        <meta property="og:description" content="Rotina, casa, treino, finanças, alimentação e leitura em um só lugar." />
        <meta property="og:url" content="${site}" />
        <meta property="og:image" content="${site}icons/icon-512.png" />
        <meta name="twitter:card" content="summary" />`);
    } },
    async closeBundle() {
      const out = resolve('dist-publico');
      const ssr = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
      try {
        const { default: Site } = await ssr.ssrLoadModule('/src/SitePublico.jsx');
        const html = await readFile(resolve(out, 'index.html'), 'utf8');
        await writeFile(resolve(out, 'index.html'), html.replace('<!--dayvilo-apresentacao-->', renderToStaticMarkup(createElement(Site, { urlApp: app, cadastroAberto: cadastro }))));
      } finally { await ssr.close(); }
      // Lista explícita: nenhum bundle privado, manifesto instalável ou credencial.
      for (const nome of ['favicon.svg', 'icons', 'politica-privacidade.css']) await cp(resolve('public', nome), resolve(out, nome), { recursive: true });
      await mkdir(resolve(out, 'privacidade'), { recursive: true });
      const politica = (await readFile(resolve('public/privacidade.html'), 'utf8')).replace('<!--dayvilo-politica-canonical-->', `<link rel="canonical" href="${site}privacidade" />`);
      await writeFile(resolve(out, 'privacidade/index.html'), politica);
      await writeFile(resolve(out, 'robots.txt'), `User-agent: *\n${preview ? 'Disallow: /' : 'Allow: /\nDisallow: /api/'}\nSitemap: ${site}sitemap.xml\n`);
      await writeFile(resolve(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}</loc></url><url><loc>${site}privacidade</loc></url></urlset>\n`);
      await writeFile(resolve(out, '404.html'), '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Página não encontrada</title><h1>Página não encontrada</h1><a href="/">Voltar ao Dayvilo</a></html>');
      await writeFile(resolve(out, '_redirects'), '/index.html / 301\n/privacidade.html /privacidade 301\n');
      await writeFile(resolve(out, '_headers'), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.google-analytics.com https://*.analytics.google.com; font-src 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
`);
    },
  }],
});
