import test from 'node:test';
import assert from 'node:assert/strict';
import { validarMeta } from '../src/servicos/meta-semanal.js';

test('meta semanal: frequência limitada, título pessoal e campos permitidos', () => {
  assert.deepEqual(validarMeta({ tipo: 'manual', titulo: '  Violão  ', dias: 2 }), { tipo: 'manual', titulo: 'Violão', dias: 2 });
  assert.equal(validarMeta({ tipo: 'rotina', dias: 4 }).titulo, 'Avançar na rotina');
  for (const dias of [0, 8, 1.5, '3', null]) assert.throws(() => validarMeta({ tipo: 'rotina', dias }), { status: 400 });
  for (const titulo of ['', '  ', 'a'.repeat(81), null]) assert.throws(() => validarMeta({ tipo: 'manual', titulo, dias: 3 }), { status: 400 });
  assert.throws(() => validarMeta({ tipo: 'outro', dias: 3 }), { status: 400 });
  assert.throws(() => validarMeta({ tipo: 'rotina', dias: 3, usuario_id: 2 }), { status: 400 });
});
