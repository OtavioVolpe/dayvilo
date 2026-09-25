import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararRepeticao } from '../src/servicos/repeticao.js';
const tarefa = { titulo: 'Ler', data_prevista: '2024-02-28' };
test('repetição diária inclui limites e dia bissexto', () => {
  assert.deepEqual(prepararRepeticao({ tarefa, repeticao: { tipo: 'diaria', ate: '2024-03-01' } }).datas, ['2024-02-28','2024-02-29','2024-03-01']);
});
test('dias específicos atravessam o ano sem duplicar', () => {
  assert.deepEqual(prepararRepeticao({ tarefa: { ...tarefa, data_prevista: '2025-12-29' }, repeticao: { tipo: 'semanal', ate: '2026-01-04', dias: [1,3,0] } }).datas, ['2025-12-29','2025-12-31','2026-01-04']);
});
test('rejeita intervalos e dias inválidos antes de gravar', () => {
  for (const repeticao of [
    { tipo:'diaria', ate:'2024-02-27' }, { tipo:'diaria', ate:'2025-03-01' },
    { tipo:'semanal', ate:'2024-03-01', dias:[] }, { tipo:'semanal', ate:'2024-03-01', dias:[1,1] },
    { tipo:'semanal', ate:'2024-03-01', dias:[8] }, { tipo:'semanal', ate:'2024-02-28', dias:[0] },
    { tipo:'mensal', ate:'2024-03-01' }, { tipo:'diaria', ate:'2024-02-30' },
  ]) assert.throws(() => prepararRepeticao({ tarefa, repeticao }));
  assert.throws(() => prepararRepeticao({ tarefa: { ...tarefa, usuario_id: 1 }, repeticao: { tipo:'diaria', ate:'2024-03-01' } }));
});
