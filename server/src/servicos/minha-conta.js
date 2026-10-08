import { ErroConta, resumoToken, transacionar } from './autenticacao.js';
import { conferirSenha, protegerSenha, validarSenhaNova } from './senhas.js';
import { validarObjeto } from '../validacoes/tarefas.js';

export function criarServicoMinhaConta(banco) {
  return {
    async nome(usuarioId, dados) {
      validarObjeto(dados, ['nome']);
      if (typeof dados.nome !== 'string' || !dados.nome.trim() || [...dados.nome.trim()].length > 100) throw new ErroConta(400, 'Use um nome de até 100 caracteres.');
      await banco.execute('UPDATE usuarios SET nome = ? WHERE id = ?', [dados.nome.trim(), usuarioId]);
      return { nome: dados.nome.trim() };
    },
    async senha(usuarioId, token, dados) {
      validarObjeto(dados, ['senha_atual', 'nova_senha']);
      if (typeof dados.senha_atual !== 'string' || !dados.senha_atual || [...dados.senha_atual].length > 128) throw new ErroConta(400, 'Informe sua senha atual.');
      validarSenhaNova(dados.nova_senha);
      const [[conta]] = await banco.execute('SELECT id, senha_hash FROM contas WHERE usuario_id = ?', [usuarioId]);
      if (!conta || !await conferirSenha(dados.senha_atual, conta.senha_hash)) throw new ErroConta(400, 'Senha atual incorreta.');
      if (dados.senha_atual === dados.nova_senha) throw new ErroConta(400, 'Escolha uma senha diferente da atual.');
      const hash = await protegerSenha(dados.nova_senha);
      await transacionar(banco, async c => {
        const [[atual]] = await c.execute('SELECT senha_hash FROM contas WHERE id = ? FOR UPDATE', [conta.id]);
        const [[sessao]] = await c.execute('SELECT conta_id FROM sessoes WHERE token_hash = ? AND conta_id = ? AND expira_em > UTC_TIMESTAMP()', [resumoToken(token), conta.id]);
        if (!sessao || atual.senha_hash !== conta.senha_hash) throw new ErroConta(409, 'Sua conta mudou. Entre novamente e tente outra vez.');
        await c.execute('UPDATE contas SET senha_hash = ? WHERE id = ?', [hash, conta.id]);
        await c.execute('DELETE FROM sessoes WHERE conta_id = ?', [conta.id]);
        await c.execute('DELETE FROM recuperacoes_senha WHERE conta_id = ?', [conta.id]);
      });
    },
    async sairTodas(usuarioId) {
      await transacionar(banco, async c => {
        const [[conta]] = await c.execute('SELECT id FROM contas WHERE usuario_id = ? FOR UPDATE', [usuarioId]);
        if (!conta) throw new ErroConta(401, 'Entre novamente.');
        await c.execute('DELETE FROM sessoes WHERE conta_id = ?', [conta.id]);
      });
    },
  };
}
