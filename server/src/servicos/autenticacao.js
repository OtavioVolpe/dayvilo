import { createHash, randomBytes } from 'node:crypto';
import { validarObjeto } from '../validacao-tarefas.js';
import { protegerSenha, conferirSenha } from './senhas.js';

export class ErroConta extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; }
}
export const resumoToken = valor => createHash('sha256').update(valor).digest('hex');
export const gerarToken = () => randomBytes(32).toString('hex');

function validarCredenciais(dados, cadastro) {
  validarObjeto(dados, cadastro ? ['nome', 'email', 'senha', 'fuso_horario', 'codigo_vinculo'] : ['email', 'senha']);
  if (typeof dados.email !== 'string' || dados.email.length > 254 || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(dados.email.trim())) {
    throw new ErroConta(400, 'Informe um e-mail válido.');
  }
  if (typeof dados.senha !== 'string' || [...dados.senha].length > 128 || dados.senha.length === 0
    || (cadastro && [...dados.senha].length < 15)) {
    throw new ErroConta(400, cadastro ? 'Use uma senha com 15 a 128 caracteres. Pode ser uma frase.' : 'Informe sua senha (até 128 caracteres).');
  }
  if (!cadastro) return { email: dados.email.trim().toLowerCase(), senha: dados.senha };
  if (typeof dados.nome !== 'string' || !dados.nome.trim() || [...dados.nome.trim()].length > 100) throw new ErroConta(400, 'Informe seu nome (até 100 caracteres).');
  const fuso = dados.fuso_horario ?? 'America/Sao_Paulo';
  try {
    if (typeof fuso !== 'string' || fuso.length > 64) throw new Error();
    new Intl.DateTimeFormat('pt-BR', { timeZone: fuso });
  } catch { throw new ErroConta(400, 'Fuso horário inválido.'); }
  const codigo = dados.codigo_vinculo;
  if (codigo !== undefined && (typeof codigo !== 'string' || !/^[a-f0-9]{64}$/.test(codigo))) throw new ErroConta(400, 'Código de vinculação inválido.');
  return { nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(), senha: dados.senha, fuso, codigo };
}

// Conexões recebidas nos testes já têm uma transação; o SAVEPOINT a preserva.
async function transacionar(banco, executar) {
  const propria = typeof banco.getConnection === 'function';
  const conexao = propria ? await banco.getConnection() : banco;
  try {
    if (propria) await conexao.beginTransaction(); else await conexao.query('SAVEPOINT conta');
    const resultado = await executar(conexao);
    if (propria) await conexao.commit(); else await conexao.query('RELEASE SAVEPOINT conta');
    return resultado;
  } catch (erro) {
    if (propria) await conexao.rollback(); else await conexao.query('ROLLBACK TO SAVEPOINT conta');
    throw erro;
  } finally { if (propria) conexao.release(); }
}

export async function criarSessao(banco, contaId) {
  const token = gerarToken(); const csrf = gerarToken();
  await banco.execute('DELETE FROM sessoes WHERE expira_em <= UTC_TIMESTAMP()');
  await banco.execute('INSERT INTO sessoes (token_hash, conta_id, csrf, expira_em) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY))', [resumoToken(token), contaId, csrf]);
  return { token, csrf };
}

export function criarServicoAutenticacao(banco) {
  return {
    async cadastrar(dados) {
      const validos = validarCredenciais(dados, true);
      const senhaHash = await protegerSenha(validos.senha);
      try {
        return await transacionar(banco, async conexao => {
          let usuarioId;
          if (validos.codigo) {
            const [[vinculo]] = await conexao.execute('SELECT usuario_id FROM vinculos_conta WHERE codigo_hash = ? AND expira_em > UTC_TIMESTAMP() FOR UPDATE', [resumoToken(validos.codigo)]);
            if (!vinculo) throw new ErroConta(400, 'Código inválido, expirado ou já utilizado. Gere outro no seu computador.');
            usuarioId = vinculo.usuario_id;
            await conexao.execute('DELETE FROM vinculos_conta WHERE usuario_id = ?', [usuarioId]);
            // O fuso anterior determina as datas da rotina existente e é preservado.
            await conexao.execute('UPDATE usuarios SET nome = ? WHERE id = ?', [validos.nome, usuarioId]);
          } else {
            const [usuario] = await conexao.execute('INSERT INTO usuarios (nome, fuso_horario) VALUES (?, ?)', [validos.nome, validos.fuso]);
            usuarioId = usuario.insertId;
          }
          const [conta] = await conexao.execute('INSERT INTO contas (usuario_id, email, senha_hash) VALUES (?, ?, ?)', [usuarioId, validos.email, senhaHash]);
          return criarSessao(conexao, conta.insertId);
        });
      } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') throw new ErroConta(409, 'Não foi possível criar a conta. Confira o e-mail ou tente entrar em uma conta existente.');
        throw erro;
      }
    },
    async entrar(dados) {
      const validos = validarCredenciais(dados, false);
      const [[conta]] = await banco.execute('SELECT id, senha_hash FROM contas WHERE email = ?', [validos.email]);
      const confere = await conferirSenha(validos.senha, conta?.senha_hash);
      if (!conta || !confere) throw new ErroConta(401, 'E-mail ou senha incorretos.');
      return criarSessao(banco, conta.id);
    },
    async consultar(token) {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      const [[sessao]] = await banco.execute(`SELECT u.id, u.nome, u.fuso_horario, c.email, s.csrf
        FROM sessoes s JOIN contas c ON c.id = s.conta_id JOIN usuarios u ON u.id = c.usuario_id
        WHERE s.token_hash = ? AND s.expira_em > UTC_TIMESTAMP()`, [resumoToken(token)]);
      return sessao ?? null;
    },
    async sair(token) {
      if (token) await banco.execute('DELETE FROM sessoes WHERE token_hash = ?', [resumoToken(token)]);
    },
  };
}
