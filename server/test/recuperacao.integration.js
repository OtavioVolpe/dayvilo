import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { criarPoolBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { criarServicoAutenticacao, resumoToken } from '../src/servicos/autenticacao.js';
import { criarServicoRecuperacao } from '../src/servicos/recuperacao-senha.js';

test('recuperação: entrega, reenvio, expiração, uso único e revogação apenas das sessões da conta', async () => {
  const pool = criarPoolBanco(); const banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const contas = criarServicoAutenticacao(banco);
    const email = `${randomUUID()}@example.test`;
    const senha = 'Minha senha anterior de teste!'; const nova = 'Minha nova senha longa de teste!';
    const sessao1 = await contas.cadastrar({ nome: 'Recuperação teste', email, senha });
    const sessao2 = await contas.entrar({ email, senha });
    const outra = await contas.cadastrar({ nome: 'Outra conta', email: `outra-${email}`, senha });
    const usuario = await contas.consultar(sessao1.token);
    const [[conta]] = await banco.execute('SELECT id FROM contas WHERE email = ?', [email]);
    await banco.execute('INSERT INTO tarefas (usuario_id, titulo) VALUES (?, ?)', [usuario.id, 'Preservar esta tarefa']);
    const [tarefasAntes] = await banco.execute('SELECT * FROM tarefas WHERE usuario_id = ?', [usuario.id]);
    const mensagens = [];
    const enviarEmail = async mensagem => { mensagens.push(mensagem); };
    const servico = criarServicoRecuperacao({ banco, enviarEmail, urlAplicacao: 'http://127.0.0.1:5173/' });
    servidor = criarAplicacao({ banco, enviarEmail }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const url = `http://127.0.0.1:${servidor.address().port}/api/contas/recuperacao`;
    async function post(sufixo, dados, extras = {}) {
      const resposta = await fetch(url + sufixo, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dayvilo': '1', ...extras }, body: JSON.stringify(dados) });
      return { status: resposta.status, dados: await resposta.json() };
    }
    const existente = await post('', { email: email.toUpperCase() });
    const inexistente = await post('', { email: `nao-${email}` });
    assert.equal(existente.status, 202); assert.deepEqual(existente, inexistente); assert.equal(mensagens.length, 1);
    const tokenMensagem = () => mensagens.at(-1).texto.match(/#redefinir-senha=([a-f0-9]{64})/)[1];
    const primeiro = tokenMensagem();
    assert.equal(JSON.stringify(existente).includes(primeiro), false);
    assert.equal(mensagens[0].para, email);
    const [[registro]] = await banco.execute('SELECT token_hash FROM recuperacoes_senha WHERE conta_id = ?', [conta.id]);
    assert.equal(registro.token_hash, resumoToken(primeiro)); assert.notEqual(registro.token_hash, primeiro);
    await servico.solicitar({ email }); assert.equal(mensagens.length, 1);
    assert.deepEqual(await servico.validar({ token: primeiro }), { valido: true });
    assert.deepEqual(await servico.validar({ token: primeiro }), { valido: true });
    assert.equal((await post('/validar', { token: primeiro }, { Origin: 'https://externo.example' })).status, 403);
    assert.equal((await post('/validar', { token: primeiro }, { 'X-Dayvilo': '' })).status, 403);
    assert.equal((await post('/validar', { token: 'errado' })).status, 400);
    assert.equal((await post('/redefinir', { token: primeiro, senha: '12345678' })).status, 400);
    await servico.validar({ token: primeiro });
    await banco.execute('UPDATE recuperacoes_senha SET criado_em = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 MINUTE) WHERE conta_id = ?', [conta.id]);
    const falhando = criarServicoRecuperacao({ banco, urlAplicacao: 'http://127.0.0.1:5173/', enviarEmail: async () => { throw new Error('Entrega indisponível'); } });
    await assert.rejects(falhando.solicitar({ email }), /Entrega indisponível/);
    await servico.validar({ token: primeiro });
    await servico.solicitar({ email }); const segundo = tokenMensagem();
    assert.notEqual(segundo, primeiro); await assert.rejects(servico.validar({ token: primeiro }), { status: 400 });
    await banco.execute('UPDATE recuperacoes_senha SET expira_em = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 SECOND) WHERE conta_id = ?', [conta.id]);
    await assert.rejects(servico.redefinir({ token: segundo, senha: nova }), { status: 400 });
    await assert.rejects(servico.validar({ token: segundo }), { status: 400 });
    await banco.execute('UPDATE recuperacoes_senha SET criado_em = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 MINUTE) WHERE conta_id = ?', [conta.id]);
    await servico.solicitar({ email }); const terceiro = tokenMensagem();
    assert.equal((await post('/redefinir', { token: terceiro, senha: nova })).status, 200);
    assert.equal(await contas.consultar(sessao1.token), null); assert.equal(await contas.consultar(sessao2.token), null);
    assert.ok(await contas.consultar(outra.token));
    assert.equal((await post('/redefinir', { token: terceiro, senha: nova })).status, 400);
    await assert.rejects(contas.entrar({ email, senha }), { status: 401 });
    assert.ok(await contas.entrar({ email, senha: nova }));
    const [tarefasDepois] = await banco.execute('SELECT * FROM tarefas WHERE usuario_id = ?', [usuario.id]);
    assert.deepEqual(tarefasDepois, tarefasAntes);
    assert.equal((await banco.execute('SELECT * FROM recuperacoes_senha WHERE conta_id = ?', [conta.id]))[0].length, 0);
    for (let i = 0; i < 3; i++) assert.equal((await post('', { email: `nao-${email}` })).status, 202);
    assert.equal((await post('', { email })).status, 429);
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});

test('recuperação via Resend: resposta genérica, contrato da API e token persistido sem envio real', async () => {
  const { criarEntregaResend } = await import('../src/servicos/email-resend.js');
  const pool = criarPoolBanco(); const banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const email = `${randomUUID()}@example.test`;
    const [usuario] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Teste envio']);
    await banco.execute('INSERT INTO contas (usuario_id, email, senha_hash) VALUES (?, ?, ?)', [usuario.insertId, email, 'sem-login']);
    const chamadas = [];
    const enviarEmail = criarEntregaResend({ chave: 're_ficticia', remetente: 'Dayvilo <onboarding@resend.dev>', destinatarioTeste: email,
      requisitar: async (url, opcoes) => { chamadas.push(JSON.parse(opcoes.body)); return { ok: true, json: async () => ({ id: 'email-simulado' }) }; } });
    servidor = criarAplicacao({ banco, enviarEmail, modoEmail: 'resend' }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const url = `http://127.0.0.1:${servidor.address().port}/api/contas/recuperacao`;
    async function pedir(endereco) {
      const resposta = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dayvilo': '1' }, body: JSON.stringify({ email: endereco }) });
      assert.equal(resposta.status, 202); return resposta.json();
    }
    const existente = await pedir(email); const inexistente = await pedir(`nao-${email}`);
    assert.deepEqual(existente, inexistente); assert.equal(existente.entrega, 'resend'); assert.match(existente.mensagem, /Se o e-mail estiver cadastrado, enviaremos um link/);
    assert.equal(chamadas.length, 1); assert.deepEqual(chamadas[0].to, [email]);
    const token = chamadas[0].text.match(/#redefinir-senha=([a-f0-9]{64})/)[1];
    const [[registro]] = await banco.execute('SELECT token_hash FROM recuperacoes_senha WHERE token_hash = ?', [resumoToken(token)]);
    assert.ok(registro); assert.equal(JSON.stringify(existente).includes(token), false);
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});
