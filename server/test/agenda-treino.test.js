import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararAgendaTreino } from '../../client/src/agenda-treino.js';

test('treino único ignora período e dias remanescentes da repetição', () => {
  const resultado = prepararAgendaTreino({ ficha_id: 7, frequencia: 'unica', inicio: '2026-10-25', fim: '2026-11-30', dias: [1, 3] });
  assert.deepEqual(resultado.selecao, { ficha_id: 7, inicio: '2026-10-25', fim: '2026-10-25', dias: [0] });
  assert.equal(resultado.quantidade, 1);
});

test('repetição inclui somente os dias escolhidos dentro dos limites', () => {
  const resultado = prepararAgendaTreino({ ficha_id: 7, frequencia: 'semanal', inicio: '2026-10-26', fim: '2026-11-02', dias: [1, 4] });
  assert.equal(resultado.quantidade, 3);
  assert.deepEqual(Object.keys(resultado.selecao).sort(), ['dias', 'ficha_id', 'fim', 'inicio']);
});

test('bloqueia seleção vazia, datas inválidas e períodos sem ocorrências', () => {
  const base = { ficha_id: 7, frequencia: 'semanal', inicio: '2026-10-26', fim: '2026-10-27', dias: [4] };
  for (const ajuste of [{}, { dias: [] }, { inicio: '' }, { inicio: '2026-02-30' }, { fim: '2026-10-25' }, { fim: '2028-01-01' }]) {
    assert.ok(prepararAgendaTreino({ ...base, ...ajuste }).erro);
  }
});

test('conta corretamente a repetição atravessando o dia bissexto', () => {
  const resultado = prepararAgendaTreino({ ficha_id: 7, frequencia: 'semanal', inicio: '2028-02-28', fim: '2028-03-01', dias: [1, 2, 3] });
  assert.equal(resultado.quantidade, 3);
});
