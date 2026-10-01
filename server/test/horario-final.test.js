import test from 'node:test';
import assert from 'node:assert/strict';
import { validarNovaTarefa } from '../src/validacoes/tarefas.js';
import { gerarCsvHistorico } from '../../client/src/exportar-historico.js';
test('horário final: opcional, início obrigatório, formato, limites e passagem de dia',()=>{
  const validar=dados=>validarNovaTarefa({titulo:'Estudar',...dados});
  assert.equal(validar({}).horario_final,null);
  assert.equal(validar({horario:'19:00'}).horario_final,null);
  assert.equal(validar({horario:'19:00',horario_final:'20:00'}).horario_final,'20:00');
  assert.equal(validar({horario:'23:30',horario_final:'00:30'}).horario_final,'00:30');
  for(const dados of [{horario_final:'10:00'},{horario:'10:00',horario_final:'10:00'},...['24:00','-01:00','09:60',123,''].map(horario_final=>({horario:'09:00',horario_final}))])assert.throws(()=>validar(dados));
});
test('CSV inclui término e identifica o dia seguinte',()=>{
  const csv=gerarCsvHistorico([{id:1,titulo:'Ler',horario:'23:00',horario_final:'01:00',situacao:'pendente'}]);
  assert.ok(csv.includes('"Horário inicial";"Horário final";"Término no dia seguinte"'));
  assert.ok(csv.includes('"23:00";"01:00";"Sim"'));
});
