import { setTimeout as aguardar } from 'node:timers/promises';
import { criarServicoRecuperacao } from './servicos/recuperacao-senha.js';
import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { criarServicoAutenticacao, ErroConta } from './servicos/autenticacao.js';

const nomeCookie = 'dayvilo_sessao';
const opcoesCookie = { httpOnly: true, sameSite: 'strict', path: '/api' };
const lerCookie = requisicao => (requisicao.headers.cookie ?? '').split(';').map(parte => parte.trim()).find(parte => parte.startsWith(`${nomeCookie}=`))?.slice(nomeCookie.length + 1);
const limparCookie = resposta => resposta.clearCookie(nomeCookie, opcoesCookie);
let operacoesSenha = 0;

export function instalarContas(aplicacao, banco, entrega) {
  const contas = criarServicoAutenticacao(banco);
  const recuperacao = criarServicoRecuperacao({ banco, ...entrega });
  aplicacao.use('/api', async (requisicao, resposta, proximo) => {
    resposta.set('Cache-Control', 'no-store');
    requisicao.tokenSessao = lerCookie(requisicao);
    requisicao.usuario = await contas.consultar(requisicao.tokenSessao);
    // Um header não simples exige preflight em chamadas entre origens.
    // A API não habilita CORS; formulários externos não conseguem enviar este header.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(requisicao.method) && requisicao.get('X-Dayvilo') !== '1') {
      return resposta.status(403).json({ erro: 'Requisição não permitida. Atualize a página.' });
    }
    proximo();
  });

  const rotas = Router();
  function criarLimitador(maximo) {
    const tentativas = new Map();
    return function limitar(requisicao, resposta, proximo) {
      const agora = Date.now();
      for (const [chave, valor] of tentativas) if (valor.ate <= agora) tentativas.delete(chave);
      const chave = requisicao.ip;
      const registro = tentativas.get(chave) ?? { quantidade: 0, ate: agora + 15 * 60 * 1000 };
      if (registro.quantidade >= maximo) {
        resposta.set('Retry-After', String(Math.ceil((registro.ate - agora) / 1000)));
        return resposta.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' });
      }
      registro.quantidade++; tentativas.set(chave, registro);
      proximo();
    };
  }
  const limitar = criarLimitador(10);
  const limitarPedidos = criarLimitador(5);
  const limitarLinks = criarLimitador(30);
  const limitarRedefinicoes = criarLimitador(10);
  function autenticar(acao, status) {
    return async (requisicao, resposta) => {
      if (requisicao.usuario) throw new ErroConta(409, 'Saia da conta atual antes de entrar em outra.');
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      if (operacoesSenha >= 2) throw new ErroConta(503, 'Servidor ocupado. Tente novamente em alguns segundos.');
      operacoesSenha++;
      try {
        const sessao = await contas[acao](requisicao.body);
        resposta.cookie(nomeCookie, sessao.token, { ...opcoesCookie, maxAge: 7 * 24 * 60 * 60 * 1000 });
        // A resposta da sessão é a única fonte do perfil e do token CSRF para a interface.
        const { csrf, ...usuario } = await contas.consultar(sessao.token);
        resposta.status(status).json({ usuario, csrf });
      } finally { operacoesSenha--; }
    };
  }
  rotas.post('/cadastro', limitar, autenticar('cadastrar', 201));
  rotas.post('/entrada', limitar, autenticar('entrar', 200));
  rotas.post('/recuperacao', limitarPedidos, async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    const inicio = performance.now();
    try { await recuperacao.solicitar(requisicao.body); }
    catch (erro) {
      if (erro.status === 400) throw erro;
      // A resposta não revela se o endereço existe nem se houve falha na entrega.
      console.error('Falha ao preparar recuperação de senha (' + (erro.code || 'erro interno') + ').');
    } finally { await aguardar(Math.max(0, 500 - (performance.now() - inicio))); }
    resposta.status(202).json({ mensagem: 'Se houver uma conta com esse e-mail, uma mensagem de teste ficará disponível neste computador. Aguarde um minuto antes de solicitar novamente.', entrega: 'local' });
  });
  rotas.post('/recuperacao/validar', limitarLinks, async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    resposta.json(await recuperacao.validar(requisicao.body));
  });
  rotas.post('/recuperacao/redefinir', limitarRedefinicoes, async (requisicao, resposta) => {
    if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
    if (operacoesSenha >= 2) throw new ErroConta(503, 'Servidor ocupado. Tente novamente em alguns segundos.');
    operacoesSenha++;
    try {
      await recuperacao.redefinir(requisicao.body);
      resposta.json({ mensagem: 'Senha atualizada. Entre novamente com sua nova senha.' });
    } finally { operacoesSenha--; }
  });
  rotas.get('/sessao', (requisicao, resposta) => {
    if (!requisicao.usuario) { limparCookie(resposta); return resposta.json({ usuario: null }); }
    const { csrf, ...usuario } = requisicao.usuario;
    resposta.json({ usuario, csrf });
  });
  rotas.post('/saida', exigirConta, conferirCsrf, async (requisicao, resposta) => {
    await contas.sair(requisicao.tokenSessao);
    limparCookie(resposta);
    resposta.json({ saiu: true });
  });
  aplicacao.use('/api/contas', rotas);
  aplicacao.use('/api', exigirConta, conferirCsrf);
}

function exigirConta(requisicao, resposta, proximo) {
  if (!requisicao.usuario) {
    limparCookie(resposta);
    return resposta.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }
  proximo();
}
function conferirCsrf(requisicao, resposta, proximo) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(requisicao.method)) {
    const recebido = requisicao.get('X-CSRF-Token') ?? '';
    if (!/^[a-f0-9]{64}$/.test(recebido) || !timingSafeEqual(Buffer.from(recebido), Buffer.from(requisicao.usuario.csrf))) {
      return resposta.status(403).json({ erro: 'Sua sessão mudou. Atualize a página antes de continuar.' });
    }
  }
  proximo();
}
