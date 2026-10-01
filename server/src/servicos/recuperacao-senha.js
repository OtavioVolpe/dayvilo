import { validarObjeto } from '../validacoes/tarefas.js';
import { ErroConta, gerarToken, resumoToken, transacionar, validarEmail } from './autenticacao.js';
import { protegerSenha, validarSenhaNova } from './senhas.js';

const erroLink = () => new ErroConta(400, 'Este link é inválido, expirou ou já foi utilizado. Solicite um novo link.');
function validarToken(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw erroLink();
  return resumoToken(token);
}

export function criarServicoRecuperacao({ banco, enviarEmail, urlAplicacao }) {
  const base = new URL(urlAplicacao);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('URL_APLICACAO inválida.');
  return {
    async solicitar(dados) {
      validarObjeto(dados, ['email']);
      const email = validarEmail(dados.email);
      await transacionar(banco, async conexao => {
        // O bloqueio da conta serializa reenvios, redefinições e criação de sessões.
        const [[conta]] = await conexao.execute('SELECT id, email FROM contas WHERE email = ? FOR UPDATE', [email]);
        if (!conta) return;
        const [[recente]] = await conexao.execute('SELECT conta_id FROM recuperacoes_senha WHERE conta_id = ? AND criado_em > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)', [conta.id]);
        if (recente) return;
        const token = gerarToken();
        await conexao.execute(`INSERT INTO recuperacoes_senha (conta_id, token_hash, criado_em, expira_em)
          VALUES (?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))
          ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), criado_em = VALUES(criado_em), expira_em = VALUES(expira_em)`, [conta.id, resumoToken(token)]);
        const link = new URL(base);
        link.hash = `redefinir-senha=${token}`;
        await enviarEmail({
          para: conta.email,
          assunto: 'Redefina sua senha do Dayvilo',
          texto: `Recebemos um pedido para redefinir sua senha do Dayvilo.\n\nAbra este link para escolher uma nova senha:\n${link.href}\n\nO link vale por 30 minutos e pode ser usado uma única vez. Se você não fez o pedido, ignore esta mensagem: sua senha continua a mesma.\n`,
        });
      });
    },
    async validar(dados) {
      validarObjeto(dados, ['token']);
      const hash = validarToken(dados.token);
      const [[registro]] = await banco.execute('SELECT conta_id FROM recuperacoes_senha WHERE token_hash = ? AND expira_em > UTC_TIMESTAMP()', [hash]);
      if (!registro) throw erroLink();
      return { valido: true };
    },
    async redefinir(dados) {
      validarObjeto(dados, ['token', 'senha']);
      const hash = validarToken(dados.token);
      validarSenhaNova(dados.senha);
      const [[referencia]] = await banco.execute('SELECT conta_id FROM recuperacoes_senha WHERE token_hash = ? AND expira_em > UTC_TIMESTAMP()', [hash]);
      if (!referencia) throw erroLink();
      const senhaHash = await protegerSenha(dados.senha);
      await transacionar(banco, async conexao => {
        await conexao.execute('SELECT id FROM contas WHERE id = ? FOR UPDATE', [referencia.conta_id]);
        const [[registro]] = await conexao.execute('SELECT conta_id FROM recuperacoes_senha WHERE conta_id = ? AND token_hash = ? AND expira_em > UTC_TIMESTAMP() FOR UPDATE', [referencia.conta_id, hash]);
        if (!registro) throw erroLink();
        await conexao.execute('UPDATE contas SET senha_hash = ? WHERE id = ?', [senhaHash, registro.conta_id]);
        await conexao.execute('DELETE FROM sessoes WHERE conta_id = ?', [registro.conta_id]);
        await conexao.execute('DELETE FROM recuperacoes_senha WHERE conta_id = ?', [registro.conta_id]);
      });
    },
  };
}
