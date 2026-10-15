import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoTreinos } from '../src/servicos/treinos.js';

test('referência usa somente registros anteriores da própria ficha/conta, ignora pulados e futuros', async () => {
  if (!['localhost', '127.0.0.1'].includes(process.env.MYSQL_HOST) || process.env.NODE_ENV === 'production') throw new Error('Use banco descartável local.');
  const pool = criarPoolBanco(), c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [a] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Referência teste']);
    const [b] = await c.execute('INSERT INTO usuarios(nome) VALUES (?)', ['Outra conta']);
    const u = { id: a.insertId, fuso_horario: 'America/Sao_Paulo' }, outro = { ...u, id: b.insertId };
    const s = criarServicoTreinos(c);
    const modelo = { nome: 'A', exercicios: [{ nome: 'Supino', series: 2, repeticoes: '8–12', carga: null, descanso: null, observacao: '' }] };
    const { ficha } = await s.salvarFicha(u, modelo);
    const { ficha: diferente } = await s.salvarFicha(u, modelo);
    const { ficha: alheia } = await s.salvarFicha(outro, modelo);
    async function criar(usuario, f, data, carga) {
      await s.agendar(usuario, { ficha_id: f.id, inicio: data, fim: data, dias: [new Date(data + 'T12:00:00Z').getUTCDay()] });
      const [t] = (await s.listar(usuario, { inicio: data, fim: data })).sessoes.filter(t => t.titulo === 'Treino — A');
      // A data é exclusiva em cada cenário abaixo.
      const { sessao } = await s.consultar(usuario, t.id);
      if (carga !== null) { sessao.realizado[0].series[0] = { carga, repeticoes: 12, feita: true }; await s.registrar(usuario, t.id, { versao: sessao.versao, realizado: sessao.realizado, concluir: false }); }
      return sessao;
    }
    const antigo = await criar(u, ficha, '2020-01-01', 20);
    await criar(u, diferente, '2020-01-02', 90);
    await criar(outro, alheia, '2020-01-03', 100);
    const pulado = await criar(u, ficha, '2020-01-04', 30);
    await c.execute("UPDATE tarefas SET situacao = 'pulada' WHERE id = ?", [pulado.tarefa_id]);
    const atual = await criar(u, ficha, '2020-01-05', null);
    await criar(u, ficha, '2020-01-06', 40);
    assert.deepEqual((await s.consultar(u, atual.id)).sessao.referencias[0], { data: '2020-01-01', series: [{ carga: 20, repeticoes: 12 }, { carga: null, repeticoes: null }] });
    assert.deepEqual((await s.consultar(u, antigo.id)).sessao.referencias, [null]);
    await assert.rejects(s.consultar(outro, atual.id), { status: 404 });
    await criar(u, ficha, '2099-01-01', 300);
    const futura = await criar(u, ficha, '2099-01-02', null);
    assert.equal((await s.consultar(u, futura.id)).sessao.referencias[0].data, '2020-01-06');
  } finally { await c.rollback(); c.release(); await pool.end(); }
});
