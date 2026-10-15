import test from 'node:test';
import assert from 'node:assert/strict';
import { encontrarReferencias } from '../src/servicos/referencia-treino.js';
import { copiarReferencia } from '../../client/src/copiar-referencia-treino.js';

test('referências acompanham nomes únicos após reordenação, ignoram vazios e não misturam datas', () => {
  const atual = { exercicios: [{ nome: 'Remada' }, { nome: 'Supino' }, { nome: 'Novo' }] };
  const anteriores = [
    { data_prevista: '2026-10-12', planejado: { exercicios: [{ nome: 'supino' }, { nome: 'Remada' }] }, realizado: [{ series: [{ carga: 22, repeticoes: null }, { carga: null, repeticoes: null }] }, { series: [{ carga: null, repeticoes: null }] }] },
    { data_prevista: '2026-10-05', planejado: { exercicios: [{ nome: 'Supino' }, { nome: 'Remada' }] }, realizado: [{ series: [{ carga: 20, repeticoes: 12 }] }, { series: [{ carga: 0, repeticoes: 8 }] }] },
  ];
  const r = encontrarReferencias(atual, anteriores);
  assert.equal(r[0].data, '2026-10-05'); assert.equal(r[0].series[0].carga, 0);
  assert.equal(r[1].data, '2026-10-12'); assert.equal(r[1].series[1].carga, null);
  assert.equal(r[2], null);
  assert.deepEqual(encontrarReferencias({ exercicios: [{ nome: 'Supino' }, { nome: 'Supino' }] }, anteriores), [null, null]);
  assert.deepEqual(encontrarReferencias({ exercicios: [{ nome: 'Supino' }] }, [{ ...anteriores[0], planejado: { exercicios: [{ nome: 'Supino' }, { nome: 'Supino' }] } }]), [null]);
});

test('copiar referência preserva valores atuais, zero, séries feitas e notas; não marca conclusão', () => {
  const series = [{ carga: 0, repeticoes: null, feita: false }, { carga: null, repeticoes: 10, feita: false }, { carga: null, repeticoes: null, feita: true }, { carga: null, repeticoes: null, feita: false }];
  const original = structuredClone(series);
  const r = copiarReferencia(series, { series: Array.from({ length: 3 }, () => ({ carga: 20, repeticoes: 12 })) });
  assert.deepEqual(r, [{ carga: 0, repeticoes: 12, feita: false }, { carga: 20, repeticoes: 10, feita: false }, series[2], series[3]]);
  assert.deepEqual(series, original);
});
