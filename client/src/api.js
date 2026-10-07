let csrf = '';
export function definirCsrf(valor) { csrf = valor ?? ''; }

export async function solicitar(caminho, opcoes = {}) {
  const metodo = (opcoes.method || 'GET').toUpperCase();
  const escrita = !['GET', 'HEAD'].includes(metodo);
  const falhaResposta = () => new Error(escrita
    ? caminho.startsWith('/tarefas')
      ? 'Não foi possível confirmar a ação. Recarregue a lista antes de repetir.'
      : 'Não foi possível confirmar a ação. Verifique a conexão antes de tentar novamente.'
    : 'Não foi possível carregar. Verifique a conexão e tente novamente.');
  const headers = new Headers(opcoes.headers);
  if (escrita) {
    headers.set('X-Dayvilo', '1');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  let resposta;
  const limite = AbortSignal.timeout(90000);
  const signal = opcoes.signal ? AbortSignal.any([opcoes.signal, limite]) : limite;
  try { resposta = await fetch(`/api${caminho}`, { ...opcoes, method: metodo, headers, signal, credentials: 'same-origin' }); }
  catch { throw falhaResposta(); }
  if (resposta.status === 401 && !caminho.startsWith('/contas/entrada')) {
      definirCsrf('');
      window.dispatchEvent(new Event('dayvilo:sessao-expirada'));
  }
  let dados;
  try { dados = await resposta.json(); } catch { throw falhaResposta(); }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw falhaResposta();
  if (!resposta.ok) {
    if (resposta.status >= 500) throw falhaResposta();
    throw new Error(typeof dados.erro === 'string' ? dados.erro : 'Não foi possível completar a ação.');
  }
  if (Object.keys(dados).length === 0) throw falhaResposta();
  return dados;
}
