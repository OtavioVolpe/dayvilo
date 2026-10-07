import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { criarPoolBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { criarServicoAutenticacao } from '../src/servicos/autenticacao.js';
import { criarServicoRecuperacao } from '../src/servicos/recuperacao-senha.js';

test('sessões: saída individual, cookies inválidos e rollback da redefinição', async () => {
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.MYSQL_HOST), 'Teste restrito ao banco local.');
  const pool = criarPoolBanco(), banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const contas = criarServicoAutenticacao(banco);
    const email = `${randomUUID()}@example.test`, senha = 'Frase anterior exclusiva do teste', nova = 'Frase nova exclusiva deste teste';
    const primeira = await contas.cadastrar({ nome: 'Ciclo sessão', email, senha });
    const segunda = await contas.entrar({ email, senha });
    const mensagens = [];
    const entrega = { banco, urlAplicacao: 'http://127.0.0.1:5173/', enviarEmail: async m => mensagens.push(m) };
    servidor = criarAplicacao(entrega).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const chamar = async (rota, sessao, method = 'GET', body, extra = {}) => {
      const r = await fetch(`http://127.0.0.1:${servidor.address().port}/api${rota}`, { method, headers: {
        'Content-Type': 'application/json', 'X-Dayvilo': '1', ...(sessao ? { Cookie: `dayvilo_sessao=${sessao.token}`, 'X-CSRF-Token': sessao.csrf } : {}), ...extra,
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, dados: await r.json(), cookie: r.headers.get('set-cookie') };
    };
    for (const token of ['invalido', '0'.repeat(64)]) {
      assert.equal((await chamar('/tarefas', { token })).status, 401);
      const r = await chamar('/contas/sessao', { token });
      assert.equal(r.dados.usuario, null); assert.match(r.cookie, /Expires=Thu, 01 Jan 1970/);
    }
    assert.equal((await chamar('/contas/saida', primeira, 'POST', undefined, { 'X-CSRF-Token': segunda.csrf })).status, 403);
    assert.ok(await contas.consultar(primeira.token));
    const saida = await chamar('/contas/saida', primeira, 'POST');
    assert.equal(saida.status, 200); assert.match(saida.cookie, /HttpOnly/); assert.match(saida.cookie, /SameSite=Strict/);
    assert.equal((await chamar('/tarefas', primeira)).status, 401);
    assert.equal((await chamar('/tarefas', segunda)).status, 200);
    const servico = criarServicoRecuperacao(entrega);
    await servico.solicitar({ email });
    const token = mensagens[0].texto.match(/#redefinir-senha=([a-f0-9]{64})/)[1];
    const [[antes]] = await banco.execute('SELECT senha_hash FROM contas WHERE email=?', [email]);
    // Falha depois de UPDATE senha e DELETE sessões: ambas precisam ser revertidas.
    let falhouNoPonto = false;
    const bancoFalhando = { query: banco.query.bind(banco), execute: async (sql, params) => {
      if (sql.startsWith('DELETE FROM recuperacoes_senha')) { falhouNoPonto = true; throw new Error('Falha transacional simulada'); }
      return banco.execute(sql, params);
    } };
    await assert.rejects(criarServicoRecuperacao({ ...entrega, banco: bancoFalhando }).redefinir({ token, senha: nova }), /Falha transacional simulada/);
    assert.equal(falhouNoPonto, true);
    const [[depois]] = await banco.execute('SELECT senha_hash FROM contas WHERE email=?', [email]);
    assert.equal(depois.senha_hash, antes.senha_hash);
    assert.ok(await contas.consultar(segunda.token));
    assert.deepEqual(await servico.validar({ token }), { valido: true });
    const redefinida = await chamar('/contas/recuperacao/redefinir', undefined, 'POST', { token, senha: nova });
    assert.equal(redefinida.status, 200);
    assert.equal(redefinida.cookie, null, 'Redefinir senha não deve autenticar automaticamente.');
    assert.equal((await chamar('/tarefas', segunda)).status, 401);
    assert.equal((await chamar('/contas/recuperacao/validar', undefined, 'POST', { token })).status, 400);
    assert.equal((await chamar('/contas/entrada', undefined, 'POST', { email, senha })).status, 401);
    const login = await chamar('/contas/entrada', undefined, 'POST', { email, senha: nova });
    assert.equal(login.status, 200); assert.ok(login.dados.csrf);
    assert.equal('senha_hash' in login.dados.usuario, false);
    assert.equal('token' in login.dados, false);
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(r => servidor.close(r)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});
