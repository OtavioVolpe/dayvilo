import test from 'node:test';
import assert from 'node:assert/strict';
import { validarSenhaNova } from '../src/servicos/senhas.js';
import { nivelSenha } from '../../shared/politica-senha.js';

test('nova senha exige comprimento e as quatro categorias, contando Unicode', () => {
  for (const senha of ['Abcdef1!', 'Ábcdef1!', 'Ab1!' + 'x'.repeat(124)]) assert.doesNotThrow(() => validarSenhaNova(senha));
  for (const senha of [null, {}, 'Abcde1!', 'abcdef1!', 'ABCDEF1!', 'Abcdefg!', 'Abcdef12', 'Abcdef1 ', 'Ab1!' + 'x'.repeat(125)]) assert.throws(() => validarSenhaNova(senha), e => e.status === 400);
});
test('força não vira forte só pelo tamanho ou por cumprir composição', () => {
  assert.equal(nivelSenha('Xy9!abCd', 4), 2);
  assert.equal(nivelSenha('Senha123!', 0), 1);
  assert.equal(nivelSenha('Senha123!Senha123!', 1), 1);
  assert.equal(nivelSenha('somenteminusculasmuitolongas', 4), 1);
  assert.equal(nivelSenha('Azul!7 nuvem Laranja', 4), 3);
});
