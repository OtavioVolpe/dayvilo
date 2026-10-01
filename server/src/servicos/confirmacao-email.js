import { validarObjeto } from '../validacoes/tarefas.js';
import { ErroConta, gerarToken, resumoToken, transacionar } from './autenticacao.js';

export function criarServicoConfirmacao({ banco, enviarEmail, urlAplicacao }) {
  const base = new URL(urlAplicacao);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('URL_APLICACAO inválida.');
  return {
    async solicitar(usuarioId) {
      return transacionar(banco, async conexao => {
        const [[conta]] = await conexao.execute('SELECT id, email FROM contas WHERE usuario_id = ? FOR UPDATE', [usuarioId]);
        if (!conta) throw new ErroConta(401, 'Entre na sua conta para continuar.');
        const [[anterior]] = await conexao.execute('SELECT confirmado_em, criado_em > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) AS recente FROM confirmacoes_email WHERE conta_id = ?', [conta.id]);
        if (anterior?.confirmado_em) return { confirmado: true };
        if (anterior?.recente) throw new ErroConta(429, 'Aguarde um minuto antes de solicitar outro link.');
        const token = gerarToken();
        await conexao.execute(`INSERT INTO confirmacoes_email (conta_id, token_hash, criado_em, expira_em)
          VALUES (?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))
          ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), criado_em = VALUES(criado_em), expira_em = VALUES(expira_em)`, [conta.id, resumoToken(token)]);
        const link = new URL(base); link.hash = `confirmar-email=${token}`;
        try {
          await enviarEmail({ para: conta.email, assunto: 'Confirme seu e-mail no Dayvilo',
            texto: `Confirme que este e-mail pertence a você.\n\nAbra o link e selecione Confirmar meu e-mail:\n${link.href}\n\nO link vale por 30 minutos e pode ser usado uma única vez. Se você não fez este pedido, ignore a mensagem. Sua senha e suas tarefas não serão alteradas.\n` });
        } catch {
          throw new ErroConta(503, 'Não foi possível enviar a confirmação agora. Tente novamente em instantes.');
        }
        return { confirmado: false };
      });
    },
    async confirmar(dados) {
      validarObjeto(dados, ['token']);
      const invalido = () => new ErroConta(400, 'Este link é inválido, expirou ou já foi utilizado. Entre na sua conta para solicitar outro.');
      if (typeof dados.token !== 'string' || !/^[a-f0-9]{64}$/.test(dados.token)) throw invalido();
      const hash = resumoToken(dados.token);
      return transacionar(banco, async conexao => {
        const [[registro]] = await conexao.execute('SELECT conta_id FROM confirmacoes_email WHERE token_hash = ? AND expira_em > UTC_TIMESTAMP() AND confirmado_em IS NULL', [hash]);
        if (!registro) throw invalido();
        await conexao.execute('SELECT id FROM contas WHERE id = ? FOR UPDATE', [registro.conta_id]);
        const [resultado] = await conexao.execute(`UPDATE confirmacoes_email SET confirmado_em = UTC_TIMESTAMP(), token_hash = NULL, expira_em = NULL
          WHERE conta_id = ? AND token_hash = ? AND expira_em > UTC_TIMESTAMP() AND confirmado_em IS NULL`, [registro.conta_id, hash]);
        if (resultado.affectedRows !== 1) throw invalido();
        return { confirmado: true };
      });
    },
  };
}
