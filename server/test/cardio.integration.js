import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoTreinos } from '../src/servicos/treinos.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';

test('cardio: agenda mista, registros, conflitos, confirmação de perda e histórico após excluir', async () => {
  if (!['localhost', '127.0.0.1'].includes(process.env.MYSQL_HOST) || process.env.NODE_ENV === 'production') throw new Error('Use MySQL descartável local.');
  const pool = criarPoolBanco(), c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [a] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Cardio teste']);
    const [b] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outro cardio']);
    const usuario = { id: a.insertId, fuso_horario: 'America/Sao_Paulo' }, outro = { ...usuario, id: b.insertId };
    const servico = criarServicoTreinos(c), hoje = obterDataHoje(usuario.fuso_horario);
    const bike = { tipo: 'cardio', modalidade: 'bicicleta', nome: 'Bicicleta', duracao: 20, distancia: null, observacao: 'Nível 5' };
    const muscle = { nome: 'Supino', series: 1, repeticoes: '10', carga: null, descanso: null, observacao: '' };
    const { ficha } = await servico.salvarFicha(usuario, { nome: 'Misto', exercicios: [muscle, bike] });
    const agenda = { ficha_id: ficha.id, inicio: hoje, fim: hoje, dias: [0, 1, 2, 3, 4, 5, 6] };
    await servico.agendar(usuario, agenda);
    assert.equal((await servico.agendar(usuario, agenda)).quantidade, 0);
    const [item] = (await servico.listar(usuario, { inicio: hoje, fim: hoje })).sessoes;
    let { sessao } = await servico.consultar(usuario, item.id);
    assert.deepEqual(sessao.realizado[1], { duracao: null, distancia: null, feita: false, observacao: '' });
    const salvar = (realizado, versao = sessao.versao, concluir = false) => servico.registrar(usuario, sessao.id, { realizado, versao, concluir });
    for (const valores of [{ duracao: -1 }, { duracao: 1441 }, { distancia: '6' }, { feita: 1 }, { series: [] }]) {
      const dados = structuredClone(sessao.realizado); Object.assign(dados[1], valores);
      await assert.rejects(salvar(dados), { status: 400 });
    }
    sessao.realizado[1] = { duracao: 22, distancia: 6.2, feita: true, observacao: 'Confortável' };
    await assert.rejects(servico.registrar(outro, sessao.id, { versao: sessao.versao, realizado: sessao.realizado, concluir: false }), { status: 404 });
    await salvar(sessao.realizado);
    await assert.rejects(salvar(sessao.realizado), { status: 409 });
    assert.deepEqual(await servico.desagendar(usuario, agenda), { quantidade: 0, preservados: 1 });
    const mudanca = { nome: ficha.nome, exercicios: [muscle, { ...bike, modalidade: 'esteira' }], versao: ficha.versao, aplicar_hoje: true };
    const pendente = await servico.salvarFicha(usuario, mudanca, ficha.id);
    assert.ok(pendente.confirmacao.token);
    assert.equal((await servico.consultar(usuario, item.id)).sessao.realizado[1].duracao, 22);
    // Uma mudança só na meta não descarta o que já foi realizado.
    const mantida = await servico.salvarFicha(usuario, { ...mudanca, exercicios: [muscle, { ...bike, duracao: 30 }] }, ficha.id);
    assert.equal(mantida.atualizados, 1);
    sessao = (await servico.consultar(usuario, item.id)).sessao;
    assert.equal(sessao.realizado[1].distancia, 6.2);
    await salvar(sessao.realizado, sessao.versao, true);
    assert.equal((await servico.excluirFicha(usuario, ficha.id)).quantidade, 0);
    const historico = (await servico.consultar(usuario, item.id)).sessao;
    assert.equal(historico.situacao, 'concluida'); assert.equal(historico.realizado[1].duracao, 22);
    assert.equal(historico.planejado.exercicios[1].modalidade, 'bicicleta');
    // Também é possível agendar uma ficha composta somente por cardio.
    const { ficha: soCardio } = await servico.salvarFicha(usuario, { nome: 'Corrida', exercicios: [{ ...bike, modalidade: 'corrida', nome: 'Corrida de rua' }] });
    assert.equal((await servico.agendar(usuario, { ...agenda, ficha_id: soCardio.id })).quantidade, 1);
  } finally { await c.rollback(); c.release(); await pool.end(); }
});
