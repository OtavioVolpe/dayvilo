let csrf = '';
export function definirCsrf(valor) { csrf = valor ?? ''; }

export async function solicitar(caminho, opcoes = {}) {
  const headers = new Headers(opcoes.headers);
  if (opcoes.method && !['GET', 'HEAD'].includes(opcoes.method)) {
    headers.set('X-Dayvilo', '1');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  let resposta;
  try { resposta = await fetch(`/api${caminho}`, { ...opcoes, headers, credentials: 'same-origin' }); }
  catch { throw new Error('Não foi possível conectar. Verifique a conexão e tente novamente.'); }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    if (resposta.status === 401 && !caminho.startsWith('/contas/entrada')) {
      definirCsrf('');
      window.dispatchEvent(new Event('dayvilo:sessao-expirada'));
    }
    throw new Error(dados.erro || 'Não foi possível completar a ação.');
  }
  return dados;
}
