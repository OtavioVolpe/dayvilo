import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoTarefas } from '../src/servicos/tarefas.js';
import { criarRepositorioTarefas } from '../src/repositorios/tarefas.js';

test('Casa compartilha tarefas com Rotina, preserva ambiente e isola contas', async () => {
  const pool = criarPoolBanco(); const banco = await pool.getConnection();
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Teste Casa']);
    const [v] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Outro Casa']);
    const usuario = { id: u.insertId, fuso_horario: 'America/Sao_Paulo' };
    const outro = { ...usuario, id: v.insertId };
    const servico = criarServicoTarefas(banco); const repo = criarRepositorioTarefas(banco);
    const criado = await servico.repetir(usuario, { tarefa: { titulo: 'Janelas', area: 'casa', ambiente: 'Sala', data_prevista: '2030-01-31' }, repeticao: { tipo: 'mensal', ate: '2030-02-28' } });
    assert.equal(criado.quantidade, 2);
    const primeiro = criado.tarefa;
    assert.equal((await servico.listar(usuario, { data: '2030-01-31' })).tarefas[0].id, primeiro.id);
    assert.equal((await servico.semana(outro, { data: '2030-01-31' })).tarefas.length, 0);
    await assert.rejects(servico.concluir(outro, { concluida: true }, primeiro.id), { status: 404 });
    await servico.concluir(usuario, { concluida: true }, primeiro.id);
    assert.equal((await repo.buscar(usuario.id, primeiro.id)).situacao, 'concluida');
    await assert.rejects(servico.editar(usuario, { titulo: 'Não editar' }, primeiro.id), { status: 409 });
    const fevereiro = (await repo.listar(usuario.id, '2030-02-28'))[0];
    await servico.editar(usuario, { titulo: 'Limpar janelas' }, fevereiro.id);
    assert.equal((await repo.buscar(usuario.id, fevereiro.id)).ambiente, 'Sala');
    await servico.editarSerie(usuario, { titulo: 'Limpar janelas', area: 'casa', ambiente: 'Quarto', ate: '2030-04-30' }, fevereiro.id);
    const lista = await repo.listarPeriodo(usuario.id, '2030-01-01', '2030-04-30');
    assert.deepEqual(lista.map(t => t.data_prevista), ['2030-01-31','2030-02-28','2030-03-31','2030-04-30']);
    assert.deepEqual(lista.map(t => t.ambiente), ['Sala','Quarto','Quarto','Quarto']);
    assert.ok(lista.every(t => t.area === 'casa'));
    await assert.rejects(servico.editar(usuario, { titulo: 'Mudar área', area: 'rotina' }, fevereiro.id), { status: 400 });
    await servico.situacao(usuario, { situacao: 'pulada' }, fevereiro.id);
    await assert.rejects(servico.editarSerie(usuario, { titulo: 'Não' }, fevereiro.id), { status: 409 });
    await servico.situacao(usuario, { situacao: 'pendente' }, fevereiro.id);
    await servico.encerrarSerie(usuario, {}, fevereiro.id);
    assert.equal((await repo.listarPeriodo(usuario.id, '2030-01-01', '2030-04-30')).length, 1);
    await assert.rejects(servico.criar(usuario, { titulo: 'Sem ambiente', area: 'casa' }), { status: 400 });
  } finally { await banco.rollback(); banco.release(); await pool.end(); }
});


test('ordenação de Casa preserva posições de Rotina e rejeita lista desatualizada', async () => {
  const pool = criarPoolBanco(); const banco = await pool.getConnection();
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Ordem Casa']);
    const servico = criarServicoTarefas(banco); const repo = criarRepositorioTarefas(banco);
    const usuario = { id: u.insertId, fuso_horario: 'America/Sao_Paulo' };
    const data = '2030-01-15';
    for (const situacao of ['pendente', 'pulada', 'concluida']) {
      const criar = async (titulo, casa) => {
        const t = await repo.criar(usuario.id, { titulo, data_prevista: data, horario: null, observacao: null, prioridade: false, ...(casa ? { area: 'casa', ambiente: 'Sala' } : {}) });
        if (situacao !== 'pendente') await repo.definirSituacao(usuario.id, t.id, situacao);
        return t.id;
      };
      const a = await criar('Casa A', true), r = await criar('Rotina', false), b = await criar('Casa B', true);
      const entrada = { data, situacao, area: 'casa', anteriores: [a, b], ids: [b, a] };
      await servico.ordenar(usuario, entrada);
      assert.deepEqual((await repo.listar(usuario.id, data)).filter(t => t.situacao === situacao).map(t => t.id), [b, r, a]);
      await assert.rejects(servico.ordenar(usuario, entrada), { status: 409 });
      await assert.rejects(servico.ordenar(usuario, { ...entrada, anteriores: [b, r], ids: [r, b] }), { status: 409 });
    }
  } finally { await banco.rollback(); banco.release(); await pool.end(); }
});
