import test from 'node:test';
import assert from 'node:assert/strict';
import { validarFicha } from '../src/servicos/treinos.js';
import { registroVazio, registroPreenchido } from '../src/servicos/registro-treino.js';
import { adaptarRegistro } from '../src/servicos/atualizar-treino.js';
import { encontrarReferencias } from '../src/servicos/referencia-treino.js';
import { copiarReferenciaCardio } from '../../client/src/copiar-referencia-treino.js';

const bike = { tipo: 'cardio', modalidade: 'bicicleta', nome: 'Bicicleta', duracao: 20, distancia: null, observacao: '' };
const muscle = { nome: 'Supino', series: 3, repeticoes: '8–12', carga: null, descanso: null, observacao: '' };
test('cardio aceita somente nome, valida limites e mantém compatibilidade com modalidade antiga', () => {
  assert.deepEqual(validarFicha({ nome: 'Misto', exercicios: [muscle, bike] }).exercicios, [muscle, bike]);
  const { modalidade, ...simples } = bike;
  assert.deepEqual(validarFicha({ nome: 'Cardio', exercicios: [simples] }).exercicios, [simples]);
  for (const alteracao of [{ tipo: 'invalido' }, { modalidade: 'nada' }, { duracao: 0 }, { duracao: -1 }, { duracao: null }, { duracao: 1441 }, { duracao: '20' }, { distancia: -1 }, { distancia: Infinity }, { series: 3 }]) {
    assert.throws(() => validarFicha({ nome: 'Cardio', exercicios: [{ ...bike, ...alteracao }] }), { status: 400 });
  }
  assert.equal(registroPreenchido(registroVazio(bike)), false);
  for (const campo of [{ feita: true }, { duracao: 0 }, { distancia: 0 }, { observacao: 'Nota' }]) assert.equal(registroPreenchido({ ...registroVazio(bike), ...campo }), true);
});
test('atualizar cardio preserva dados por nome, inclusive legado, e detecta perda ao trocar nome ou tipo', () => {
  const registro = { duracao: 22, distancia: 6.2, feita: true, observacao: 'Nível 5' };
  const plano = { exercicios: [bike, muscle] }, realizado = [registro, registroVazio(muscle)];
  const atualizado = adaptarRegistro(plano, realizado, [muscle, { ...bike, duracao: 30 }]);
  assert.deepEqual(atualizado.registros[1], registro); assert.deepEqual(atualizado.perdas, []);
  const { modalidade, ...simples } = bike;
  assert.deepEqual(adaptarRegistro(plano, realizado, [simples, muscle]).registros, realizado);
  for (const novo of [{ ...bike, nome: 'Esteira' }, { ...muscle, nome: bike.nome }]) {
    const r = adaptarRegistro(plano, realizado, [novo]);
    assert.deepEqual(r.perdas, ['Bicicleta']); assert.deepEqual(r.registros[0], registroVazio(novo));
  }
});
test('referência cardio usa nome e tipo, ignora nomes diferentes e aceita registros legados', () => {
  const anteriores = [
    { data_prevista: '2026-10-14', planejado: { exercicios: [bike] }, realizado: [{ ...registroVazio(bike), feita: true }] },
    { data_prevista: '2026-10-13', planejado: { exercicios: [{ ...bike, nome: 'Esteira', modalidade: 'esteira' }] }, realizado: [{ duracao: 30, distancia: 10 }] },
    { data_prevista: '2026-10-12', planejado: { exercicios: [bike] }, realizado: [{ duracao: 20, distancia: 0 }] },
  ];
  const [r] = encontrarReferencias({ exercicios: [bike] }, anteriores);
  assert.deepEqual(r, { data: '2026-10-12', duracao: 20, distancia: 0 });
  const { modalidade, ...simples } = bike;
  assert.deepEqual(encontrarReferencias({ exercicios: [simples] }, anteriores), [r]);
  assert.deepEqual(encontrarReferencias({ exercicios: [simples, bike] }, anteriores), [null, null]);
  assert.deepEqual(encontrarReferencias({ exercicios: [{ ...muscle, nome: bike.nome }] }, anteriores), [null]);
  const registro = { ...registroVazio(bike), duracao: 12, observacao: 'Manter' };
  assert.deepEqual(copiarReferenciaCardio(registro, r), { ...registro, distancia: 0 });
  assert.equal(registro.distancia, null);
  assert.deepEqual(copiarReferenciaCardio({ ...registro, feita: true }, r), { ...registro, feita: true });
});
