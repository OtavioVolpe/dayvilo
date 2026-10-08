import { setTimeout as aguardar } from 'node:timers/promises';
import { ErroConta } from '../servicos/autenticacao.js';
import { nomeCookie, opcoesCookie, limparCookie } from '../middlewares/sessao.js';

import { limitarOperacaoSenha } from '../servicos/limite-senha.js';

export function criarControladorContas({ contas, confirmacao, recuperacao, entrega }) {
  function autenticar(acao, status) {
    return async (requisicao, resposta) => {
      if (acao === 'cadastrar' && entrega.cadastroAberto === false) throw new ErroConta(403, 'Novos cadastros estão fechados no momento.');
      if (requisicao.usuario) throw new ErroConta(409, 'Saia da conta atual antes de entrar em outra.');
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      await limitarOperacaoSenha(async () => {
        const sessao = await contas[acao](requisicao.body);
        resposta.cookie(nomeCookie, sessao.token, { ...opcoesCookie, secure: resposta.locals.cookieSeguro === true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        // A resposta da sessão é a única fonte do perfil e do token CSRF para a interface.
        const { csrf, ...usuario } = await contas.consultar(sessao.token);
        let aviso_confirmacao;
        if (acao === 'cadastrar') {
          try { await confirmacao.solicitar(usuario.id); }
          catch { aviso_confirmacao = 'Sua conta foi criada, mas não conseguimos enviar a confirmação. Você pode solicitar outro link na sua rotina.'; }
        }
        resposta.status(status).json({ usuario, csrf, aviso_confirmacao });
      });
    };
  }
  return {
    cadastrar: autenticar('cadastrar', 201),
    entrar: autenticar('entrar', 200),
    async solicitarRecuperacao(requisicao, resposta) {
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      const inicio = performance.now();
      try { await recuperacao.solicitar(requisicao.body); }
      catch (erro) {
        if (erro.status === 400) throw erro;
        // A resposta não revela se o endereço existe nem se houve falha na entrega.
        console.error('Falha ao preparar recuperação de senha (' + (erro.code || 'erro interno') + ').');
      } finally { await aguardar(Math.max(0, (entrega.modoEmail === 'resend' ? 5500 : 500) - (performance.now() - inicio))); }
      resposta.status(202).json({
        mensagem: entrega.modoEmail === 'resend'
          ? 'Se o e-mail estiver cadastrado, enviaremos um link. Aguarde 1 minuto para pedir outro.'
          : 'Se o e-mail estiver cadastrado, a mensagem ficará neste computador. Aguarde 1 minuto para pedir outra.',
        entrega: entrega.modoEmail,
      });
    },
    async validarRecuperacao(requisicao, resposta) {
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      resposta.json(await recuperacao.validar(requisicao.body));
    },
    async redefinirSenha(requisicao, resposta) {
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      await limitarOperacaoSenha(async () => {
        await recuperacao.redefinir(requisicao.body);
        resposta.json({ mensagem: 'Senha atualizada. Entre novamente com sua nova senha.' });
      });
    },
    async solicitarConfirmacao(requisicao, resposta) {
      const resultado = await confirmacao.solicitar(requisicao.usuario.id);
      resposta.json({ ...resultado, entrega: entrega.modoEmail, mensagem: resultado.confirmado ? 'Seu e-mail já está confirmado.' : entrega.modoEmail === 'resend' ? 'Confira seu e-mail e a pasta de spam. O link vale por 30 minutos.' : 'A mensagem de confirmação foi salva neste computador. O link vale por 30 minutos.' });
    },
    async confirmarEmail(requisicao, resposta) {
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      resposta.json(await confirmacao.confirmar(requisicao.body));
    },
    sessao(requisicao, resposta) {
      if (!requisicao.usuario) { limparCookie(resposta); return resposta.json({ usuario: null, cadastro_aberto: entrega.cadastroAberto !== false }); }
      const { csrf, ...usuario } = requisicao.usuario;
      resposta.json({ usuario, csrf, cadastro_aberto: entrega.cadastroAberto !== false });
    },
    async sair(requisicao, resposta) {
      await contas.sair(requisicao.tokenSessao);
      limparCookie(resposta);
      resposta.json({ saiu: true });
    },
  };
}
