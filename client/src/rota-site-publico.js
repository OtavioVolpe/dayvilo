// Fragmentos antigos nunca são enviados em query strings, logs ou eventos.
export function destinoLegado(hash, urlApp, instalado = false) {
  if (/^#(?:entrar|criar-conta|recuperar-senha)$/.test(hash)
    || /^#(?:redefinir-senha|confirmar-email|alterar-email)=/.test(hash)) return urlApp + hash;
  return instalado && (!hash || hash === '#inicio') ? urlApp + '#entrar' : null;
}
