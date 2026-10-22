const CHAVE = 'dayvilo-analytics-v1';
const PRAZO = 180 * 24 * 60 * 60 * 1000;
const TELAS = { inicio: 'Apresentação', entrar: 'Entrar', cadastro: 'Cadastro', rotina: 'Rotina', casa: 'Casa', treino: 'Treino', financeiro: 'Financeiro', alimentacao: 'Alimentação', leitura: 'Leitura', conta: 'Minha conta', boas_vindas: 'Boas-vindas' };
const EVENTOS = new Set(['sign_up', 'login', 'create_task', 'start_signup']);

// Dependências injetáveis permitem testar sem carregar scripts ou enviar dados ao Google.
export function criarAnalytics(w, d, agora = Date.now) {
  const id = d.querySelector('meta[name="dayvilo-analytics"]')?.content || '';
  const habilitado = /^G-[A-Z0-9]{5,20}$/.test(id);
  let escolha = null, iniciado = false, tela = null, ultima = null;
  try { const r = JSON.parse(w.localStorage.getItem(CHAVE)); if (r?.versao === 1 && r.expira > agora() && ['aceito', 'recusado'].includes(r.valor)) escolha = r; } catch {}
  const permitido = () => habilitado && escolha?.valor === 'aceito' && escolha.expira > agora() && !/^#(?:redefinir-senha|confirmar-email|alterar-email|recuperar-senha)/.test(w.location.hash);
  function limparCookies() {
    for (const parte of d.cookie.split(';')) {
      const nome = parte.trim().split('=')[0]; if (!/^_ga(?:_|$)/.test(nome)) continue;
      const dominio = w.location.hostname.split('.');
      d.cookie = `${nome}=; Max-Age=0; Path=/; SameSite=Lax`;
      while (dominio.length > 1) { d.cookie = `${nome}=; Max-Age=0; Path=/; Domain=${dominio.join('.')}; SameSite=Lax`; dominio.shift(); }
    }
  }
  function iniciar() {
    if (!permitido()) return false;
    w[`ga-disable-${id}`] = false;
    if (iniciado) return true;
    iniciado = true; w.dataLayer = w.dataLayer || [];
    // gtag usa objetos Arguments, não arrays, ao processar a fila.
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    w.gtag('js', new Date(agora()));
    let referencia = '';
    try { const r = new URL(d.referrer); if (['www.google.com', 'www.google.com.br', 'www.instagram.com', 'l.instagram.com', 'www.linkedin.com'].includes(r.hostname)) referencia = r.origin + '/'; } catch {}
    w.gtag('config', id, { send_page_view: false, page_location: w.location.origin + '/', page_referrer: referencia, page_title: 'Dayvilo', allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 60 * 24 * 60 * 60, cookie_update: false });
    const script = d.createElement('script'); script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    d.head.appendChild(script);
    return true;
  }
  function pagina(nome) {
    tela = Object.hasOwn(TELAS, nome) ? nome : null;
    if (!permitido()) { if (habilitado) w[`ga-disable-${id}`] = true; ultima = null; return; }
    if (!tela || tela === ultima || !iniciar()) return;
    ultima = tela;
    w.gtag('event', 'page_view', { page_title: `Dayvilo · ${TELAS[tela]}`, page_location: `${w.location.origin}/#${tela}`, send_to: id });
  }
  function escolher(valor, salvar = true) {
    if (!['aceito', 'recusado'].includes(valor)) return;
    escolha = { versao: 1, valor, expira: agora() + PRAZO };
    if (salvar) { try { w.localStorage.setItem(CHAVE, JSON.stringify(escolha)); } catch {} }
    if (valor === 'recusado') { if (habilitado) w[`ga-disable-${id}`] = true; ultima = null; limparCookies(); }
    else pagina(tela);
    w.dispatchEvent(new Event('dayvilo:privacidade-atualizada'));
  }
  w.addEventListener('storage', e => { if (e.key !== CHAVE) return; try { const r = JSON.parse(e.newValue); escolher(r?.expira > agora() ? r.valor : 'recusado', false); } catch { escolher('recusado', false); } });
  w.addEventListener('hashchange', () => { if (!permitido() && habilitado) { w[`ga-disable-${id}`] = true; ultima = null; } });
  return {
    habilitado, pagina, escolher,
    preferencia: () => escolha?.expira > agora() ? escolha.valor : null,
    evento(nome) { if (EVENTOS.has(nome) && tela && permitido() && iniciar()) w.gtag('event', nome, { page_location: `${w.location.origin}/#${tela}`, page_title: `Dayvilo · ${TELAS[tela]}`, send_to: id }); },
  };
}
let instancia;
export function analytics() { if (typeof window === 'undefined') return null; return instancia ||= criarAnalytics(window, document); }
export function registrarEvento(nome) { try { analytics()?.evento(nome); } catch { /* Medição nunca impede uma ação do usuário. */ } }
export function abrirPrivacidade() { window.dispatchEvent(new Event('dayvilo:abrir-privacidade')); }
