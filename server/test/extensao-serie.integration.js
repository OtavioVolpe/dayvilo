import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoTarefas } from '../src/servicos/tarefas.js';
import { criarRepositorioTarefas } from '../src/repositorios/tarefas.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';

test('retoma série concluída, confere sem criar, preserva histórico, evita duplicação e isola contas', async () => {
  const pool = criarPoolBanco(), banco = await pool.getConnection();
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Extensão teste']);
    const usuario = { id: u.insertId, fuso_horario: 'America/Sao_Paulo' };
    const hoje = obterDataHoje(usuario.fuso_horario);
    const dia = n => { const d = new Date(hoje + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const servico = criarServicoTarefas(banco), repo = criarRepositorioTarefas(banco);
    const { tarefa } = await servico.repetir(usuario, { tarefa: { titulo: 'Lavar louça', area: 'casa', ambiente: 'Cozinha', data_prevista: dia(-3), horario: '08:00' }, repeticao: { tipo: 'diaria', ate: dia(-1) } });
    const historico = await repo.listarPeriodo(usuario.id, dia(-3), dia(-1));
    for (const t of historico) await repo.definirSituacao(usuario.id, t.id, 'concluida');
    const [antes] = await banco.execute('SELECT * FROM tarefas WHERE usuario_id=? ORDER BY id', [usuario.id]);
    // Uma ocorrência movida para o futuro não deve ser duplicada pela extensão.
    await repo.reagendar(usuario.id, historico[1].id, dia(1));
    const entrada = { inicio: hoje, ate: dia(3), tipo: 'diaria', horario: '09:00', horario_final: null, previa: true, termino_anterior: dia(-1) };
    assert.equal((await servico.estenderSerie(usuario, entrada, tarefa.id)).quantidade, 3);
    assert.equal((await repo.listarPeriodo(usuario.id, dia(-3), dia(3))).length, 3);
    assert.equal((await servico.estenderSerie(usuario, { ...entrada, previa: false }, tarefa.id)).criadas, 3);
    const lista = await repo.listarPeriodo(usuario.id, dia(-3), dia(3));
    assert.equal(lista.length, 6);
    assert.equal(lista.filter(t => t.data_prevista === dia(1)).length, 1);
    assert.ok(lista.filter(t => !historico.some(h => h.id === t.id)).every(t => t.serie_id === tarefa.serie_id && t.horario === '09:00' && t.area === 'casa' && t.ambiente === 'Cozinha' && t.situacao === 'pendente'));
    const [depois] = await banco.execute('SELECT * FROM tarefas WHERE id IN (?,?) ORDER BY id', [historico[0].id, historico[2].id]);
    assert.deepEqual(depois, antes.filter(t => t.id !== historico[1].id));
    await assert.rejects(servico.estenderSerie(usuario, { ...entrada, previa: false }, tarefa.id), e => e.status === 409);
    await assert.rejects(servico.estenderSerie(usuario, { ...entrada, termino_anterior: dia(3), inicio: dia(-1) }, tarefa.id), e => e.status === 400);
    await assert.rejects(servico.estenderSerie(usuario, { ...entrada, termino_anterior: dia(3), inicio: dia(4), ate: dia(400) }, tarefa.id), e => e.status === 400);
    const [outra] = await banco.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outra conta']);
    await assert.rejects(servico.estenderSerie({ ...usuario, id: outra.insertId }, entrada, tarefa.id), e => e.status === 404);
    // Encerrar e retomar a partir de uma ocorrência histórica mantém a mesma série.
    const pendente = lista.find(t => t.situacao === 'pendente');
    await servico.encerrarSerie(usuario, {}, pendente.id);
    const regra = await servico.consultarSerie(usuario, {}, tarefa.id);
    assert.equal((await servico.estenderSerie(usuario, { ...entrada, termino_anterior: regra.ate, previa: false }, tarefa.id)).criadas, 3);
  } finally { await banco.rollback(); banco.release(); await pool.end(); }
});
