export function lerConfiguracao(ambiente = process.env) {
  const producao = ambiente.NODE_ENV === 'production';
  const porta = Number(ambiente.PORT || 3001);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT inválida.');
  const endereco = ambiente.HOST || (producao ? '0.0.0.0' : '127.0.0.1');
  if (!producao && !['127.0.0.1', 'localhost', '::1'].includes(endereco)) throw new Error('O modo local aceita apenas acesso pelo próprio computador.');
  let url;
  try { url = new URL(ambiente.URL_APLICACAO || (producao ? '' : 'http://127.0.0.1:5173/')); }
  catch { throw new Error('Configure URL_APLICACAO com o endereço completo do site.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || !['http:', 'https:'].includes(url.protocol)
    || (producao && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('URL_APLICACAO deve apontar para a raiz do site, com HTTPS em produção.');
  }
  const proxySaltos = Number(ambiente.PROXY_SALTOS || 0);
  if (![0, 1].includes(proxySaltos)) throw new Error('PROXY_SALTOS deve ser 0 ou 1.');
  if (ambiente.CADASTRO_ABERTO !== undefined && !['true', 'false'].includes(ambiente.CADASTRO_ABERTO)) throw new Error('CADASTRO_ABERTO deve ser true ou false.');
  if (producao && ambiente.EMAIL_MODO !== 'resend') throw new Error('Produção exige EMAIL_MODO=resend.');
  return { producao, porta, endereco, urlAplicacao: url.href, proxySaltos: producao ? proxySaltos : 0,
    cadastroAberto: ambiente.CADASTRO_ABERTO === undefined ? !producao : ambiente.CADASTRO_ABERTO === 'true' };
}
