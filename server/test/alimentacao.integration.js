import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoAlimentacao } from '../src/servicos/alimentacao.js';
import { criarServicoTarefas } from '../src/servicos/tarefas.js';
import { criarRepositorioTarefas } from '../src/repositorios/tarefas.js';
import { ordenarTarefas } from '../src/servicos/ordenacao.js';
import { alterarSelecao } from '../src/servicos/selecao-tarefas.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';
import { criarAplicacao } from '../src/app.js';
import { prepararSessaoTeste } from './sessao-fixture.js';

async function fixture(fn) {
  if (!['127.0.0.1', 'localhost'].includes(process.env.MYSQL_HOST) || process.env.NODE_ENV === 'production') throw new Error('Use somente MySQL local para os testes de integração.');
  const pool = criarPoolBanco(), c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [a] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Alimentação teste']);
    const [b] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outra conta teste']);
    const u = { id: a.insertId, fuso_horario: 'America/Sao_Paulo' }, outro = { ...u, id: b.insertId };
    await fn(c, u, outro);
  } finally { await c.rollback(); c.release(); await pool.end(); }
}
const deslocar = (d, n) => { const v = new Date(d + 'T12:00:00Z'); v.setUTCDate(v.getUTCDate() + n); return v.toISOString().slice(0, 10); };
const dados = (data, extra = {}) => ({ titulo: 'Almoço', observacao: 'Arroz, feijão e frango', horario: '12:30', mostrar_rotina: false, data_prevista: data, ...extra });
const buscar = async (s, u, data, id) => (await s.listar(u, { data })).refeicoes.find(r => r.id === id);

test('Alimentação: visibilidade e sincronização bidirecional, revisão e ordenação', async () => fixture(async (c, u) => {
  const s = criarServicoAlimentacao(c), t = criarServicoTarefas(c), repo = criarRepositorioTarefas(c), hoje = obterDataHoje(u.fuso_horario);
  const { id } = await s.salvar(u, dados(hoje));
  let r = await buscar(s, u, hoje, id);
  assert.equal((await t.listar(u, { data: hoje })).tarefas.length, 0);
  assert.equal((await t.semana(u, { data: hoje })).tarefas.length, 0);
  const { tarefa: avulsa } = await t.criar(u, { titulo: 'Rotina', data_prevista: hoje });
  const { tarefa: segunda } = await t.criar(u, { titulo: 'Rotina 2', data_prevista: hoje });
  await ordenarTarefas(c, u.id, { data: hoje, ids: [segunda.id, avulsa.id], anteriores: [avulsa.id, segunda.id] });
  await s.salvar(u, { ...dados(hoje, { mostrar_rotina: true }), revisao: r.revisao }, id);
  r = await buscar(s, u, hoje, id);
  assert.equal((await t.listar(u, { data: hoje })).tarefas.find(v => v.refeicao_id === id).titulo, 'Almoço');
  await t.concluir(u, { concluida: true }, r.tarefa_id);
  assert.equal((await buscar(s, u, hoje, id)).situacao, 'concluida');
  await assert.rejects(s.anotar(u, id, { nota: 'Antiga', revisao: r.revisao }), { status: 409 });
  r = await buscar(s, u, hoje, id);
  await s.situacao(u, id, { situacao: 'pendente', revisao: r.revisao });
  assert.equal((await repo.buscar(u.id, r.tarefa_id)).situacao, 'pendente');
  await alterarSelecao(c, u.id, { data: hoje, acao: 'pular', tarefas: [{ id: r.tarefa_id, situacao: 'pendente' }] });
  assert.equal((await buscar(s, u, hoje, id)).situacao, 'pulada');
  await t.situacao(u, { situacao: 'pendente' }, r.tarefa_id);
  const amanha = deslocar(hoje, 1);
  await t.reagendar(u, { data_prevista: amanha }, r.tarefa_id);
  assert.equal((await s.listar(u, { data: hoje })).refeicoes.length, 0);
  r = await buscar(s, u, amanha, id);
  await s.anotar(u, id, { nota: 'Comi peixe', revisao: r.revisao });
  r = await buscar(s, u, amanha, id);
  assert.equal(r.observacao, 'Arroz, feijão e frango'); assert.equal(r.nota, 'Comi peixe');
  await t.excluir(u, {}, r.tarefa_id);
  assert.equal((await s.listar(u, { data: amanha })).refeicoes.length, 0);
}));

test('Alimentação: cópia revisada protege histórico e detecta lista alterada', async () => fixture(async (c, u) => {
  const s = criarServicoAlimentacao(c), hoje = obterDataHoje(u.fuso_horario), amanha = deslocar(hoje, 1);
  const a = await s.salvar(u, dados(hoje, { mostrar_rotina: true }));
  let r = await buscar(s, u, hoje, a.id);
  await s.anotar(u, a.id, { nota: 'Nota que não deve copiar', revisao: r.revisao });
  r = await buscar(s, u, hoje, a.id);
  await s.situacao(u, a.id, { situacao: 'concluida', revisao: r.revisao });
  const existente = await s.salvar(u, dados(amanha, { titulo: 'Já feita' }));
  r = await buscar(s, u, amanha, existente.id);
  await s.situacao(u, existente.id, { situacao: 'concluida', revisao: r.revisao });
  const pendente = await s.salvar(u, dados(amanha, { titulo: 'Substituir' }));
  const pedido = { origem: hoje, destinos: [amanha], modo: 'substituir' };
  let previa = await s.copiar(u, pedido);
  assert.equal(previa.resumo[0].remover, 1); assert.equal(previa.resumo[0].preservar, 1);
  r = await buscar(s, u, amanha, pendente.id);
  await s.anotar(u, r.id, { nota: 'Mudança concorrente', revisao: r.revisao });
  await assert.rejects(s.copiar(u, { ...pedido, confirmacao: previa.confirmacao }), { status: 409 });
  previa = await s.copiar(u, pedido);
  await s.copiar(u, { ...pedido, confirmacao: previa.confirmacao });
  const lista = (await s.listar(u, { data: amanha })).refeicoes;
  assert.equal(lista.length, 2); assert.equal(lista.find(v => v.id === existente.id).situacao, 'concluida');
  const nova = lista.find(v => v.id !== existente.id);
  assert.equal(nova.situacao, 'pendente'); assert.equal(nova.nota, ''); assert.equal(nova.mostrar_rotina, true);
  await assert.rejects(s.copiar(u, { ...pedido, confirmacao: previa.confirmacao }), { status: 409 });
}));

test('Alimentação: isolamento, exclusão e histórico sem prazo de expiração', async () => fixture(async (c, u, outro) => {
  const s = criarServicoAlimentacao(c), t = criarServicoTarefas(c), antiga = '2024-01-01';
  const { id } = await s.salvar(u, dados(antiga));
  const r = await buscar(s, u, antiga, id);
  assert.equal((await s.listar(outro, { data: antiga })).refeicoes.length, 0);
  await assert.rejects(s.salvar(outro, { ...dados(antiga), revisao: r.revisao }, id), { status: 404 });
  await assert.rejects(s.excluir(outro, id, { revisao: r.revisao }), { status: 404 });
  await assert.rejects(s.situacao(outro, id, { situacao: 'concluida', revisao: r.revisao }), { status: 404 });
  await assert.rejects(s.anotar(outro, id, { nota: '', revisao: r.revisao }), { status: 404 });
  assert.equal((await t.atrasadas(u)).tarefas.length, 0);
  assert.equal((await s.listar(u, { data: antiga, semanal: 'true' })).refeicoes[0].id, id);
  await s.excluir(u, id, { revisao: r.revisao });
  const [[total]] = await c.execute('SELECT COUNT(*) AS n FROM tarefas WHERE id = ?', [r.tarefa_id]);
  assert.equal(total.n, 0);
}));

test('Alimentação HTTP: sessão, CSRF, JSON e criação', async () => fixture(async (c, u) => {
  const headers = await prepararSessaoTeste(c, u.id), server = criarAplicacao({ banco: c }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/alimentacao`, body = JSON.stringify(dados('2030-01-01'));
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, 'X-CSRF-Token': '' }, body })).status, 403);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body })).status, 415);
    assert.equal((await fetch(url, { method: 'POST', headers, body })).status, 201);
    const resultado = await (await fetch(url + '?data=2030-01-01', { headers })).json();
    assert.equal(resultado.refeicoes.length, 1);
  } finally { await new Promise(r => server.close(r)); }
}));
