import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoLeitura, validarLivro, validarAgenda } from '../src/servicos/leitura.js';
import { criarRepositorioTarefas } from '../src/repositorios/tarefas.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';
import { criarAplicacao } from '../src/app.js';
import { prepararSessaoTeste } from './sessao-fixture.js';

async function fixture(fn) {
  if (!['127.0.0.1', 'localhost'].includes(process.env.MYSQL_HOST) || process.env.NODE_ENV === 'production') throw new Error('Use somente MySQL descartável local.');
  const pool = criarPoolBanco(), c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [a] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Leitura teste']);
    const [b] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outra estante']);
    const u = { id: a.insertId, fuso_horario: 'America/Sao_Paulo' };
    await fn(c, u, { ...u, id: b.insertId });
  } finally { await c.rollback(); c.release(); await pool.end(); }
}
const dados = (extra = {}) => ({ titulo: 'O livro de teste', autor: 'Autora', estado: 'quero_ler', total_paginas: null, pagina_atual: null, inicio: null, termino: null, ...extra });
const editar = (l, extra = {}) => dados({ titulo: l.titulo, autor: l.autor, estado: l.estado, total_paginas: l.total_paginas, pagina_atual: l.pagina_atual, inicio: l.inicio, termino: l.termino, versao: l.versao, ...extra });
const deslocar = (d, n) => { const v = new Date(d + 'T12:00:00Z'); v.setUTCDate(v.getUTCDate() + n); return v.toISOString().slice(0, 10); };
const agenda = (hoje, versao, extra = {}) => ({ inicio: hoje, fim: deslocar(hoje, 6), dias: [0, 1, 2, 3, 4, 5, 6], horario: '20:00', versao, ...extra });

test('Leitura: valida páginas opcionais, datas e seleção explícita da semana', () => {
  assert.doesNotThrow(() => validarLivro(dados(), '2026-10-14'));
  assert.throws(() => validarLivro(dados({ pagina_atual: 100, total_paginas: 90 }), '2026-10-14'), /ultrapassar/);
  assert.throws(() => validarLivro(dados({ total_paginas: 0 }), '2026-10-14'), /páginas/);
  assert.throws(() => validarLivro(dados({ pagina_atual: 2.5 }), '2026-10-14'), /páginas/);
  assert.throws(() => validarLivro(dados({ inicio: '2026-10-15' }), '2026-10-14'), /datas/);
  assert.throws(() => validarLivro(dados({ estado: 'lido', inicio: '2026-10-12', termino: '2026-10-10' }), '2026-10-14'), /datas/);
  assert.throws(() => validarAgenda(agenda('2026-10-14', 1, { dias: [] }), '2026-10-14'), /dias/);
  assert.throws(() => validarAgenda(agenda('2026-10-14', 1, { fim: '2028-10-14' }), '2026-10-14'), /período/);
  assert.throws(() => validarAgenda(agenda('2026-10-14', 1, { inicio: '2026-10-13' }), '2026-10-14'), /período/);
});

test('Leitura: nova ficha não agenda; conclusão diária não muda páginas; isolamento e conflitos', async () => fixture(async (c, u, outro) => {
  const s = criarServicoLeitura(c), r = criarRepositorioTarefas(c), hoje = obterDataHoje(u.fuso_horario);
  const { id } = await s.salvar(u, dados());
  assert.equal((await r.listar(u.id, hoje)).length, 0);
  assert.equal((await s.listar(outro)).livros.length, 0);
  await assert.rejects(s.detalhes(outro, id), { status: 404 });
  await assert.rejects(s.salvar(outro, dados({ versao: 1 }), id), { status: 404 });
  await assert.rejects(s.excluir(outro, id, { versao: 1 }), { status: 404 });
  await assert.rejects(s.agendar(u, id, agenda(hoje, 1)), /Lendo/);
  let l = (await s.detalhes(u, id)).livro;
  await s.salvar(u, editar(l, { estado: 'lendo', total_paginas: 200, pagina_atual: 20 }), id);
  l = (await s.detalhes(u, id)).livro;
  assert.equal(l.inicio, hoje);
  assert.equal((await s.agendar(u, id, agenda(hoje, l.versao))).quantidade, 7);
  await assert.rejects(s.salvar(u, editar(l, { pagina_atual: 25 }), id), { status: 409 });
  l = (await s.detalhes(u, id)).livro;
  assert.equal((await s.agendar(u, id, agenda(hoje, l.versao))).quantidade, 0);
  const [t] = await r.listar(u.id, hoje);
  assert.equal(t.livro_id, id); assert.equal(t.leitura, 1);
  await r.definirSituacao(u.id, t.id, 'concluida');
  l = (await s.detalhes(u, id)).livro;
  assert.equal(l.pagina_atual, 20); assert.equal(l.estado, 'lendo');
  await s.agendar(u, id, agenda(hoje, l.versao), true);
  assert.equal((await s.detalhes(u, id)).agendamentos.length, 1);
  assert.equal((await r.buscar(u.id, t.id)).situacao, 'concluida');
}));

test('Leitura: anotações revisadas, finalização opcional, reabertura e exclusão preservam histórico', async () => fixture(async (c, u, outro) => {
  const s = criarServicoLeitura(c), r = criarRepositorioTarefas(c), hoje = obterDataHoje(u.fuso_horario);
  const { id } = await s.salvar(u, dados({ estado: 'lendo' }));
  await s.anotar(u, id, { versao: 1, texto: 'Trecho\ncom quebras', pagina: 12 });
  let d = await s.detalhes(u, id);
  assert.equal(d.notas[0].pagina, 12);
  await assert.rejects(s.anotar(u, id, { versao: 1, texto: 'Conflito' }), { status: 409 });
  await assert.rejects(s.anotar(outro, id, { versao: d.livro.versao, texto: 'Invasão' }), { status: 404 });
  await s.anotar(u, id, { versao: d.livro.versao, nota_id: d.notas[0].id, texto: 'Revisado', pagina: null });
  d = await s.detalhes(u, id);
  assert.equal(d.notas[0].texto, 'Revisado');
  await s.agendar(u, id, agenda(hoje, d.livro.versao));
  let l = (await s.detalhes(u, id)).livro;
  const [historico] = await r.listar(u.id, hoje);
  await r.reagendar(u.id, historico.id, deslocar(hoje, -365));
  await s.salvar(u, editar(l, { estado: 'lido', encerrar_agendamentos: false }), id);
  d = await s.detalhes(u, id); assert.equal(d.livro.termino, hoje); assert.equal(d.agendamentos.length, 6);
  await s.salvar(u, editar(d.livro, { encerrar_agendamentos: true }), id);
  d = await s.detalhes(u, id); assert.equal(d.agendamentos.length, 0);
  assert.ok(await r.buscar(u.id, historico.id));
  await s.salvar(u, editar(d.livro, { estado: 'lendo' }), id);
  l = (await s.detalhes(u, id)).livro; assert.equal(l.termino, null);
  await s.agendar(u, id, agenda(hoje, l.versao));
  l = (await s.detalhes(u, id)).livro;
  await s.excluir(u, id, { versao: l.versao });
  assert.equal((await s.listar(u)).livros.length, 0);
  const preservado = await r.buscar(u.id, historico.id);
  assert.equal(preservado.livro_id, null); assert.equal(preservado.leitura, 1);
  assert.equal((await r.listar(u.id, hoje)).length, 0);
  const [[{ n }]] = await c.execute('SELECT COUNT(*) AS n FROM notas_leitura WHERE livro_id = ?', [id]); assert.equal(n, 0);
}));

test('Leitura: rotas exigem sessão, CSRF, JSON e limitam acesso à própria estante', async () => fixture(async (c, u, outro) => {
  const app = criarAplicacao({ banco: c });
  const servidor = app.listen(0, '127.0.0.1'); await once(servidor, 'listening');
  try {
    const url = `http://127.0.0.1:${servidor.address().port}/api/leitura`;
    assert.equal((await fetch(url)).status, 401);
    const headers = await prepararSessaoTeste(c, u.id);
    const { id } = await criarServicoLeitura(c).salvar(outro, dados());
    assert.equal((await fetch(`${url}/${id}`, { headers })).status, 404);
    assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados()) })).status, 403);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, 'X-CSRF-Token': 'invalido' }, body: JSON.stringify(dados()) })).status, 403);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
    const resposta = await fetch(url, { method: 'POST', headers, body: JSON.stringify(dados()) });
    assert.equal(resposta.status, 201);
    const criado = await resposta.json(); assert.ok(criado.id);
  } finally { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
}));
