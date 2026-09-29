import test from 'node:test';
import assert from 'node:assert/strict';
import { compararTarefas } from '../../client/src/ordenacao.js';
test('modos de organização preservam sequência manual e oferecem criação/horário independentes',()=>{
  const tarefas=[{id:1,ordem:2,horario:'08:00'},{id:2,ordem:1,horario:null},{id:3,ordem:0,horario:'07:00'}];
  const ids=modo=>[...tarefas].sort(compararTarefas(modo)).map(t=>t.id);
  assert.deepEqual(ids('manual'),[2,1,3]);assert.deepEqual(ids('criacao'),[1,2,3]);assert.deepEqual(ids('horario'),[3,1,2]);
});
