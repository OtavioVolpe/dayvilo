import { ErroConta, gerarToken, resumoToken, transacionar, validarEmail } from './autenticacao.js';
import { conferirSenha } from './senhas.js';
import { validarObjeto } from '../validacoes/tarefas.js';

export function criarServicoAlteracaoEmail({ banco, enviarEmail, urlAplicacao }) {
  const base = new URL(urlAplicacao);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('URL_APLICACAO inválida.');
  return {
    async consultar(usuarioId) {
      const [[pedido]] = await banco.execute('SELECT a.novo_email FROM alteracoes_email a JOIN contas c ON c.id = a.conta_id WHERE c.usuario_id = ? AND a.expira_em > UTC_TIMESTAMP()', [usuarioId]);
      return { pendente: pedido?.novo_email || null };
    },
    async cancelar(usuarioId) {
      await transacionar(banco, async c => {
        const [[conta]] = await c.execute('SELECT id FROM contas WHERE usuario_id = ? FOR UPDATE', [usuarioId]);
        if (conta) await c.execute('DELETE FROM alteracoes_email WHERE conta_id = ?', [conta.id]);
      });
      return { pendente: null };
    },
    async solicitar(usuarioId, tokenSessao, dados) {
      validarObjeto(dados, ['email', 'senha_atual']);
      const email = validarEmail(dados.email);
      if (typeof dados.senha_atual !== 'string' || !dados.senha_atual || [...dados.senha_atual].length > 128) throw new ErroConta(400, 'Informe sua senha atual.');
      const [[conta]] = await banco.execute('SELECT id, email, senha_hash FROM contas WHERE usuario_id = ?', [usuarioId]);
      if (!conta || !await conferirSenha(dados.senha_atual, conta.senha_hash)) throw new ErroConta(400, 'Senha atual incorreta.');
      if (email === conta.email) throw new ErroConta(400, 'Informe um e-mail diferente do atual.');
      return transacionar(banco, async c => {
        const [[atual]] = await c.execute('SELECT email, senha_hash FROM contas WHERE id = ? FOR UPDATE', [conta.id]);
        const [[sessao]] = await c.execute('SELECT conta_id FROM sessoes WHERE token_hash = ? AND conta_id = ? AND expira_em > UTC_TIMESTAMP()', [resumoToken(tokenSessao), conta.id]);
        if (!sessao || atual.email !== conta.email || atual.senha_hash !== conta.senha_hash) throw new ErroConta(409, 'Sua conta mudou. Entre novamente e tente outra vez.');
        const [[recente]] = await c.execute('SELECT conta_id FROM alteracoes_email WHERE conta_id = ? AND criado_em > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)', [conta.id]);
        if (recente) throw new ErroConta(429, 'Aguarde um minuto antes de enviar outro pedido.');
        const [[existe]] = await c.execute('SELECT id FROM contas WHERE email = ?', [email]);
        if (existe) throw new ErroConta(409, 'Não foi possível usar esse endereço. Confira o e-mail ou recupere o acesso à conta existente.');
        const [[confirmacao]] = await c.execute('SELECT confirmado_em FROM confirmacoes_email WHERE conta_id = ?', [conta.id]);
        const token = gerarToken();
        await c.execute('INSERT INTO alteracoes_email (conta_id, novo_email, token_hash, criado_em, expira_em) VALUES (?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE)) ON DUPLICATE KEY UPDATE novo_email = VALUES(novo_email), token_hash = VALUES(token_hash), criado_em = VALUES(criado_em), expira_em = VALUES(expira_em)', [conta.id, email, resumoToken(token)]);
        await c.execute('UPDATE confirmacoes_email SET token_hash = NULL, expira_em = NULL WHERE conta_id = ? AND confirmado_em IS NULL', [conta.id]);
        const link = new URL(base); link.hash = `alterar-email=${token}`;
        try {
          if (confirmacao?.confirmado_em) await enviarEmail({ para: conta.email, assunto: 'Pedido de alteração de e-mail no Dayvilo', texto: 'Foi solicitada uma troca de e-mail na sua conta. Se não foi você, entre no Dayvilo e altere sua senha para cancelar o pedido e encerrar as sessões. O endereço só será trocado após a confirmação do novo e-mail.' });
          await enviarEmail({ para: email, assunto: 'Confirme seu novo e-mail no Dayvilo', texto: `Para confirmar a troca do e-mail da sua conta, abra o link e selecione Confirmar novo e-mail:\n${link.href}\n\nO link vale por 30 minutos e pode ser usado uma vez. Sua senha e seus dados serão mantidos. Se você não pediu esta alteração, ignore esta mensagem.` });
        } catch { throw new ErroConta(503, 'Não foi possível enviar a confirmação. Seu e-mail não foi alterado. Tente novamente.'); }
        return { pendente: email, mensagem: 'Confirme o novo endereço pelo link enviado. Até lá, continue entrando com o e-mail atual.' };
      });
    },
    async confirmar(dados) {
      validarObjeto(dados, ['token']);
      const invalido = () => new ErroConta(400, 'Este link expirou, foi cancelado ou já foi utilizado. Entre na conta para solicitar outro.');
      if (typeof dados.token !== 'string' || !/^[a-f0-9]{64}$/.test(dados.token)) throw invalido();
      const hash = resumoToken(dados.token);
      const [[referencia]] = await banco.execute('SELECT conta_id FROM alteracoes_email WHERE token_hash = ?', [hash]);
      if (!referencia) throw invalido();
      try {
        return await transacionar(banco, async c => {
          await c.execute('SELECT id FROM contas WHERE id = ? FOR UPDATE', [referencia.conta_id]);
          const [[pedido]] = await c.execute('SELECT novo_email FROM alteracoes_email WHERE conta_id = ? AND token_hash = ? AND expira_em > UTC_TIMESTAMP() FOR UPDATE', [referencia.conta_id, hash]);
          if (!pedido) throw invalido();
          await c.execute('UPDATE contas SET email = ? WHERE id = ?', [pedido.novo_email, referencia.conta_id]);
          await c.execute('INSERT INTO confirmacoes_email (conta_id, confirmado_em) VALUES (?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE confirmado_em = UTC_TIMESTAMP(), token_hash = NULL, expira_em = NULL', [referencia.conta_id]);
          await c.execute('DELETE FROM recuperacoes_senha WHERE conta_id = ?', [referencia.conta_id]);
          await c.execute('DELETE FROM sessoes WHERE conta_id = ?', [referencia.conta_id]);
          await c.execute('DELETE FROM alteracoes_email WHERE conta_id = ?', [referencia.conta_id]);
          return { confirmado: true, mensagem: 'E-mail alterado. Entre com o novo endereço e sua senha atual.' };
        });
      } catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new ErroConta(409, 'Esse endereço não está disponível. Entre na sua conta e escolha outro e-mail.'); throw e; }
    },
  };
}
