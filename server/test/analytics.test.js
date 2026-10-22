import test from 'node:test';
import assert from 'node:assert/strict';
import { criarAnalytics } from '../../client/src/analytics.js';
import { lerConfiguracao } from '../src/configuracao/ambiente.js';
import { protegerProducao } from '../src/middlewares/producao.js';

function ambiente({ id = 'G-TEST12345', salvo, hash = '', referrer = 'https://www.instagram.com/private?email=segredo' } = {}) {
  const scripts = [], cookies = [], listeners = {}, local = new Map(salvo ? [['dayvilo-analytics-v1', JSON.stringify(salvo)]] : []);
  const w = { location: { origin: 'https://dayvilo.example', hostname: 'dayvilo.example', hash, search: '?email=segredo' }, localStorage: { getItem: k => local.get(k), setItem: (k,v) => local.set(k,v) }, addEventListener: (k,fn) => { listeners[k] = fn; }, dispatchEvent() {} };
  const d = { querySelector: () => ({ content: id }), referrer, createElement: () => ({}), head: { appendChild: s => scripts.push(s) }, get cookie() { return '_ga=teste; _ga_TEST12345=teste; dayvilo_sessao=privado'; }, set cookie(c) { cookies.push(c); } };
  const analytics = criarAnalytics(w,d,()=>1000);
  return { analytics, w, scripts, cookies, listeners };
}

test('Analytics não carrega nem guarda eventos sem consentimento ou com configuração desativada', () => {
  for (const id of ['', 'id-invalido', 'G-TEST12345']) {
    const a = ambiente({id}); a.analytics.pagina('inicio'); a.analytics.evento('sign_up');
    assert.equal(a.scripts.length,0); assert.equal(a.w.dataLayer,undefined);
    a.analytics.escolher('recusado'); a.analytics.pagina('rotina'); assert.equal(a.scripts.length,0);
  }
});

test('aceitar envia somente eventos permitidos, com URLs e títulos controlados, sem duplicar telas', () => {
  const a=ambiente(); a.analytics.pagina('inicio'); a.analytics.evento('sign_up'); a.analytics.escolher('aceito');
  a.analytics.pagina('inicio'); a.analytics.evento('create_task'); a.analytics.evento('senha-secreta');
  const fila=a.w.dataLayer.map(args=>Array.from(args));
  assert.equal(a.scripts.length,1);
  assert.equal(fila.filter(x=>x[1]==='page_view').length,1);
  assert.equal(fila.filter(x=>x[1]==='sign_up').length,0, 'não reproduz eventos anteriores à escolha');
  assert.equal(fila.filter(x=>x[1]==='create_task').length,1);
  assert.doesNotMatch(JSON.stringify(fila),/segredo|private|senha-secreta|email=/);
  const config=fila.find(x=>x[0]==='config')[2];
  assert.equal(config.page_referrer,'https://www.instagram.com/'); assert.equal(config.send_page_view,false);
  a.analytics.escolher('recusado'); const total=a.w.dataLayer.length; a.analytics.evento('login');
  assert.equal(a.w.dataLayer.length,total); assert.equal(a.w['ga-disable-G-TEST12345'],true);
  assert.ok(a.cookies.length); assert.ok(a.cookies.every(c=>c.startsWith('_ga')));
  a.analytics.escolher('aceito'); assert.equal(a.scripts.length,1); assert.equal(a.w['ga-disable-G-TEST12345'],false);
});

test('consentimento expirado e links de autenticação não iniciam medição; revogação sincroniza abas', () => {
  const expirado=ambiente({salvo:{versao:1,valor:'aceito',expira:500}}); expirado.analytics.pagina('inicio'); assert.equal(expirado.scripts.length,0);
  for(const hash of ['#redefinir-senha=token','#confirmar-email=token','#alterar-email=token','#recuperar-senha']) {
    const a=ambiente({hash,salvo:{versao:1,valor:'aceito',expira:2000}}); a.analytics.pagina('inicio'); assert.equal(a.scripts.length,0);
  }
  const a=ambiente();a.analytics.pagina('rotina');a.analytics.escolher('aceito');
  a.listeners.storage({key:'dayvilo-analytics-v1',newValue:JSON.stringify({valor:'recusado',expira:2000})});
  assert.equal(a.w['ga-disable-G-TEST12345'],true);
  assert.equal(a.analytics.preferencia(),'recusado');
});

test('Analytics é opcional e libera somente os destinos necessários na CSP quando ativo', () => {
  assert.equal(lerConfiguracao({}).analyticsId,'');
  assert.throws(()=>lerConfiguracao({GOOGLE_ANALYTICS_ID:'<script>'}));
  for(const ativo of [false,true]) {
    let headers;
    protegerProducao('https://dayvilo.example/',ativo)({headers:{host:'dayvilo.example'},secure:true},{set(h){headers=h;}},()=>{});
    assert.equal(headers['Content-Security-Policy'].includes('https://www.googletagmanager.com'),ativo);
    assert.doesNotMatch(headers['Content-Security-Policy'],/doubleclick|unsafe-eval/);
  }
});
