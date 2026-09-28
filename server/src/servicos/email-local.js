import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const pastaEmails = fileURLToPath(new URL('../../.emails/', import.meta.url));

export function criarEntregaLocal({ pasta = pastaEmails } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Mensagens locais não podem ser usadas em produção.');
  return async ({ para, assunto, texto }) => {
    await mkdir(pasta, { recursive: true, mode: 0o700 });
    const nome = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.txt`;
    await writeFile(join(pasta, nome), `DAYVILO — MENSAGEM DE TESTE LOCAL\nEsta mensagem não foi enviada pela internet.\n\nPara: ${para}\nAssunto: ${assunto}\n\n${texto}`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  };
}
