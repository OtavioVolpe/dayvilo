import { criarPoolBanco } from '../src/db.js';
import { gerarToken, resumoToken } from '../src/servicos/autenticacao.js';

let banco;
try {
  const id = Number(process.env.USUARIO_LOCAL_ID);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('USUARIO_LOCAL_ID não está configurado. Contas novas não precisam de vinculação.');
  banco = criarPoolBanco();
  const [[perfil]] = await banco.execute('SELECT u.id, c.id AS conta_id FROM usuarios u LEFT JOIN contas c ON c.usuario_id = u.id WHERE u.id = ?', [id]);
  if (!perfil) throw new Error('Perfil local não encontrado.');
  if (perfil.conta_id) throw new Error('Sua rotina já está vinculada a uma conta. Entre com o e-mail e a senha cadastrados.');
  const codigo = gerarToken();
  await banco.execute(`INSERT INTO vinculos_conta (usuario_id, codigo_hash, expira_em)
    VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))
    ON DUPLICATE KEY UPDATE codigo_hash = VALUES(codigo_hash), expira_em = VALUES(expira_em)`, [id, resumoToken(codigo)]);
  console.log('No cadastro, marque "Trazer minha rotina anterior" e cole este código:');
  console.log(codigo);
  console.log('Válido por 30 minutos, uma única vez. Gerar outro invalida o anterior. Não compartilhe nem envie ao GitHub.');
} catch (erro) {
  console.error(erro.code ? `Não foi possível gerar o código (${erro.code}). Confira a conexão e as migrações.` : erro.message);
  process.exitCode = 1;
} finally { await banco?.end(); }
