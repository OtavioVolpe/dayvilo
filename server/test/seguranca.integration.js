import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';
import { criarAplicacao } from '../src/app.js';
import { criarPoolBanco } from '../src/db.js';
import { prepararSessaoTeste } from './sessao-fixture.js';
import { criarServicoLeitura } from '../src/servicos/leitura.js';
import { criarServicoFinanceiro } from '../src/servicos/financeiro.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';

test('segurança HTTP: isolamento, mass assignment, SQL, CSRF, sessão revogada e corpo malformado', async () => {
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(process.env.MYSQL_HOST));
  assert.notEqual(process.env.NODE_ENV, 'production');
  const pool = criarPoolBanco(), banco = await pool.getConnection();
  let servidor;
  try {
    await banco.beginTransaction();
    const contas = [];
    for (const nome of ['Auditoria A', 'Auditoria B']) {
      const [r] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', [nome]);
      contas.push({ id: r.insertId, fuso_horario: 'America/Sao_Paulo', headers: await prepararSessaoTeste(banco, r.insertId) });
    }
    const [a, b] = contas, hoje = obterDataHoje(a.fuso_horario);
    const leitura = criarServicoLeitura(banco), financeiro = criarServicoFinanceiro(banco);
    const { id: livro } = await leitura.salvar(b, { titulo: 'Livro privado B', autor: '', estado: 'lendo', total_paginas: 100, pagina_atual: 1 });
    const lancamento = { tipo: 'despesa', descricao: 'Privado B', categoria: 'Moradia', valor_centavos: 100, data_prevista: hoje, data_pagamento: null, observacao: '' };
    await financeiro.salvarLancamento(b, lancamento);
    const { lancamentos: [l] } = await financeiro.listar(b, { mes: hoje.slice(0, 7) });
    servidor = criarAplicacao({ banco }).listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const base = `http://127.0.0.1:${servidor.address().port}/api`;
    const chamar = (rota, method = 'GET', body, headers = a.headers) => fetch(base + rota, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    for (const rota of ['/tarefas', '/perfil', '/leitura', '/financeiro', '/treinos', '/alimentacao', '/metas', '/atalhos', '/meta-semanal']) {
      assert.equal((await chamar(rota, 'GET', undefined, {})).status, 401, rota);
      assert.equal((await chamar(rota, 'GET', undefined, { Cookie: "dayvilo_sessao=' OR 1=1--" })).status, 401, rota);
    }
    const antes = await leitura.detalhes(b, livro);
    for (const [rota, metodo, dados] of [
      [`/leitura/${livro}`, 'GET'],
      [`/leitura/${livro}`, 'PUT', { titulo: 'Invadido', versao: 1 }],
      [`/leitura/${livro}`, 'DELETE', { versao: 1 }],
      [`/leitura/${livro}/notas`, 'POST', { versao: 1, texto: 'Invadido' }],
      [`/leitura/${livro}/registrar`, 'POST', { data: hoje }],
      [`/financeiro/lancamentos/${l.id}`, 'GET'],
      [`/financeiro/lancamentos/${l.id}`, 'PUT', { ...lancamento, versao: l.versao }],
      [`/financeiro/lancamentos/${l.id}`, 'DELETE', { versao: l.versao, escopo: 'este' }],
    ]) assert.equal((await chamar(rota, metodo, dados)).status, 404, `${metodo} ${rota}`);
    assert.deepEqual(await leitura.detalhes(b, livro), antes);
    assert.equal((await financeiro.consultarLancamento(b, l.id)).descricao, l.descricao);
    assert.equal((await chamar('/leitura?usuario_id=' + b.id)).status, 200);
    assert.deepEqual((await (await chamar('/leitura?usuario_id=' + b.id)).json()).livros, []);
    assert.equal((await chamar('/leitura/' + encodeURIComponent('1 OR 1=1'))).status, 400);
    assert.equal((await chamar('/tarefas', 'POST', { titulo: 'Teste', data_prevista: hoje, usuario_id: b.id })).status, 400);
    for (const headers of [
      { ...a.headers, 'X-CSRF-Token': b.headers['X-CSRF-Token'] },
      { ...a.headers, 'X-CSRF-Token': '' },
      { ...a.headers, 'X-Dayvilo': '' },
      { ...a.headers, Origin: 'https://externo.example' },
    ]) assert.equal((await chamar('/tarefas', 'POST', { titulo: 'Teste', data_prevista: hoje }, headers)).status, 403);
    const sql = "' OR 1=1; DROP TABLE usuarios; --";
    const criado = await chamar('/tarefas', 'POST', { titulo: sql, data_prevista: hoje });
    assert.equal(criado.status, 201);
    assert.equal((await criado.json()).tarefa.titulo, sql, 'SQL deve ser armazenado como texto');
    for (const body of ['{', JSON.stringify({ titulo: 'x'.repeat(40000) })]) {
      const r = await fetch(base + '/tarefas', { method: 'POST', headers: a.headers, body });
      assert.equal(r.status, body === '{' ? 400 : 413);
      assert.doesNotMatch(await r.text(), /SELECT|mysql|node_modules|at .*\.js/);
    }
    const comprimido = await fetch(base + '/tarefas', { method: 'POST', headers: { ...a.headers, 'Content-Encoding': 'gzip' }, body: Buffer.concat([gzipSync('{}'), Buffer.from('invalid-trailer')]) });
    assert.equal(comprimido.status, 400);
    assert.equal((await chamar('/health')).status, 200);
    assert.equal((await chamar('/contas/saida', 'POST', {})).status, 200);
    assert.equal((await chamar('/leitura')).status, 401, 'Cookie revogado não pode ser reutilizado');
    assert.equal((await chamar('/leitura', 'GET', undefined, b.headers)).status, 200);
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(r => servidor.close(r)); }
    await banco.rollback(); banco.release(); await pool.end();
  }
});
