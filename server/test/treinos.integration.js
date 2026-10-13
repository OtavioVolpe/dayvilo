import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarPoolBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { prepararSessaoTeste } from './sessao-fixture.js';
import { criarServicoTreinos, validarFicha } from '../src/servicos/treinos.js';
import { criarServicoTarefas } from '../src/servicos/tarefas.js';
const modelo = { nome: 'A — Peito', exercicios: [{ nome: 'Supino', series: 3, repeticoes: '8–12', carga: 20, descanso: 60, observacao: 'Peso total' }] };

test('Desagendar filtra ficha, período e dias, preserva histórico e registros', async () => {
  const pool = criarPoolBanco(), banco = await pool.getConnection();
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Desagendar teste']);
    const [v] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outra conta']);
    const usuario = { id: u.insertId, fuso_horario: 'America/Sao_Paulo' }, outro = { ...usuario, id: v.insertId };
    const treino = criarServicoTreinos(banco), tarefas = criarServicoTarefas(banco);
    const { ficha } = await treino.salvarFicha(usuario, modelo);
    assert.equal((await treino.listar(usuario, { inicio: '2030-01-01', fim: '2030-01-31' })).sessoes.length, 0);
    const agenda = { ficha_id: ficha.id, inicio: '2030-01-01', fim: '2030-01-31', dias: [2, 3] };
    await assert.rejects(treino.agendar(usuario, { ...agenda, dias: [] }), { status: 400 });
    await treino.agendar(usuario, agenda);
    const lista = (await treino.listar(usuario, { inicio: agenda.inicio, fim: agenda.fim })).sessoes;
    const tercas = lista.filter(s => new Date(s.data_prevista + 'T12:00:00Z').getUTCDay() === 2);
    await tarefas.situacao(usuario, { situacao: 'concluida' }, tercas[0].tarefa_id);
    const s = (await treino.consultar(usuario, tercas[1].id)).sessao;
    s.realizado[0].series[0].carga = 0;
    await treino.registrar(usuario, s.id, { versao: s.versao, realizado: s.realizado, concluir: false });
    await tarefas.situacao(usuario, { situacao: 'pulada' }, tercas[2].tarefa_id);
    const selecao = { ...agenda, fim: '2030-01-29', dias: [2] };
    await assert.rejects(treino.desagendar(outro, selecao), { status: 404 });
    await assert.rejects(treino.desagendar(usuario, { ...selecao, dias: [] }), { status: 400 });
    assert.deepEqual(await treino.desagendar(usuario, selecao), { quantidade: tercas.length - 2, preservados: 2 });
    const restantes = (await treino.listar(usuario, { inicio: agenda.inicio, fim: agenda.fim })).sessoes;
    assert.deepEqual(restantes.map(s => s.id), lista.filter(s => !tercas.slice(2).some(t => t.id === s.id)).map(s => s.id));
    assert.equal((await treino.consultar(usuario, tercas[1].id)).sessao.realizado[0].series[0].carga, 0);
    assert.equal((await treino.listar(usuario, { inicio: agenda.inicio, fim: agenda.fim })).fichas.length, 1);
    await treino.agendar(usuario, { ...agenda, inicio: '2000-01-01', fim: '2000-01-01', dias: [6] });
    assert.deepEqual(await treino.desagendar(usuario, { ...agenda, inicio: '2000-01-01', fim: '2000-01-01', dias: [6] }), { quantidade: 0, preservados: 1 });
    const { ficha: outraFicha } = await treino.salvarFicha(usuario, { ...modelo, nome: 'Outra ficha' });
    await treino.agendar(usuario, { ...agenda, ficha_id: outraFicha.id });
    await assert.rejects(treino.excluirFicha(outro, ficha.id), { status: 404 });
    const excluida = await treino.excluirFicha(usuario, ficha.id);
    assert.equal(excluida.quantidade, restantes.length - 2);
    const aposExcluir = await treino.listar(usuario, { inicio: agenda.inicio, fim: agenda.fim });
    assert.deepEqual(aposExcluir.fichas.map(f => f.id), [outraFicha.id]);
    for (const t of tercas.slice(0, 2)) assert.equal((await treino.consultar(usuario, t.id)).sessao.id, t.id);
    assert.equal((await treino.consultar(usuario, tercas[1].id)).sessao.realizado[0].series[0].carga, 0);
    assert.equal((await treino.listar(usuario, { inicio: '2000-01-01', fim: '2000-01-01' })).sessoes.length, 1);
    assert.equal(aposExcluir.sessoes.length, lista.length + 2);
    const quartaRemovida = lista.find(s => !tercas.some(t => t.id === s.id));
    await assert.rejects(treino.consultar(usuario, quartaRemovida.id), { status: 404 });
    await assert.rejects(treino.agendar(usuario, agenda), { status: 404 });
  } finally { await banco.rollback(); banco.release(); await pool.end(); }
});

test('Treino: histórico imutável da ficha, execução opcional, integração, conflitos e isolamento', async () => {
  const pool = criarPoolBanco(), banco = await pool.getConnection();
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Treino teste']);
    const [v] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outro treino']);
    const usuario = { id: u.insertId, fuso_horario: 'America/Sao_Paulo' }, outro = { ...usuario, id: v.insertId };
    const treino = criarServicoTreinos(banco), tarefas = criarServicoTarefas(banco);
    const { ficha } = await treino.salvarFicha(usuario, modelo);
    const agenda = { ficha_id: ficha.id, inicio: '2030-01-07', fim: '2030-01-14', dias: [1] };
    assert.equal((await treino.agendar(usuario, agenda)).quantidade, 2);
    assert.equal((await treino.agendar(usuario, agenda)).quantidade, 0);
    await assert.rejects(treino.agendar(outro, agenda), { status: 404 });
    const lista = await treino.listar(usuario, { inicio: agenda.inicio, fim: agenda.fim });
    assert.equal(lista.sessoes.length, 2);
    assert.equal((await treino.listar(outro, { inicio: agenda.inicio, fim: agenda.fim })).sessoes.length, 0);
    const id = lista.sessoes[0].id;
    let { sessao } = await treino.consultar(usuario, id);
    assert.equal((await tarefas.listar(usuario, { data: agenda.inicio })).tarefas[0].treino_sessao_id, id);
    await treino.salvarFicha(usuario, { ...modelo, nome: 'B', versao: ficha.versao, exercicios: [{ ...modelo.exercicios[0], carga: 30 }] }, ficha.id);
    assert.equal((await treino.consultar(usuario, id)).sessao.planejado.exercicios[0].carga, 20);
    await assert.rejects(treino.salvarFicha(usuario, { ...modelo, versao: ficha.versao }, ficha.id), { status: 409 });
    await assert.rejects(treino.consultar(outro, id), { status: 404 });
    await assert.rejects(treino.excluirFicha(outro, ficha.id), { status: 404 });
    const registro = { versao: sessao.versao, realizado: sessao.realizado, concluir: false };
    await assert.rejects(treino.registrar(usuario, id, { ...registro, realizado: [] }), { status: 400 });
    const invalido = structuredClone(registro);
    invalido.realizado[0].series[0].carga = -1;
    await assert.rejects(treino.registrar(usuario, id, invalido), { status: 400 });
    assert.equal((await treino.consultar(usuario, id)).sessao.versao, sessao.versao);
    registro.realizado[0].series[0] = { carga: 22.5, repeticoes: 10, feita: true };
    await assert.rejects(treino.registrar(outro, id, registro), { status: 404 });
    const salvo = await treino.registrar(usuario, id, registro);
    assert.equal(salvo.sessao.realizado[0].series[0].carga, 22.5);
    assert.equal(salvo.sessao.realizado[0].series[1].carga, null);
    await assert.rejects(treino.registrar(usuario, id, registro), { status: 409 });
    const concluir = { ...registro, versao: salvo.sessao.versao, concluir: true };
    await treino.registrar(usuario, id, concluir);
    assert.equal((await tarefas.listar(usuario, { data: agenda.inicio })).tarefas[0].situacao, 'concluida');
    sessao = (await treino.consultar(usuario, id)).sessao;
    await assert.rejects(treino.registrar(usuario, id, { ...concluir, versao: sessao.versao }), { status: 409 });
    await tarefas.situacao(usuario, { situacao: 'pendente' }, sessao.tarefa_id);
    const reaberta = (await treino.consultar(usuario, id)).sessao;
    assert.equal(reaberta.situacao, 'pendente');
    assert.deepEqual(reaberta.realizado, sessao.realizado);
    assert.equal((await tarefas.listar(usuario, { data: agenda.inicio })).tarefas[0].situacao, 'pendente');
    await tarefas.situacao(usuario, { situacao: 'pulada' }, sessao.tarefa_id);
    await assert.rejects(treino.registrar(usuario, id, { ...concluir, versao: sessao.versao }), { status: 409 });
    await tarefas.situacao(usuario, { situacao: 'pendente' }, sessao.tarefa_id);
    await tarefas.reagendar(usuario, { data_prevista: '2030-01-08' }, sessao.tarefa_id);
    assert.equal((await treino.consultar(usuario, id)).sessao.data_prevista, '2030-01-08');
    await assert.rejects(treino.agendar(usuario, { ...agenda, fim: '2031-01-14' }), { status: 400 });
    const ultimoDia = '9999-12-31';
    assert.equal((await treino.agendar(usuario, { ...agenda, inicio: ultimoDia, fim: ultimoDia, dias: [new Date(ultimoDia + 'T12:00:00Z').getUTCDay()] })).quantidade, 1);
    await treino.excluirFicha(usuario, ficha.id);
    assert.equal((await treino.listar(usuario, { inicio: agenda.inicio, fim: agenda.fim })).fichas.length, 0);
    assert.equal((await treino.consultar(usuario, id)).sessao.realizado[0].series[0].repeticoes, 10);
    await assert.rejects(treino.agendar(usuario, agenda), { status: 404 });
    await tarefas.excluir(usuario, {}, sessao.tarefa_id);
    await assert.rejects(treino.consultar(usuario, id), { status: 404 });
  } finally { await banco.rollback(); banco.release(); await pool.end(); }
});

test('Treino: rotas exigem sessão e CSRF; validação rejeita entrada malformada', async () => {
  const pool = criarPoolBanco(), banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', ['HTTP treino']);
    const headers = await prepararSessaoTeste(banco, u.insertId);
    servidor = criarAplicacao({ banco }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    const url = `http://127.0.0.1:${servidor.address().port}/api/treinos`;
    assert.equal((await fetch(url + '?inicio=2030-01-01&fim=2030-01-07')).status, 401);
    assert.equal((await fetch(url + '/fichas', { method: 'POST', headers: { ...headers, 'X-CSRF-Token': '' }, body: JSON.stringify(modelo) })).status, 403);
    const criado = await fetch(url + '/fichas', { method: 'POST', headers, body: JSON.stringify(modelo) });
    assert.equal(criado.status, 201);
    assert.equal((await fetch(url + '?inicio=2030-01-01&fim=2031-01-01', { headers })).status, 400);
    for (const exercicio of [{ ...modelo.exercicios[0], series: 0 }, { ...modelo.exercicios[0], carga: -1 }, { ...modelo.exercicios[0], nome: '' }]) {
      assert.throws(() => validarFicha({ ...modelo, exercicios: [exercicio] }), { status: 400 });
    }
  } finally { if (servidor) await new Promise(r => servidor.close(r)); await banco.rollback(); banco.release(); await pool.end(); }
});
