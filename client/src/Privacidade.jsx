import { useEffect, useRef, useState } from 'react';
import { analytics } from './analytics.js';
import './privacidade.css';

export default function Privacidade({ tela }) {
  const [aberto, setAberto] = useState(() => typeof window !== 'undefined' && window.location.hash === '#preferencias-privacidade'), [preferencia, setPreferencia] = useState(() => analytics()?.preferencia());
  const painel = useRef(null);
  const ativo = analytics()?.habilitado;
  useEffect(() => { try { analytics()?.pagina(tela); } catch {} }, [tela]);
  useEffect(() => {
    const abrir = () => { setAberto(true); };
    const rota = () => { if (window.location.hash === '#preferencias-privacidade') abrir(); };
    const atualizar = () => setPreferencia(analytics()?.preferencia());
    window.addEventListener('dayvilo:abrir-privacidade', abrir); window.addEventListener('dayvilo:privacidade-atualizada', atualizar);
    window.addEventListener('hashchange', rota);
    return () => { window.removeEventListener('dayvilo:abrir-privacidade', abrir); window.removeEventListener('dayvilo:privacidade-atualizada', atualizar); window.removeEventListener('hashchange', rota); };
  }, []);
  useEffect(() => { if (aberto) { painel.current?.focus({ preventScroll: true }); } }, [aberto]);
  if (!aberto && (!ativo || preferencia || !tela)) return null;
  function escolher(valor) { analytics()?.escolher(valor); setPreferencia(valor); setAberto(false); }
  return <section className="privacidade-painel" aria-labelledby="privacidade-titulo" tabIndex={-1} ref={painel}>
    <div className="privacidade-conteudo"><h2 id="privacidade-titulo">Sua privacidade, sua escolha</h2>
    <p>Podemos usar cookies do Google Analytics para entender o uso e melhorar o Dayvilo? Você pode recusar e continuar usando normalmente.</p>
    <details open={aberto}><summary>Como usamos esses dados</summary>
    <p>Não enviamos nomes, e-mails, senhas, textos das tarefas, anotações ou valores financeiros. O Google recebe informações técnicas do acesso e eventos de uso. Não usamos esta integração para anúncios nem gravação da tela.</p>
    <p>Sua escolha fica neste navegador e endereço por até 180 dias. A apresentação e o aplicativo em endereços diferentes têm escolhas separadas. Você pode alterá-la em “Preferências de medição” na apresentação ou em Minha conta. Recusar interrompe novas medições neste endereço e remove os cookies do Analytics acessíveis a ele; não apaga dados já enviados.</p>
    <p><a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade e Cookies do Dayvilo</a></p>
    <p><a href="https://policies.google.com/privacy?hl=pt-BR" target="_blank" rel="noreferrer">Privacidade do Google</a> · Dúvidas: <a href="mailto:dayviloapp@gmail.com">dayviloapp@gmail.com</a></p>
    </details>
    {!ativo && <p>A medição ainda não está ativada neste ambiente.</p>}
    {preferencia && <p>Escolha atual: {preferencia === 'aceito' ? 'medição permitida' : 'medição recusada'}.</p>}
    </div><div className="privacidade-acoes"><button type="button" className="botao-secundario" onClick={() => escolher('recusado')}>Recusar medição</button><button type="button" className="botao-secundario" onClick={() => escolher('aceito')}>Aceitar medição</button>{aberto && <button type="button" className="botao-secundario" onClick={() => setAberto(false)}>Fechar</button>}</div>
  </section>;
}
