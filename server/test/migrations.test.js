import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingMigrations, readMigrations } from '../src/migrations.js';

const first = { name: '001_create_users.sql', checksum: 'original' };
const second = { name: '002_create_tasks.sql', checksum: 'second' };
const applied = { ...first, state: 'applied' };

test('execução repetida não reaplica alterações já registradas', () => {
  assert.deepEqual(pendingMigrations([first, second], [applied]), [second]);
  assert.deepEqual(pendingMigrations([first], [applied]), []);
});

test('interrompe quando uma migração aplicada foi editada ou removida', () => {
  assert.throws(() => pendingMigrations([{ ...first, checksum: 'changed' }], [applied]), /foi alterada/);
  assert.throws(() => pendingMigrations([], [applied]), /não encontrado/);
});

test('interrompe após falha parcial em vez de repetir DDL', () => {
  assert.throws(() => pendingMigrations([first, second], [{ ...first, state: 'started' }]), /incompleta/);
});

test('não insere migração antiga em um banco que já avançou', () => {
  assert.throws(() => pendingMigrations([first, second], [{ ...second, state: 'applied' }]), /numeração posterior/);
});

test('carrega SQL em ordem com impressão digital estável', async () => {
  const migrations = await readMigrations();
  assert.deepEqual(migrations.map(item => item.name), [first.name, second.name]);
  assert.ok(migrations.every(item => /^[a-f0-9]{64}$/.test(item.checksum)));
});
