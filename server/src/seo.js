import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const escapar = valor => valor.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function instalarSeo(app, { pastaInterface, urlAplicacao, cadastroAberto, analyticsId = '' }) {
  if (analyticsId && !/^G-[A-Z0-9]{5,20}$/.test(analyticsId)) throw new Error('ID Analytics inválido.');
  const url = new URL('/', urlAplicacao).href;
  const endereco = escapar(url);
  const imagem = escapar(new URL('/icons/icon-512.png', url).href);
  const template = readFileSync(join(pastaInterface, 'index.html'), 'utf8');
  const apresentacao = template.includes('<!--dayvilo-apresentacao-->')
    ? readFileSync(join(pastaInterface, `.apresentacao-${cadastroAberto ? 'aberta' : 'fechada'}.html`), 'utf8') : '';
  const metadados = `${analyticsId ? `<meta name="dayvilo-analytics" content="${analyticsId}" />` : ''}<link rel="canonical" href="${endereco}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:site_name" content="Dayvilo" />
    <meta property="og:title" content="Dayvilo — organize sua rotina em um só lugar" />
    <meta property="og:description" content="Rotina, casa, treino, finanças, alimentação e leitura. Organize seu dia a dia no celular e no computador." />
    <meta property="og:url" content="${endereco}" />
    <meta property="og:image" content="${imagem}" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:alt" content="Ícone verde do Dayvilo" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Dayvilo — organize sua rotina em um só lugar" />
    <meta name="twitter:description" content="Rotina, casa, treino, finanças, alimentação e leitura em um só lugar." />
    <meta name="twitter:image" content="${imagem}" />`;
  const html = template.replace('<!--dayvilo-seo-->', metadados).replace('<!--dayvilo-apresentacao-->', apresentacao);
  app.get('/', (req, res) => res.set('Cache-Control', 'no-cache').type('html').send(html));
  app.get('/index.html', (req, res) => res.redirect(301, url));
  app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${url}sitemap.xml\n`));
  app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${endereco}</loc></url></urlset>\n`));
}
