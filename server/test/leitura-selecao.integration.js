import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoLeitura } from '../src/servicos/leitura.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';
import { deslocarData } from '../../client/src/datas.js';

test('desagendar seleção de leitura isola livro e conta, preserva histórico e remove somente IDs escolhidos', async () => {
  if (!['localhost', '127.0.0.1'].includes(process.env.MYSQL_HOST)) throw new Error('Use banco descartável local.');
  const pool = criarPoolBanco(), c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [r] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Leitura seleção']);
    const [o] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outra conta']);
    const u = { id: r.insertId, fuso_horario: 'America/Sao_Paulo' }, outro = { ...u, id: o.insertId };
    const s = criarServicoLeitura(c), hoje = obterDataHoje(u.fuso_horario);
    const { id } = await s.salvar(u, { titulo: 'Livro teste', autor: '', estado: 'lendo' });
    let d = await s.detalhes(u, id);
    await s.agendar(u, id, { versao: d.livro.versao, inicio: hoje, fim: deslocarData(hoje, 4), dias: [0, 1, 2, 3, 4, 5, 6], horario: null });
    d = await s.detalhes(u, id);
    const ids = d.agendamentos.map(a => a.id);
    await c.execute("UPDATE tarefas SET situacao = 'concluida', concluida_em = CURRENT_TIMESTAMP WHERE id = ?", [ids[1]]);
    await c.execute("UPDATE tarefas SET situacao = 'pulada' WHERE id = ?", [ids[2]]);
    await c.execute('UPDATE tarefas SET data_prevista = ? WHERE id = ?', [deslocarData(hoje, -1), ids[3]]);
    const body = { versao: d.livro.versao, tarefas: ids.slice(0, 4) };
    await assert.rejects(s.agendar(outro, id, body, true), { status: 404 });
    await assert.rejects(s.agendar(u, id, { ...body, tarefas: [] }, true), { status: 400 });
    await assert.rejects(s.agendar(u, id, { ...body, tarefas: [ids[0], ids[0]] }, true), { status: 400 });
    const { id: outroLivro } = await s.salvar(u, { titulo: 'Outro livro', estado: 'lendo' });
    const outroDetalhe = await s.detalhes(u, outroLivro);
    await assert.rejects(s.agendar(u, outroLivro, { versao: outroDetalhe.livro.versao, tarefas: [ids[0]] }, true), { status: 409 });
    assert.deepEqual(await s.agendar(u, id, body, true), { quantidade: 1, preservados: 3 });
    const [restantes] = await c.execute('SELECT id FROM tarefas WHERE usuario_id = ? ORDER BY id', [u.id]);
    assert.deepEqual(restantes.map(t => t.id), ids.slice(1));
    await assert.rejects(s.agendar(u, id, body, true), { status: 409 });
  } finally { await c.rollback(); c.release(); await pool.end(); }
});

