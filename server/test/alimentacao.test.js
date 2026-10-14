import test from 'node:test';
import assert from 'node:assert/strict';
import { validarRefeicao, validarCopia } from '../src/servicos/alimentacao.js';

const base = { titulo: ' Almoço ', observacao: ' Arroz e feijão ', data_prevista: '2030-01-01', horario: null, mostrar_rotina: false };
test('Alimentação: valida planejamento, data, horário e opção da Rotina', () => {
  assert.equal(validarRefeicao(base).titulo, 'Almoço');
  for (const v of [{ observacao: '' }, { titulo: '' }, { data_prevista: '2030-02-30' }, { horario: '25:00' }, { mostrar_rotina: 'false' }, { usuario_id: 2 }]) assert.throws(() => validarRefeicao({ ...base, ...v }), { status: 400 });
});
test('Alimentação: cópia exige dias explícitos, únicos, futuros e limitados', () => {
  const d = { origem: '2030-01-01', destinos: ['2030-01-03', '2030-01-02'], modo: 'adicionar' };
  assert.deepEqual(validarCopia(d, '2030-01-01').destinos, ['2030-01-02', '2030-01-03']);
  for (const destinos of [[], ['2030-01-01'], ['2029-12-31'], ['2030-01-02', '2030-01-02'], ['2032-01-01']]) assert.throws(() => validarCopia({ ...d, destinos }, '2030-01-01'), { status: 400 });
  assert.throws(() => validarCopia({ ...d, modo: 'apagar' }, '2030-01-01'), { status: 400 });
});
