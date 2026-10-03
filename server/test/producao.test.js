import { request } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { lerConfiguracao } from '../src/configuracao/ambiente.js';
import { configurarBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { criarControladorContas } from '../src/controladores/contas.js';
import { criarLimitador } from '../src/middlewares/limitar-tentativas.js';

// O cliente HTTP permite controlar Host na simulação do proxy local.
function chamar(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request(url, { method, headers }, res => {
      const partes = [];
      res.on('data', parte => partes.push(parte));
      res.on('end', () => resolve(new Response(Buffer.concat(partes), { status: res.statusCode, headers: Object.fromEntries(Object.entries(res.headers).map(([k,v]) => [k, Array.isArray(v) ? v.join(', ') : v])) })));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(body);
  });
}

const ambienteProducao = { NODE_ENV: 'production', URL_APLICACAO: 'https://dayvilo.example/', EMAIL_MODO: 'resend', PROXY_SALTOS: '1' };
const bancoAmbiente = { MYSQL_HOST: 'mysql.example', MYSQL_USER: 'teste', MYSQL_PASSWORD: 'somente-fixture', MYSQL_DATABASE: 'teste' };

test('Render: usa a URL fornecida pela hospedagem, preserva substituição explícita e exige HTTPS', () => {
  const ambiente = { NODE_ENV: 'production', EMAIL_MODO: 'resend', RENDER_EXTERNAL_URL: 'https://dayvilo-teste.onrender.com' };
  assert.equal(lerConfiguracao(ambiente).urlAplicacao, 'https://dayvilo-teste.onrender.com/');
  assert.equal(lerConfiguracao({ ...ambiente, URL_APLICACAO: 'https://exemplo.com/' }).urlAplicacao, 'https://exemplo.com/');
  assert.throws(() => lerConfiguracao({ ...ambiente, RENDER_EXTERNAL_URL: 'http://dayvilo-teste.onrender.com' }));
  assert.equal(lerConfiguracao({ RENDER_EXTERNAL_URL: ambiente.RENDER_EXTERNAL_URL }).urlAplicacao, 'http://127.0.0.1:5173/');
});

async function iniciar(t, app) {
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  return `http://127.0.0.1:${servidor.address().port}`;
}

test('produção: configuração explícita, HTTPS, cadastro fechado e proxy limitado', () => {
  const local = lerConfiguracao({});
  assert.equal(local.endereco, '127.0.0.1');
  assert.equal(local.cadastroAberto, true);
  const producao = lerConfiguracao(ambienteProducao);
  assert.equal(producao.endereco, '0.0.0.0');
  assert.equal(producao.cadastroAberto, false);
  assert.equal(producao.proxySaltos, 1);
  for (const url of ['', 'http://dayvilo.example', 'https://dayvilo.example/sub', 'https://user:pass@dayvilo.example', 'https://dayvilo.example/?token=x', 'https://localhost']) {
    assert.throws(() => lerConfiguracao({ ...ambienteProducao, URL_APLICACAO: url }));
  }
  assert.throws(() => lerConfiguracao({ ...ambienteProducao, EMAIL_MODO: 'local' }));
  assert.throws(() => lerConfiguracao({ ...ambienteProducao, PROXY_SALTOS: 'true' }));
  assert.throws(() => lerConfiguracao({ HOST: '0.0.0.0' }));
  assert.throws(() => lerConfiguracao({ CADASTRO_ABERTO: 'sim' }));
});

test('MySQL: TLS obrigatório em produção e verificação de identidade habilitada', () => {
  assert.equal(configurarBanco(bancoAmbiente).ssl, undefined);
  assert.throws(() => configurarBanco({ ...bancoAmbiente, NODE_ENV: 'production' }), /MYSQL_SSL/);
  const ssl = configurarBanco({ ...bancoAmbiente, NODE_ENV: 'production', MYSQL_SSL: 'true', MYSQL_SSL_CA: 'certificado-fixture' }).ssl;
  assert.equal(ssl.rejectUnauthorized, true);
  assert.equal(ssl.verifyIdentity, true);
  assert.equal(ssl.ca, 'certificado-fixture');
  assert.throws(() => configurarBanco({ ...bancoAmbiente, MYSQL_SSL: 'true', MYSQL_HOST: '127.0.0.1' }), /hostname/);
  assert.throws(() => configurarBanco({ ...bancoAmbiente, MYSQL_SSL_CA: 'certificado-fixture' }), /Ative/);
  assert.throws(() => configurarBanco({ ...bancoAmbiente, MYSQL_SSL: 'true', MYSQL_SSL_CA: 'x', MYSQL_SSL_CA_FILE: 'x' }), /apenas/);
});

test('produção: interface e API na mesma origem; rejeita HTTP, origem externa e cadastro direto', async t => {
  const pasta = await mkdtemp(join(tmpdir(), 'dayvilo-producao-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  await writeFile(join(pasta, 'index.html'), '<!doctype html><title>Dayvilo teste</title>');
  await writeFile(join(pasta, 'app.js'), 'console.log("fixture");');
  const configuracao = lerConfiguracao(ambienteProducao);
  const criar = extras => criarAplicacao({ banco: { execute() { throw new Error('Não deveria acessar o banco.'); } }, ...configuracao, modoEmail: 'resend', enviarEmail: async () => { throw new Error('Não deveria enviar e-mail.'); }, pastaInterface: pasta, ...extras });
  const base = await iniciar(t, criar());
  const headers = { Host: 'dayvilo.example', 'X-Forwarded-Proto': 'https' };
  const pagina = await chamar(base, { headers });
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /Dayvilo teste/);
  assert.match(pagina.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(pagina.headers.get('referrer-policy'), 'no-referrer');
  assert.match(pagina.headers.get('strict-transport-security'), /max-age/);
  assert.equal((await chamar(base + '/app.js', { headers })).status, 200);
  assert.equal((await chamar(base, { headers: { Host: 'dayvilo.example' } })).status, 403);
  assert.equal((await chamar(base, { headers: { ...headers, Origin: 'https://outro.example' } })).status, 403);
  assert.equal((await chamar(base, { headers: { ...headers, Host: 'outro.example', 'X-Forwarded-Host': 'dayvilo.example' } })).status, 403);
  assert.equal((await chamar(base + '/api/health')).status, 200);
  const sessao = await chamar(base + '/api/contas/sessao', { headers });
  assert.deepEqual(await sessao.json(), { usuario: null, cadastro_aberto: false });
  assert.match(sessao.headers.get('set-cookie'), /Secure/);
  assert.equal(sessao.headers.get('cache-control'), 'no-store');
  const cadastro = await chamar(base + '/api/contas/cadastro', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'X-Dayvilo': '1' }, body: '{}' });
  assert.equal(cadastro.status, 403);
  assert.match((await cadastro.json()).erro, /cadastros estão fechados/);
  assert.equal((await chamar(base + '/api/tarefas', { headers })).status, 401);
  assert.equal((await chamar(base + '/api/contas/sessao', { method: 'POST', headers })).status, 403);
  const direto = await iniciar(t, criar({ proxySaltos: 0 }));
  assert.equal((await chamar(direto, { headers })).status, 403, 'sem confiar no proxy, header forjado não habilita HTTPS');
});

test('produção: login emite cookie Secure e limitador não confia no primeiro IP forjado', async t => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use((req, res, next) => { res.locals.cookieSeguro = true; next(); });
  const controlador = criarControladorContas({
    contas: { entrar: async () => ({ token: 'fixture' }), consultar: async () => ({ id: 1, nome: 'Teste', csrf: 'fixture' }) },
    confirmacao: {}, recuperacao: {}, entrega: { cadastroAberto: false },
  });
  app.post('/entrada', criarLimitador(2), controlador.entrar);
  const base = await iniciar(t, app);
  for (let n = 0; n < 3; n++) {
    const resposta = await chamar(base + '/entrada', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `198.51.100.${n + 1}, 203.0.113.10` }, body: '{}' });
    assert.equal(resposta.status, n < 2 ? 200 : 429);
    if (n === 0) {
      const cookie = resposta.headers.get('set-cookie');
      for (const atributo of [/Secure/, /HttpOnly/, /SameSite=Strict/, /Path=\/api/]) assert.match(cookie, atributo);
    }
  }
});
