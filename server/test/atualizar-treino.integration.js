import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoTreinos } from '../src/servicos/treinos.js';
import { adaptarRegistro } from '../src/servicos/atualizar-treino.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';
const exercicio = nome => ({ nome, series: 3, repeticoes: '8–12', carga: null, descanso: null, observacao: '' });
const deslocar = (data, n) => { const d = new Date(data + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

test('adaptação preserva registros após reordenação e detecta remoção de séries, notas e nomes ambíguos', () => {
  const plano = { exercicios: [exercicio('Supino'), exercicio('Remada')] };
  const registro = plano.exercicios.map(() => ({ observacao: 'Nota', series: [{ carga: 0, repeticoes: 12, feita: true }, { carga: null, repeticoes: null, feita: false }, { carga: 20, repeticoes: 8, feita: false }] }));
  const r = adaptarRegistro(plano, registro, [exercicio('Remada'), exercicio('Supino')]);
  assert.deepEqual(r.registros, [registro[1], registro[0]]); assert.deepEqual(r.perdas, []);
  assert.deepEqual(adaptarRegistro(plano, registro, [{ ...exercicio('Supino'), series: 2 }]).perdas, ['Supino', 'Remada']);
  assert.deepEqual(adaptarRegistro(plano, registro, [exercicio('Supino'), exercicio('Supino')]).perdas, ['Supino', 'Remada']);
});

test('edição atualiza apenas alvos autorizados; perda exige confirmação atual e versões impedem sobrescrita', async () => {
  if (!['localhost', '127.0.0.1'].includes(process.env.MYSQL_HOST) || process.env.NODE_ENV === 'production') throw new Error('Use MySQL descartável local.');
  const pool = criarPoolBanco(), c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [a] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Atualização teste']);
    const [b] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outra conta']);
    const u = { id: a.insertId, fuso_horario: 'America/Sao_Paulo' }, outro = { ...u, id: b.insertId };
    const s = criarServicoTreinos(c), hoje = obterDataHoje(u.fuso_horario);
    const original = { nome: 'A', exercicios: [exercicio('Supino'), exercicio('Remada')] };
    const { ficha } = await s.salvarFicha(u, original);
    await s.agendar(u, { ficha_id: ficha.id, inicio: deslocar(hoje, -1), fim: deslocar(hoje, 4), dias: [0, 1, 2, 3, 4, 5, 6] });
    const lista = (await s.listar(u, { inicio: deslocar(hoje, -1), fim: deslocar(hoje, 4) })).sessoes;
    async function obter(i) { return (await s.consultar(u, lista[i].id)).sessao; }
    const atual = await obter(1), futuroComRegistro = await obter(3);
    for (const sessao of [atual, futuroComRegistro]) {
      sessao.realizado[0].series[0] = { carga: 22, repeticoes: 10, feita: true };
      sessao.realizado[1].observacao = 'Manter esta nota';
      await s.registrar(u, sessao.id, { versao: sessao.versao, realizado: sessao.realizado, concluir: false });
    }
    await c.execute("UPDATE tarefas SET situacao = 'concluida', concluida_em = CURRENT_TIMESTAMP WHERE id = ?", [lista[4].tarefa_id]);
    await c.execute("UPDATE tarefas SET situacao = 'pulada' WHERE id = ?", [lista[5].tarefa_id]);
    const alteracao = { nome: 'A atualizado', exercicios: [exercicio('Remada'), exercicio('Supino'), exercicio('Novo')], versao: ficha.versao, atualizar_proximos: true, aplicar_hoje: true };
    await assert.rejects(s.salvarFicha(outro, alteracao, ficha.id), { status: 404 });
    const r = await s.salvarFicha(u, alteracao, ficha.id);
    assert.equal(r.atualizados, 2);
    const hojeAtualizado = await obter(1);
    assert.equal(hojeAtualizado.realizado[1].series[0].carga, 22);
    assert.equal(hojeAtualizado.realizado[0].observacao, 'Manter esta nota');
    assert.equal((await obter(2)).planejado.nome, 'A atualizado');
    for (const i of [0, 3, 4, 5]) assert.equal((await obter(i)).planejado.nome, 'A');
    await assert.rejects(s.registrar(u, atual.id, { versao: atual.versao + 1, realizado: atual.realizado, concluir: false }), { status: 409 });
    const remover = { ...alteracao, versao: r.ficha.versao, exercicios: [exercicio('Novo')], atualizar_proximos: false };
    const previa = await s.salvarFicha(u, remover, ficha.id);
    assert.ok(previa.confirmacao.token); assert.match(previa.confirmacao.mensagem, /Supino/);
    assert.equal((await obter(1)).planejado.exercicios.length, 3);
    assert.equal((await s.listar(u, { inicio: hoje, fim: hoje })).fichas[0].versao, r.ficha.versao);
    hojeAtualizado.realizado[1].series[0].carga = 24;
    await s.registrar(u, hojeAtualizado.id, { versao: hojeAtualizado.versao, realizado: hojeAtualizado.realizado, concluir: false });
    const novaPrevia = await s.salvarFicha(u, { ...remover, confirmacao: previa.confirmacao.token }, ficha.id);
    assert.notEqual(novaPrevia.confirmacao.token, previa.confirmacao.token);
    const salvo = await s.salvarFicha(u, { ...remover, confirmacao: novaPrevia.confirmacao.token }, ficha.id);
    assert.equal(salvo.atualizados, 1);
    assert.equal((await obter(1)).planejado.exercicios.length, 1);
    assert.equal((await obter(2)).planejado.exercicios.length, 3);
  } finally { await c.rollback(); c.release(); await pool.end(); }
});
