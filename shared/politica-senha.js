export function requisitosSenha(senha) {
  const valor = typeof senha === 'string' ? senha : '';
  const tamanho = [...valor].length;
  return [
    { texto: 'De 8 a 128 caracteres', atende: tamanho >= 8 && tamanho <= 128 },
    { texto: 'Uma letra maiúscula', atende: /\p{Lu}/u.test(valor) },
    { texto: 'Uma letra minúscula', atende: /\p{Ll}/u.test(valor) },
    { texto: 'Um número', atende: /\p{Nd}/u.test(valor) },
    { texto: 'Um símbolo (como !, @ ou #)', atende: /[\p{P}\p{S}]/u.test(valor) },
  ];
}
export function erroSenhaNova(senha) {
  return requisitosSenha(senha).every(r => r.atende) ? '' : 'Use de 8 a 128 caracteres, com maiúscula, minúscula, número e símbolo.';
}

// A estimativa não substitui os requisitos e não garante segurança.
export function nivelSenha(senha, score) {
  if (erroSenhaNova(senha) || score < 2) return 1;
  return [...senha].length >= 15 && score >= 3 ? 3 : 2;
}
