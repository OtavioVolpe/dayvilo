import test from 'node:test';
import assert from 'node:assert/strict';
import { criarEntregaResend } from '../src/servicos/email-resend.js';
import { configurarEmail } from '../src/servicos/email.js';
const config = { chave: 're_chave_ficticia', remetente: 'Dayvilo <onboarding@resend.dev>', destinatarioTeste: 'teste@example.test' };
const mensagem = { para: 'teste@example.test', assunto: 'Recuperação', texto: 'Link privado de teste' };

test('Resend: envia somente ao destinatário permitido e mantém a chave no header', async () => {
  const chamadas = [];
  const enviar = criarEntregaResend({ ...config, requisitar: async (...args) => { chamadas.push(args); return { ok: true, json: async () => ({ id: 'id-teste' }) }; } });
  await enviar(mensagem);
  assert.equal(chamadas.length, 1);
  const [url, opcoes] = chamadas[0];
  assert.equal(url, 'https://api.resend.com/emails'); assert.equal(opcoes.redirect, 'error'); assert.ok(opcoes.signal instanceof AbortSignal);
  assert.equal(opcoes.headers.Authorization, 'Bearer re_chave_ficticia');
  assert.deepEqual(JSON.parse(opcoes.body), { from: config.remetente, to: [mensagem.para], subject: mensagem.assunto, text: mensagem.texto });
  await assert.rejects(enviar({ ...mensagem, para: 'outra@example.test' }), { code: 'RESEND_DESTINATARIO_NAO_PERMITIDO' });
  assert.equal(chamadas.length, 1);
});

test('Resend: falhas externas são sanitizadas sem vazar corpo ou credenciais', async () => {
  for (const [requisitar, code] of [
    [async () => ({ ok: false, status: 403, json: async () => { throw new Error('Não ler corpo privado'); } }), 'RESEND_HTTP_403'],
    [async () => { throw new Error('segredo re_chave_ficticia'); }, 'RESEND_CONEXAO'],
    [async () => ({ ok: true, json: async () => ({}) }), 'RESEND_RESPOSTA_INVALIDA'],
    [async () => { throw new DOMException('tempo esgotado', 'TimeoutError'); }, 'RESEND_CONEXAO'],
  ]) {
    const enviar = criarEntregaResend({ ...config, requisitar });
    await assert.rejects(enviar(mensagem), erro => erro.code === code && !erro.message.includes('re_chave_ficticia'));
  }
});

test('configuração: modo explícito, remetente de teste restrito e configuração incompleta recusada', () => {
  assert.equal(configurarEmail({}).modoEmail, 'local');
  assert.throws(() => configurarEmail({ EMAIL_MODO: 'errado' }), /EMAIL_MODO/);
  assert.throws(() => configurarEmail({ EMAIL_MODO: 'resend' }), /RESEND_API_KEY/);
  assert.throws(() => criarEntregaResend({ ...config, destinatarioTeste: '' }), /RESEND_DESTINATARIO_TESTE/);
  assert.throws(() => criarEntregaResend({ ...config, remetente: 'Dayvilo\n<onboarding@resend.dev>' }), /EMAIL_REMETENTE/);
  assert.equal(configurarEmail({ EMAIL_MODO: 'resend', RESEND_API_KEY: config.chave, RESEND_DESTINATARIO_TESTE: mensagem.para }).modoEmail, 'resend');
});
