import test from 'node:test';
import assert from 'node:assert/strict';
import { selecionarMigracoesPendentes, lerMigracoes, executarMigracoes } from '../src/migrations.js';

const primeira = { nome: '001_criar_usuarios.sql', assinatura: 'original' };
const segunda = { nome: '002_criar_tarefas.sql', assinatura: 'segunda' };
const aplicada = { ...primeira, estado: 'aplicada' };

test('execução repetida não reaplica alterações já registradas', () => {
  assert.deepEqual(selecionarMigracoesPendentes([primeira, segunda], [aplicada]), [segunda]);
  assert.deepEqual(selecionarMigracoesPendentes([primeira], [aplicada]), []);
});

test('interrompe quando uma migração aplicada foi editada ou removida', () => {
  assert.throws(() => selecionarMigracoesPendentes([{ ...primeira, assinatura: 'changed' }], [aplicada]), /foi alterada/);
  assert.throws(() => selecionarMigracoesPendentes([], [aplicada]), /não encontrado/);
});

test('interrompe após falha parcial em vez de repetir DDL', () => {
  assert.throws(() => selecionarMigracoesPendentes([primeira, segunda], [{ ...primeira, estado: 'iniciada' }]), /incompleta/);
});

test('não insere migração antiga em um banco que já avançou', () => {
  assert.throws(() => selecionarMigracoesPendentes([primeira, segunda], [{ ...segunda, estado: 'aplicada' }]), /numeração posterior/);
});

test('carrega SQL em ordem com impressão digital estável', async () => {
  const migracoes = await lerMigracoes();
  assert.deepEqual(migracoes.map(item => item.nome), [primeira.nome, segunda.nome]);
  assert.ok(migracoes.every(item => /^[a-f0-9]{64}$/.test(item.assinatura)));
});

test('estrutura antiga é recusada antes de criar tabelas e o bloqueio é liberado', async () => {
  const comandos = [];
  const conexao = {
    async query(sql) {
      comandos.push(sql);
      if (sql === 'SELECT DATABASE() AS nomeBanco') return [[{ nomeBanco: 'dayvilo' }]];
      throw new Error('Nenhuma alteração de estrutura deveria ser executada.');
    },
    async execute(sql) {
      comandos.push(sql);
      if (sql.includes('GET_LOCK')) return [[{ obtido: 1 }]];
      if (sql.includes('information_schema.TABLES')) return [[{ TABLE_NAME: 'users' }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ liberado: 1 }]];
      throw new Error('Comando inesperado.');
    },
  };
  await assert.rejects(executarMigracoes(conexao, [], () => {}), /estrutura antiga/);
  assert.ok(comandos.at(-1).includes('RELEASE_LOCK'));
  assert.ok(comandos.every(sql => !sql.startsWith('CREATE')));
});
