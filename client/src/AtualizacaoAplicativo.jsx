import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { obterEscritasPendentes } from './api.js';
import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import './atualizacao.css';

export default function AtualizacaoAplicativo() {
  const [disponivel, setDisponivel] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(() => obterEscritasPendentes() > 0);

  useEffect(() => {
    const acompanhar = () => setSalvando(obterEscritasPendentes() > 0);
    window.addEventListener('dayvilo:escritas', acompanhar);
    return () => window.removeEventListener('dayvilo:escritas', acompanhar);
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || disponivel) return;
    let encerrado = false;
    let consultando = false;
    let ultimaConsulta = 0;
    const controle = new AbortController();
    async function conferir() {
      if (document.visibilityState !== 'visible' || consultando || Date.now() - ultimaConsulta < 30000) return;
      ultimaConsulta = Date.now();
      consultando = true;
      try {
        const resposta = await fetch('/versao.json', {
          cache: 'no-store', credentials: 'omit',
          signal: AbortSignal.any([controle.signal, AbortSignal.timeout(10000)]),
        });
        if (!resposta.ok) return;
        const dados = await resposta.json();
        if (!encerrado && typeof dados.versao === 'string' && /^[a-f0-9-]{36}$/.test(dados.versao) && dados.versao !== __DAYVILO_VERSAO__) setDisponivel(true);
      } catch {
        // A consulta será repetida ao voltar ou no próximo intervalo.
      } finally { consultando = false; }
    }
    conferir();
    const intervalo = window.setInterval(conferir, 300000);
    window.addEventListener('focus', conferir);
    window.addEventListener('online', conferir);
    document.addEventListener('visibilitychange', conferir);
    return () => {
      encerrado = true;
      controle.abort();
      window.clearInterval(intervalo);
      window.removeEventListener('focus', conferir);
      window.removeEventListener('online', conferir);
      document.removeEventListener('visibilitychange', conferir);
    };
  }, [disponivel]);

  if (!disponivel) return null;
  return <>
    <aside className="atualizacao-aplicativo" aria-label="Atualização do Dayvilo">
      <RefreshCw size={22} aria-hidden="true" />
      <div role="status"><strong>Tem novidade no Dayvilo</strong><p>{salvando ? 'Aguarde o salvamento terminar para atualizar.' : 'Salve o que estiver preenchendo e atualize para usar a nova versão.'}</p></div>
      <button className="botao-principal" type="button" disabled={salvando} onClick={() => setConfirmando(true)}>Atualizar agora</button>
    </aside>
    {confirmando && <ConfirmacaoTreino titulo="Atualizar o Dayvilo?" rotulo="Atualizar página" ocupado={salvando}
      mensagem="A página será recarregada. Confira se salvou o que estava preenchendo antes de continuar."
      cancelar={() => setConfirmando(false)} confirmar={() => { if (!obterEscritasPendentes()) window.location.reload(); }} />}
  </>;
}
