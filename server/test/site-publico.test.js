import test from 'node:test';
import assert from 'node:assert/strict';
import { destinoLegado } from '../../client/src/rota-site-publico.js';

test('links antigos mantêm tokens no fragmento e não aceitam destinos externos', () => {
  const app = 'https://app.dayvilo.com.br/';
  for (const hash of ['#entrar', '#criar-conta', '#recuperar-senha', '#redefinir-senha=teste', '#confirmar-email=teste', '#alterar-email=teste']) assert.equal(destinoLegado(hash, app), app + hash);
  for (const hash of ['', '#conhecer-dayvilo', '#preferencias-privacidade', '#https://outro.example/', '#entrar-malicioso']) assert.equal(destinoLegado(hash, app), null);
  assert.equal(destinoLegado('', app, true), app + '#entrar');
  assert.equal(destinoLegado('#preferencias-privacidade', app, true), null);
});
