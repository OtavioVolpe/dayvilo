export function protegerProducao(urlAplicacao, analyticsAtivo = false) {
  const url = new URL(urlAplicacao);
  const scripts = analyticsAtivo ? ' https://www.googletagmanager.com' : '';
  const coleta = analyticsAtivo ? ' https://*.google-analytics.com https://*.analytics.google.com' : '';
  return (requisicao, resposta, proximo) => {
    resposta.set({
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': `default-src 'self'; script-src 'self'${scripts}; style-src 'self' 'unsafe-inline'; img-src 'self' data:${coleta}; font-src 'self'; connect-src 'self'${coleta}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
    });
    // Verifica Host diretamente: X-Forwarded-Host não define o endereço público.
    if (requisicao.headers.host?.toLowerCase() !== url.host.toLowerCase()
      || (requisicao.headers.origin && requisicao.headers.origin !== url.origin)) {
      return resposta.status(403).json({ erro: 'Origem não permitida.' });
    }
    if (!requisicao.secure) return resposta.status(403).json({ erro: 'Acesse o Dayvilo pelo endereço HTTPS.' });
    proximo();
  };
}
