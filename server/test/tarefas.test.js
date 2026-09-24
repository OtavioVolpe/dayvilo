import test from 'node:test';
import assert from 'node:assert/strict';
import { validarNovaTarefa, validarData, obterDataHoje } from '../src/validacao-tarefas.js';

test('valida calendário, horário e campos da tarefa', () => {
  assert.equal(validarData('2024-02-29'), '2024-02-29');
  assert.throws(() => validarData('2025-02-29'));
  assert.throws(() => validarNovaTarefa({ titulo: '   ' }));
  assert.throws(() => validarNovaTarefa({ titulo: 'Teste', horario: '24:00' }));
  assert.throws(() => validarNovaTarefa({ titulo: 'Teste', usuario_id: 99 }));
  assert.throws(() => validarNovaTarefa({ titulo: 'Teste', prioridade: 'false' }));
  assert.equal(validarNovaTarefa({ titulo: ' Ler ' }).titulo, 'Ler');
});
test('o dia considera o fuso do perfil', () => {
  assert.equal(obterDataHoje('America/Sao_Paulo', new Date('2026-09-24T01:00:00Z')), '2026-09-23');
});
