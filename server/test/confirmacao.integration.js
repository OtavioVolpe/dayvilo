import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { criarPoolBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { criarServicoAutenticacao, resumoToken } from '../src/servicos/autenticacao.js';
import { criarServicoConfirmacao } from '../src/servicos/confirmacao-email.js';
import { criarServicoRecuperacao } from '../src/servicos/recuperacao-senha.js';

test('confirmação: cadastro automático, conta atual, reenvio, expiração, isolamento e preservação da rotina', async () => {
  const pool = criarPoolBanco(); const banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const mensagens = []; let falhar = false;
    const enviarEmail = async mensagem => { if (falhar) throw new Error('falha simulada'); mensagens.push(mensagem); };
    const config = { banco, enviarEmail, urlAplicacao: 'http://127.0.0.1:5173/' };
    const servico = criarServicoConfirmacao(config); const contas = criarServicoAutenticacao(banco);
    const email = `${randomUUID()}@example.test`; const senha = 'Uma senha longa para testar!';
    const antiga = await contas.cadastrar({ nome: 'Conta atual', email, senha });
    const usuario = await contas.consultar(antiga.token); assert.equal(usuario.email_confirmado, false);
    await banco.execute('INSERT INTO tarefas (usuario_id,titulo) VALUES (?,?)', [usuario.id, 'Minha rotina']);
    const [antes] = await banco.execute('SELECT * FROM tarefas WHERE usuario_id = ?', [usuario.id]);
    servidor = criarAplicacao(config).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const url = `http://127.0.0.1:${servidor.address().port}/api/contas`;
    async function post(rota, body, sessao, extras = {}) {
      const r = await fetch(url + rota, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dayvilo': '1', ...(sessao ? { Cookie: `dayvilo_sessao=${sessao.token}`, 'X-CSRF-Token': sessao.csrf } : {}), ...extras }, body: JSON.stringify(body) });
      return { status: r.status, dados: await r.json() };
    }
    assert.equal((await post('/confirmacao', {})).status, 401);
    assert.equal((await post('/confirmacao', {}, antiga, { 'X-CSRF-Token': '' })).status, 403);
    assert.equal((await post('/confirmacao', { email: 'outra@example.test' }, antiga)).status, 200);
    assert.equal(mensagens.at(-1).para, email);
    const tokenMensagem = () => mensagens.at(-1).texto.match(/#confirmar-email=([a-f0-9]{64})/)[1];
    const primeiro = tokenMensagem();
    assert.equal((await post('/confirmacao', {}, antiga)).status, 429);
    assert.equal((await contas.consultar(antiga.token)).email_confirmado, false);
    await assert.rejects(criarServicoRecuperacao(config).validar({ token: primeiro }), { status: 400 });
    const [[registro]] = await banco.execute('SELECT conta_id,token_hash FROM confirmacoes_email WHERE token_hash = ?', [resumoToken(primeiro)]);
    assert.ok(registro); assert.notEqual(registro.token_hash, primeiro);
    await banco.execute('UPDATE confirmacoes_email SET criado_em = DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 MINUTE) WHERE conta_id = ?', [registro.conta_id]);
    falhar = true; await assert.rejects(servico.solicitar(usuario.id), { status: 503 }); falhar = false;
    assert.equal((await banco.execute('SELECT token_hash FROM confirmacoes_email WHERE conta_id = ?', [registro.conta_id]))[0][0].token_hash, resumoToken(primeiro));
    await servico.solicitar(usuario.id); const segundo = tokenMensagem();
    await assert.rejects(servico.confirmar({ token: primeiro }), { status: 400 });
    await banco.execute('UPDATE confirmacoes_email SET expira_em = DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND), criado_em = DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 MINUTE) WHERE conta_id = ?', [registro.conta_id]);
    await assert.rejects(servico.confirmar({ token: segundo }), { status: 400 });
    await servico.solicitar(usuario.id); const terceiro = tokenMensagem();
    const nova = await post('/cadastro', { nome: 'Nova conta', email: `nova-${email}`, senha });
    assert.equal(nova.status, 201); assert.equal(nova.dados.usuario.email_confirmado, false);
    assert.equal(mensagens.at(-1).para, `nova-${email}`);
    const tokenNova = tokenMensagem();
    assert.equal((await post('/confirmacao/confirmar', { token: terceiro }, undefined, { 'X-Dayvilo': '' })).status, 403);
    assert.equal((await post('/confirmacao/confirmar', { token: terceiro, usuario_id: nova.dados.usuario.id })).status, 400);
    assert.equal((await post('/confirmacao/confirmar', { token: terceiro })).status, 200);
    assert.equal((await post('/confirmacao/confirmar', { token: terceiro })).status, 400);
    assert.equal((await contas.consultar(antiga.token)).email_confirmado, true);
    assert.deepEqual(await servico.solicitar(usuario.id), { confirmado: true });
    const sessaoNova = await contas.entrar({ email: `nova-${email}`, senha });
    assert.equal((await contas.consultar(sessaoNova.token)).email_confirmado, false);
    // O token confirma a conta vinculada, mesmo com outra sessão aberta.
    assert.equal((await post('/confirmacao/confirmar', { token: tokenNova }, antiga)).status, 200);
    assert.equal((await contas.consultar(sessaoNova.token)).email_confirmado, true);
    assert.deepEqual((await banco.execute('SELECT * FROM tarefas WHERE usuario_id = ?', [usuario.id]))[0], antes);
    assert.ok(await contas.entrar({ email, senha }));
    falhar = true;
    const falhaCadastro = await post('/cadastro', { nome: 'Falha entrega', email: `falha-${email}`, senha });
    assert.equal(falhaCadastro.status, 201); assert.match(falhaCadastro.dados.aviso_confirmacao, /não conseguimos/);
    assert.ok(await contas.entrar({ email: `falha-${email}`, senha }));
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});
