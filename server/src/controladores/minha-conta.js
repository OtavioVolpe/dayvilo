import { criarServicoMinhaConta } from '../servicos/minha-conta.js';
import { limparCookie } from '../middlewares/sessao.js';
import { ErroConta } from '../servicos/autenticacao.js';
import { limitarOperacaoSenha } from '../servicos/limite-senha.js';

export function criarControladorMinhaConta(banco) {
  const servico = criarServicoMinhaConta(banco);
  return {
    async nome(req, res) {
      if (!req.is('application/json')) throw new ErroConta(415, 'Use conteúdo JSON.');
      res.json(await servico.nome(req.usuario.id, req.body));
    },
    async senha(req, res) {
      if (!req.is('application/json')) throw new ErroConta(415, 'Use conteúdo JSON.');
      await limitarOperacaoSenha(async () => {
        await servico.senha(req.usuario.id, req.tokenSessao, req.body);
        limparCookie(res); res.json({ mensagem: 'Senha alterada. Entre novamente.' });
      });
    },
    async sairTodas(req, res) {
      await servico.sairTodas(req.usuario.id);
      limparCookie(res); res.json({ mensagem: 'Sessões encerradas em todos os dispositivos.' });
    },
  };
}
