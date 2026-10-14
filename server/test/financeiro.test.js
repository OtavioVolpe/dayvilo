import test from 'node:test';
import assert from 'node:assert/strict';
import { centavos, datasMensais } from '../src/servicos/financeiro.js';
test('Financeiro: centavos exatos, limites e calendário mensal',()=>{
  assert.equal(centavos(101),101);
  for(const v of [0,-1,1.1,NaN,Infinity,'100',100000000001])assert.throws(()=>centavos(v));
  assert.equal(centavos(0,true),0);
  assert.deepEqual(datasMensais('2028-01-31','2028-04-30'),['2028-01-31','2028-02-29','2028-03-31','2028-04-30']);
  assert.deepEqual(datasMensais('2027-01-31','2027-03-31'),['2027-01-31','2027-02-28','2027-03-31']);
  assert.deepEqual(datasMensais('9999-12-31','9999-12-31'),['9999-12-31']);
  assert.throws(()=>datasMensais('2026-01-01','2027-01-02'));
  assert.throws(()=>datasMensais('2026-02-30','2026-03-30'));
});
