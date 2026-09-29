import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { criarAplicacao } from '../src/app.js';
import { criarPoolBanco } from '../src/db.js';
import { gerarToken, resumoToken } from '../src/servicos/autenticacao.js';

test('contas: vinculação, senha, sessão, isolamento, CSRF, expiração e saída', async () => {
  const pool = criarPoolBanco(); const banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const [local] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Perfil anterior de teste']);
    const codigo = gerarToken();
    await banco.execute('INSERT INTO vinculos_conta VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))', [local.insertId, resumoToken(codigo)]);
    await banco.execute(`INSERT INTO tarefas (usuario_id, titulo, data_prevista, situacao, concluida_em) VALUES
      (?, 'Pendente anterior', '2024-01-01', 'pendente', NULL),
      (?, 'Concluída anterior', '2024-01-01', 'concluida', UTC_TIMESTAMP()),
      (?, 'Pulada anterior', '2024-01-01', 'pulada', NULL)`, [local.insertId, local.insertId, local.insertId]);
    const [antes] = await banco.execute('SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY id', [local.insertId]);
    servidor = criarAplicacao({ banco, enviarEmail: async () => {} }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const url = `http://127.0.0.1:${servidor.address().port}/api`;
    async function chamar(rota, method = 'GET', body, sessao, extras = {}) {
      const resposta = await fetch(url + rota, {
        method, headers: { 'Content-Type': 'application/json', 'X-Dayvilo': '1', ...(sessao ? { Cookie: sessao.cookie, 'X-CSRF-Token': sessao.csrf } : {}), ...extras },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const dados = await resposta.json();
      return { status: resposta.status, dados, cookie: resposta.headers.get('set-cookie')?.split(';')[0], cookieCompleto: resposta.headers.get('set-cookie'), csrf: dados.csrf, headers: resposta.headers };
    }
    for (const rota of ['/perfil', '/tarefas', '/tarefas/semana', '/tarefas/historico', '/tarefas/atrasadas']) assert.equal((await chamar(rota)).status, 401);
    assert.equal((await chamar('/tarefas', 'POST', { titulo: 'Intrusa' })).status, 401);
    assert.equal((await chamar('/contas/sessao')).dados.usuario, null);
    assert.equal((await chamar('/contas/sessao', 'GET', undefined, undefined, { Origin: 'https://externo.example' })).status, 403);
    const email = `${randomUUID()}@example.test`; const senha = 'Uma frase longa de teste 123!';
    const dadosConta = { nome: 'Perfil com conta', email, senha, codigo_vinculo: codigo };
    assert.equal((await chamar('/contas/cadastro', 'POST', dadosConta, undefined, { 'X-Dayvilo': '' })).status, 403);
    assert.equal((await chamar('/contas/cadastro', 'POST', { ...dadosConta, codigo_vinculo: gerarToken() })).status, 400);
    const primeira = await chamar('/contas/cadastro', 'POST', dadosConta);
    assert.equal(primeira.status, 201);
    assert.equal(primeira.dados.usuario.id, local.insertId);
    assert.equal(primeira.dados.usuario.nome, 'Perfil com conta');
    assert.match(primeira.cookieCompleto, /HttpOnly/); assert.match(primeira.cookieCompleto, /SameSite=Strict/); assert.match(primeira.cookieCompleto, /Path=\/api/);
    assert.equal((await chamar('/contas/sessao', 'GET', undefined, primeira)).dados.usuario.email, email);
    const [depois] = await banco.execute('SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY id', [local.insertId]);
    assert.deepEqual(depois, antes);
    const [[conta]] = await banco.execute('SELECT senha_hash FROM contas WHERE usuario_id = ?', [local.insertId]);
    assert.notEqual(conta.senha_hash, senha); assert.match(conta.senha_hash, /^scrypt\$/);
    const token = primeira.cookie.split('=')[1];
    assert.equal((await banco.execute('SELECT token_hash FROM sessoes WHERE token_hash = ?', [token]))[0].length, 0);
    assert.equal((await banco.execute('SELECT * FROM vinculos_conta WHERE usuario_id = ?', [local.insertId]))[0].length, 0);
    const [[usuariosAntes]] = await banco.execute('SELECT COUNT(*) AS total FROM usuarios');
    assert.equal((await chamar('/contas/cadastro', 'POST', { nome: 'Duplicado', email: email.toUpperCase(), senha })).status, 409);
    assert.equal((await banco.execute('SELECT COUNT(*) AS total FROM usuarios'))[0][0].total, usuariosAntes.total);
    assert.equal((await chamar('/contas/cadastro', 'POST', { ...dadosConta, email: `reuso-${email}` })).status, 400);
    assert.equal((await chamar('/contas/cadastro', 'POST', { nome: 'Invasor', email: `id-${email}`, senha, usuario_id: local.insertId })).status, 400);
    const segunda = await chamar('/contas/cadastro', 'POST', { nome: 'Outra conta', email: `outra-${email}`, senha });
    assert.equal(segunda.status, 201); assert.notEqual(segunda.dados.usuario.id, local.insertId);
    assert.equal((await chamar('/tarefas?data=2024-01-01', 'GET', undefined, segunda)).dados.tarefas.length, 0);
    const id = antes[0].id;
    for (const [rota, method, body] of [
      [`/tarefas/${id}`, 'PUT', { titulo: 'Intrusa' }], [`/tarefas/${id}`, 'DELETE'],
      [`/tarefas/${id}/situacao`, 'PATCH', { situacao: 'pulada' }],
      [`/tarefas/${id}/conclusao`, 'PATCH', { concluida: true }],
      [`/tarefas/${id}/agendamento`, 'PATCH', { data_prevista: '2024-01-02' }],
      [`/tarefas/${id}/serie`, 'PUT', { titulo: 'Intrusa' }], [`/tarefas/${id}/serie/encerramento`, 'PATCH', {}],
    ]) assert.equal((await chamar(rota, method, body, segunda)).status, 404);
    assert.equal((await chamar(`/tarefas/${id}`, 'DELETE', undefined, primeira, { 'X-CSRF-Token': '' })).status, 403);
    assert.equal((await chamar(`/tarefas/${id}`, 'DELETE', undefined, primeira, { 'X-CSRF-Token': segunda.csrf })).status, 403);
    assert.equal((await chamar('/tarefas?data=2024-01-01', 'GET', undefined, primeira)).dados.tarefas.length, 3);
    assert.equal((await chamar('/contas/saida', 'POST', undefined, primeira)).status, 200);
    assert.equal((await chamar('/perfil', 'GET', undefined, primeira)).status, 401);
    const incorreta = await chamar('/contas/entrada', 'POST', { email, senha: 'Senha incorreta de teste' });
    const inexistente = await chamar('/contas/entrada', 'POST', { email: `nao-${email}`, senha });
    assert.equal(incorreta.status, 401); assert.equal(inexistente.status, 401); assert.equal(incorreta.dados.erro, inexistente.dados.erro);
    const entrada = await chamar('/contas/entrada', 'POST', { email: email.toUpperCase(), senha });
    assert.equal(entrada.status, 200); assert.notEqual(entrada.cookie, primeira.cookie); assert.notEqual(entrada.csrf, primeira.csrf);
    assert.equal(entrada.headers.get('cache-control'), 'no-store');
    await banco.execute("UPDATE sessoes SET expira_em = '2000-01-01' WHERE token_hash = ?", [resumoToken(entrada.cookie.split('=')[1])]);
    assert.equal((await chamar('/tarefas', 'GET', undefined, entrada)).status, 401);
    assert.equal((await chamar('/contas/sessao', 'GET', undefined, entrada)).dados.usuario, null);
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});

test('contas: limite de tentativas antes de consultar credenciais', async () => {
  const banco = { execute() { throw new Error('Não deveria consultar o banco.'); } };
  const servidor = criarAplicacao({ banco, enviarEmail: async () => {} }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
  try {
    const url = `http://127.0.0.1:${servidor.address().port}/api/contas/entrada`;
    for (let indice = 0; indice < 11; indice++) {
      const resposta = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dayvilo': '1' }, body: '{}' });
      assert.equal(resposta.status, indice < 10 ? 400 : 429);
      if (indice === 10) assert.ok(Number(resposta.headers.get('retry-after')) > 0);
      await resposta.json();
    }
  } finally { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
});
