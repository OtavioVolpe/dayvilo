import test from 'node:test';
import assert from 'node:assert/strict';
import { destinosAlimentacao } from '../../client/src/destinos-alimentacao.js';

const origem = '2026-10-15', hoje = '2026-10-16';
const unica = { frequencia: 'unica', destino: '2026-10-20', dias: [] };
test('cópia única usa somente a data escolhida e ignora seleção anterior de repetição', () => {
  assert.deepEqual(destinosAlimentacao({ ...unica, inicio: hoje, fim: '2026-11-01', dias: [1, 3] }, origem, hoje), { destinos: ['2026-10-20'], erro: '' });
  for (const destino of ['', origem, '2026-02-30', '2027-10-17', 'abc']) assert.ok(destinosAlimentacao({ ...unica, destino }, origem, hoje).erro);
  assert.ok(destinosAlimentacao({ ...unica, destino: hoje }, hoje, hoje).erro);
  assert.equal(destinosAlimentacao({ ...unica, destino: '2027-10-16' }, origem, hoje).erro, '');
});
test('repetição inclui limites, ordena os dias escolhidos e exclui a origem', () => {
  const repetir = { frequencia: 'repetir', inicio: hoje, fim: '2026-10-23', dias: [5, 1] };
  assert.deepEqual(destinosAlimentacao(repetir, origem, hoje).destinos, ['2026-10-16', '2026-10-19', '2026-10-23']);
  assert.deepEqual(destinosAlimentacao(repetir, hoje, hoje).destinos, ['2026-10-19', '2026-10-23']);
  for (const ajuste of [{ dias: [] }, { inicio: '2026-10-25' }, { fim: '' }, { inicio: hoje, fim: hoje, dias: [1] }]) assert.ok(destinosAlimentacao({ ...repetir, ...ajuste }, origem, hoje).erro);
});
test('repetição atravessa mês, ano e ano bissexto sem deslocar dias', () => {
  const f = { frequencia: 'repetir', inicio: '2028-02-28', fim: '2028-03-01', dias: [0, 1, 2, 3, 4, 5, 6] };
  assert.deepEqual(destinosAlimentacao(f, '2028-02-27', '2028-02-28').destinos, ['2028-02-28', '2028-02-29', '2028-03-01']);
  assert.deepEqual(destinosAlimentacao({ ...f, inicio: '2026-12-31', fim: '2027-01-01' }, origem, hoje).destinos, ['2026-12-31', '2027-01-01']);
});
test('limites existentes de 31 dias e 500 refeições impedem revisão inválida', () => {
  const f = { frequencia: 'repetir', inicio: hoje, fim: '2026-11-15', dias: [0, 1, 2, 3, 4, 5, 6] };
  assert.equal(destinosAlimentacao(f, origem, hoje, 4).destinos.length, 31);
  assert.ok(destinosAlimentacao({ ...f, fim: '2026-11-16' }, origem, hoje).erro.includes('31'));
  assert.ok(destinosAlimentacao(f, origem, hoje, 17).erro.includes('500'));
});
