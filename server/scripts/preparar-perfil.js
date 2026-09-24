import { readFile, writeFile } from 'node:fs/promises';
import { criarPoolBanco } from '../src/db.js';

const caminhoAmbiente = new URL('../.env', import.meta.url);
let banco;
let conexao;
let bloqueado = false;
let idCriado;
try {
  const ambiente = await readFile(caminhoAmbiente, 'utf8');
  banco = criarPoolBanco();
  conexao = await banco.getConnection();
  const [[{ obtido }]] = await conexao.execute("SELECT GET_LOCK('dayvilo:perfil-local', 10) AS obtido");
  if (obtido !== 1) throw new Error('Outra configuração de perfil está em andamento.');
  bloqueado = true;
  if (process.env.USUARIO_LOCAL_ID) {
    const [[usuario]] = await conexao.execute('SELECT id FROM usuarios WHERE id = ?', [process.env.USUARIO_LOCAL_ID]);
    if (!usuario) throw new Error('USUARIO_LOCAL_ID aponta para um perfil inexistente.');
    console.log('Perfil local já configurado.');
  } else {
    const [[{ total }]] = await conexao.query('SELECT COUNT(*) AS total FROM usuarios');
    if (total) throw new Error('Já existem perfis. Configure USUARIO_LOCAL_ID no .env com o perfil desejado.');
    const [resultado] = await conexao.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Meu perfil']);
    idCriado = resultado.insertId;
    const linha = `USUARIO_LOCAL_ID=${idCriado}`;
    const novoAmbiente = /^USUARIO_LOCAL_ID=.*$/m.test(ambiente)
      ? ambiente.replace(/^USUARIO_LOCAL_ID=.*$/m, linha)
      : `${ambiente.trimEnd()}\n${linha}\n`;
    await writeFile(caminhoAmbiente, novoAmbiente);
    console.log(`Perfil local configurado (id ${idCriado}).`);
  }
} catch (erro) {
  console.error(erro.code ? `Não foi possível configurar o perfil (${erro.code}).` : erro.message);
  if (idCriado) console.error(`O perfil foi criado. Configure USUARIO_LOCAL_ID=${idCriado} no .env antes de continuar.`);
  process.exitCode = 1;
} finally {
  if (bloqueado) await conexao.execute("SELECT RELEASE_LOCK('dayvilo:perfil-local')");
  conexao?.release();
  await banco?.end();
}
