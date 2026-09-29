import { criarEntregaLocal } from './email-local.js';
import { criarEntregaResend } from './email-resend.js';
export function configurarEmail(ambiente = process.env) {
  const modoEmail = ambiente.EMAIL_MODO || 'local';
  if (modoEmail === 'local') return { modoEmail, enviarEmail: criarEntregaLocal() };
  if (modoEmail !== 'resend') throw new Error('EMAIL_MODO deve ser local ou resend.');
  return { modoEmail, enviarEmail: criarEntregaResend({
    chave: ambiente.RESEND_API_KEY,
    remetente: ambiente.EMAIL_REMETENTE || 'Dayvilo <onboarding@resend.dev>',
    destinatarioTeste: ambiente.RESEND_DESTINATARIO_TESTE,
  }) };
}
