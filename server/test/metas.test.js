import test from 'node:test';
import assert from 'node:assert/strict';
import { periodoMeta,validarMissao } from '../src/servicos/metas.js';

test('missões: semanas, mês bissexto, dezembro e validações de frequência',()=>{
  assert.equal(periodoMeta('2026-10-23','semanal').inicio,'2026-10-19');
  assert.equal(periodoMeta('2024-02-10','mensal').dias.length,29);
  assert.equal(periodoMeta('2026-02-10','mensal').fim,'2026-02-28');
  assert.equal(periodoMeta('2026-12-10','mensal').fim,'2026-12-31');
  const m={tipo:'manual',periodo:'mensal',medida:'dias',titulo:' Violão ',quantidade:10,origem:'pessoal'};
  assert.equal(validarMissao(m).titulo,'Violão');
  for(const alteracao of [{quantidade:0},{quantidade:32},{quantidade:'3'},{periodo:'anual'},{tipo:'outro'},{medida:'ocorrencias'},{titulo:' '},{titulo:'a'.repeat(81)},{usuario_id:1}])assert.throws(()=>validarMissao({...m,...alteracao}),{status:400});
  assert.throws(()=>validarMissao({...m,periodo:'semanal',quantidade:8}),{status:400});
  assert.equal(validarMissao({...m,tipo:'treino',medida:'ocorrencias',quantidade:12}).quantidade,12);
});
