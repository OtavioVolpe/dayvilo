export function criarLimitador(maximo) {
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
