import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { instalarSeo } from '../src/seo.js';

test('SEO entrega conteúdo público sem sessão, canonical estável e sitemap apenas da apresentação', async t => {
  const pasta = await mkdtemp(join(tmpdir(), 'dayvilo-seo-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  await writeFile(join(pasta, 'index.html'), '<html><head><!--dayvilo-seo--></head><body><div id="root"><!--dayvilo-apresentacao--></div></body></html>');
  await writeFile(join(pasta, '.apresentacao-aberta.html'), '<main><h1>Rotina</h1><a href="#criar-conta">Criar minha conta</a></main>');
  await writeFile(join(pasta, '.apresentacao-fechada.html'), '<main><h1>Rotina</h1><p>Cadastros fechados</p></main>');
  for (const cadastroAberto of [true, false]) {
    const app = express();
    instalarSeo(app, { pastaInterface: pasta, urlAplicacao: 'https://dayvilo.example/', cadastroAberto });
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const resposta = await fetch(base + '/?utm_source=instagram', { headers: { Cookie: 'dayvilo_sessao=nao-consultar' } });
      const html = await resposta.text();
      assert.equal(resposta.status, 200);
      assert.match(html, /<main><h1>Rotina<\/h1>/);
      assert.match(html, /rel="canonical" href="https:\/\/dayvilo.example\/"/);
      assert.match(html, /property="og:image" content="https:\/\/dayvilo.example\/icons\/icon-512.png"/);
      assert.doesNotMatch(html, /utm_source|nao-consultar|<!--dayvilo/);
      assert.match(html, cadastroAberto ? /Criar minha conta/ : /Cadastros fechados/);
      const sitemap = await fetch(base + '/sitemap.xml');
      assert.match(sitemap.headers.get('content-type'), /application\/xml/);
      assert.equal((await sitemap.text()).match(/<loc>/g).length, 1);
      const robots = await (await fetch(base + '/robots.txt')).text();
      assert.match(robots, /Disallow: \/api\//);
      assert.match(robots, /Sitemap: https:\/\/dayvilo.example\/sitemap.xml/);
      const redirecionamento = await fetch(base + '/index.html', { redirect: 'manual' });
      assert.equal(redirecionamento.status, 301);
      assert.equal(redirecionamento.headers.get('location'), 'https://dayvilo.example/');
      assert.equal((await fetch(base + '/pagina-inexistente')).status, 404);
    } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
  }
});

test('política pública funciona sem sessão ou scripts e integra o sitemap', async t => {
  const pasta = await mkdtemp(join(tmpdir(), 'dayvilo-politica-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  await writeFile(join(pasta, 'index.html'), '<html><head><!--dayvilo-seo--></head></html>');
  const fonte = await readFile(new URL('../../client/public/privacidade.html', import.meta.url), 'utf8');
  await writeFile(join(pasta, 'privacidade.html'), fonte);
  const app = express();
  instalarSeo(app, { pastaInterface: pasta, urlAplicacao: 'https://dayvilo.example/', cadastroAberto: true, analyticsId: 'G-TESTE123' });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const resposta = await fetch(base + '/privacidade');
    const html = await resposta.text();
    assert.equal(resposta.status, 200);
    assert.match(resposta.headers.get('content-type'), /text\/html/);
    assert.match(html, /rel="canonical" href="https:\/\/dayvilo.example\/privacidade"/);
    assert.match(html, /Otávio Volpe Leal/);
    assert.match(html, /mailto:dayviloapp@gmail.com/);
    assert.match(html, /href="\/#preferencias-privacidade"/);
    assert.doesNotMatch(html, /<script|G-TESTE123|<!--dayvilo/);
    for (const [, ancora] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${ancora}"`));
    const sitemap = await (await fetch(base + '/sitemap.xml')).text();
    assert.equal(sitemap.match(/<loc>/g).length, 2);
    assert.match(sitemap, /<loc>https:\/\/dayvilo.example\/privacidade<\/loc>/);
    const redirecionamento = await fetch(base + '/privacidade.html', { redirect: 'manual' });
    assert.equal(redirecionamento.status, 301);
    assert.equal(redirecionamento.headers.get('location'), 'https://dayvilo.example/privacidade');
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});
