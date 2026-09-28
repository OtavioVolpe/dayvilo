import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarEntregaLocal } from '../src/servicos/email-local.js';

test('entrega local: mensagens separadas, conteúdo legível e nenhum envio externo', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'dayvilo-email-teste-'));
  try {
    const enviar = criarEntregaLocal({ pasta });
    await enviar({ para: 'teste@example.test', assunto: 'Recuperação', texto: 'Link de teste' });
    await enviar({ para: 'outro@example.test', assunto: 'Outra mensagem', texto: 'Outro link' });
    const arquivos = await readdir(pasta); assert.equal(arquivos.length, 2);
    const textos = await Promise.all(arquivos.map(nome => readFile(join(pasta, nome), 'utf8')));
    assert.ok(textos.every(texto => texto.includes('não foi enviada pela internet')));
    assert.ok(textos.some(texto => texto.includes('Para: teste@example.test') && texto.includes('Link de teste')));
  } finally { await rm(pasta, { recursive: true }); }
});
