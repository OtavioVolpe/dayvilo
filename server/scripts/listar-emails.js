import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pastaEmails } from '../src/servicos/email-local.js';

try {
  const arquivos = (await readdir(pastaEmails)).filter(nome => nome.endsWith('.txt')).sort().reverse().slice(0, 5);
  console.log('Mensagens de teste locais (mais recentes primeiro). Abra o arquivo no editor para acessar o link:');
  for (const arquivo of arquivos) console.log(join(pastaEmails, arquivo));
  if (!arquivos.length) console.log('Nenhuma mensagem local encontrada.');
} catch (erro) {
  if (erro.code === 'ENOENT') console.log('Nenhuma mensagem local encontrada. Use Esqueci minha senha na tela de entrada.');
  else { console.error('Não foi possível listar as mensagens locais.'); process.exitCode = 1; }
}
