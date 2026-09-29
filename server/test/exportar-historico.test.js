import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarCsvHistorico } from '../../client/src/exportar-historico.js';

test('CSV do histórico: preserva acentos, aspas, separadores e observações multilinha', () => {
  const csv = gerarCsvHistorico([{ id: 1, data_prevista: '2026-09-28', titulo: 'Ler "ação"; depois', horario: '08:00:00', situacao: 'concluida', prioridade: true, observacao: 'Primeira linha\nSegunda linha', serie_id: 'serie' }]);
  assert.ok(csv.startsWith('\uFEFF"Data planejada";'));
  assert.ok(csv.includes('"Ler ""ação""; depois";"08:00:00";"Concluída";"Sim";"Primeira linha\nSegunda linha";"Sim"\r\n'));
});

test('CSV: neutraliza fórmulas inclusive com espaços e controles antes do conteúdo', () => {
  for (const titulo of ['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '  =1+1', '\ttexto', '\n=1+1']) {
    const csv = gerarCsvHistorico([{ id: 1, titulo, observacao: titulo, situacao: 'pendente' }]);
    assert.ok(csv.includes('"\'' + titulo + '"'));
    assert.equal(csv.split('"\'' + titulo + '"').length - 1, 2);
  }
});

test('CSV: ordena como o histórico, mantém origem intacta e aceita campos opcionais vazios', () => {
  const tarefas = [{ id: 1, titulo: 'Antiga', data_prevista: '2026-09-27', situacao: 'pulada' }, { id: 2, titulo: 'Sem horário', data_prevista: '2026-09-28', situacao: 'pendente' }, { id: 3, titulo: 'Com horário', data_prevista: '2026-09-28', horario: '08:00', situacao: 'concluida' }];
  const antes = structuredClone(tarefas); const csv = gerarCsvHistorico(tarefas);
  assert.ok(csv.indexOf('Com horário') < csv.indexOf('Sem horário')); assert.ok(csv.indexOf('Sem horário') < csv.indexOf('Antiga'));
  assert.deepEqual(tarefas, antes); assert.ok(!csv.includes('undefined')); assert.ok(csv.includes('"Pulada";"Não";"";"Não"'));
  assert.equal(gerarCsvHistorico([]).split('\r\n').length, 2);
});
