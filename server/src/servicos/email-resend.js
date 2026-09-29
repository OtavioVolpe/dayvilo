import { validarEmail } from './autenticacao.js';
const falha = codigo => Object.assign(new Error('Não foi possível enviar a mensagem pelo Resend.'), { code: codigo });
export function criarEntregaResend({ chave, remetente, destinatarioTeste, requisitar = fetch }) {
  if (typeof chave !== 'string' || !/^re_[^\s]+$/.test(chave)) throw new Error('Preencha RESEND_API_KEY no server/.env.');
  if (typeof remetente !== 'string' || /[\r\n]/.test(remetente)) throw new Error('EMAIL_REMETENTE inválido.');
  const endereco = remetente.match(/<([^<>]+)>$/)?.[1] ?? remetente;
  try { validarEmail(endereco); } catch { throw new Error('EMAIL_REMETENTE inválido.'); }
  let permitido;
  if (destinatarioTeste?.trim()) {
    try { permitido = validarEmail(destinatarioTeste); } catch { throw new Error('RESEND_DESTINATARIO_TESTE inválido.'); }
  }
  if (endereco.toLowerCase().endsWith('@resend.dev') && !permitido) throw new Error('Informe RESEND_DESTINATARIO_TESTE com o e-mail da sua conta Resend.');
  return async ({ para, assunto, texto }) => {
    // Nunca redirecionar o link de outra conta para o endereço de teste.
    if (permitido && validarEmail(para) !== permitido) throw falha('RESEND_DESTINATARIO_NAO_PERMITIDO');
    try {
      const resposta = await requisitar('https://api.resend.com/emails', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: remetente, to: [para], subject: assunto, text: texto }),
      });
      if (!resposta.ok) throw falha(`RESEND_HTTP_${resposta.status}`);
      const dados = await resposta.json();
      if (typeof dados.id !== 'string' || !dados.id) throw falha('RESEND_RESPOSTA_INVALIDA');
    } catch (erro) {
      // Não propagar respostas externas que possam conter dados privados.
      if (/^RESEND_(HTTP_\d{3}|RESPOSTA_INVALIDA)$/.test(erro.code ?? '')) throw erro;
      throw falha('RESEND_CONEXAO');
    }
  };
}
