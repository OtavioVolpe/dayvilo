import test from 'node:test';
import assert from 'node:assert/strict';
import { validarPeriodoHistorico } from '../src/historico.js';

test('histórico usa últimos 30 dias incluindo hoje e aceita ano bissexto', () => {
  assert.deepEqual(validarPeriodoHistorico(undefined, undefined, '2026-01-10'), { inicio: '2025-12-12', fim: '2026-01-10' });
  assert.deepEqual(validarPeriodoHistorico('2024-01-01', '2024-12-31', '2026-09-24'), { inicio: '2024-01-01', fim: '2024-12-31' });
});
test('histórico rejeita intervalo invertido, futuro, incompleto ou excessivo', () => {
  for (const [inicio, fim] of [['2026-09-24','2026-09-23'], ['2026-09-01','2026-09-25'], ['2024-01-01','2025-01-01'], ['2026-02-30','2026-03-01'], [undefined,'2026-09-24']]) {
    assert.throws(() => validarPeriodoHistorico(inicio, fim, '2026-09-24'));
  }
});
