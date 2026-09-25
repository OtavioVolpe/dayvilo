import test from 'node:test';
import assert from 'node:assert/strict';
import { obterSemana } from '../src/semana.js';

test('semana começa na segunda e inclui domingo', () => {
  const semana = obterSemana('2026-09-27');
  assert.equal(semana.inicio, '2026-09-21');
  assert.equal(semana.fim, '2026-09-27');
  assert.equal(semana.dias.length, 7);
});
test('semana atravessa ano e fevereiro bissexto', () => {
  assert.deepEqual(obterSemana('2026-01-01').dias, ['2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-03','2026-01-04']);
  assert.ok(obterSemana('2024-02-29').dias.includes('2024-03-03'));
  assert.throws(() => obterSemana('2026-02-30'));
  assert.throws(() => obterSemana('9999-12-31'));
});
