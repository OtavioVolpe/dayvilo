import { timingSafeEqual } from 'node:crypto';

export const nomeCookie = 'dayvilo_sessao';
export const opcoesCookie = { httpOnly: true, sameSite: 'strict', path: '/api' };
export const lerCookie = requisicao => (requisicao.headers.cookie ?? '').split(';').map(parte => parte.trim()).find(parte => parte.startsWith(`${nomeCookie}=`))?.slice(nomeCookie.length + 1);
export const limparCookie = resposta => resposta.clearCookie(nomeCookie, { ...opcoesCookie, secure: resposta.locals.cookieSeguro === true });

export function exigirConta(requisicao, resposta, proximo) {
  if (!requisicao.usuario) {
    limparCookie(resposta);
    return resposta.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }
  proximo();
}
export function conferirCsrf(requisicao, resposta, proximo) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(requisicao.method)) {
    const recebido = requisicao.get('X-CSRF-Token') ?? '';
    if (!/^[a-f0-9]{64}$/.test(recebido) || !timingSafeEqual(Buffer.from(recebido), Buffer.from(requisicao.usuario.csrf))) {
      return resposta.status(403).json({ erro: 'Sua sessão mudou. Atualize a página antes de continuar.' });
    }
  }
  proximo();
}

export function carregarSessao(contas) {
  return async (requisicao, resposta, proximo) => {
    resposta.set('Cache-Control', 'no-store');
    requisicao.tokenSessao = lerCookie(requisicao);
    requisicao.usuario = await contas.consultar(requisicao.tokenSessao);
    // Um header não simples exige preflight em chamadas entre origens.
    // A API não habilita CORS; formulários externos não conseguem enviar este header.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(requisicao.method) && requisicao.get('X-Dayvilo') !== '1') {
      return resposta.status(403).json({ erro: 'Requisição não permitida. Atualize a página.' });
    }
    proximo();
  };
}
