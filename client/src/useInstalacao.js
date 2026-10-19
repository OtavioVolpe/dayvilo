import { useEffect, useRef, useState } from 'react';

const chave = 'dayvilo-convite-instalacao-oculto';
function estaNoAplicativo() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export default function useInstalacao() {
  const evento = useRef(null), trava = useRef(false);
  const [disponivel, setDisponivel] = useState(false);
  const [instalado, setInstalado] = useState(estaNoAplicativo);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(chave) === 'sim'; } catch { return false; }
  });
  useEffect(() => {
    const modo = window.matchMedia('(display-mode: standalone)');
    const pronto = e => {
      e.preventDefault(); evento.current = e; setDisponivel(true);
    };
    const concluir = () => {
      evento.current = null; setDisponivel(false); setInstalado(true);
      setMensagem('Dayvilo instalado. Você já pode abri-lo pelo ícone.');
    };
    const atualizarModo = () => { if (estaNoAplicativo()) concluir(); };
    window.addEventListener('beforeinstallprompt', pronto);
    window.addEventListener('appinstalled', concluir);
    modo.addEventListener('change', atualizarModo);
    return () => {
      window.removeEventListener('beforeinstallprompt', pronto);
      window.removeEventListener('appinstalled', concluir);
      modo.removeEventListener('change', atualizarModo);
    };
  }, []);
  function dispensar() {
    setOculto(true);
    try { localStorage.setItem(chave, 'sim'); } catch { /* A escolha vale nesta abertura. */ }
  }
  async function instalar() {
    if (trava.current) return;
    const pedido = evento.current;
    if (!pedido) return;
    trava.current = true; evento.current = null;
    setDisponivel(false); setOcupado(true); setMensagem('');
    try {
      await pedido.prompt();
      const escolha = await pedido.userChoice;
      setMensagem(escolha.outcome === 'accepted'
        ? 'Solicitação aceita. Aguarde o navegador concluir a instalação.'
        : 'Instalação cancelada. Você pode continuar usando pelo navegador.');
    } catch {
      setMensagem('Não foi possível abrir a instalação. Consulte as instruções abaixo ou use o menu do navegador.');
    } finally { trava.current = false; setOcupado(false); }
  }
  return { disponivel, instalado, ocupado, mensagem, oculto, dispensar, instalar };
}
