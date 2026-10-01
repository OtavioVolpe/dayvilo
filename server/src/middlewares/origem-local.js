export function restringirOrigemLocal(porta) {
  const origens = new Set([`http://127.0.0.1:${porta}`, `http://localhost:${porta}`, 'http://127.0.0.1:5173', 'http://localhost:5173']);
  // Acesso local: mantém a API restrita ao computador durante o uso local.
  return (requisicao, resposta, proximo) => {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(requisicao.hostname)
      || (requisicao.headers.origin && !origens.has(requisicao.headers.origin))) {
      return resposta.status(403).json({ erro: 'Origem não permitida.' });
    }
    proximo();
  };
}
