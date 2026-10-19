import { useEffect, useId, useRef, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import './instalar-dayvilo.css';

function dispositivoInicial() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return /Android/.test(navigator.userAgent) ? 'android' : 'computador';
}

function Instrucoes({ instalacao, fechar }) {
  const dialogo = useRef(null), botaoFechar = useRef(null), titulo = useId();
  const [dispositivo, setDispositivo] = useState(dispositivoInicial);
  useEffect(() => {
    const anterior = document.activeElement, rolagem = document.body.style.overflow;
    const bloquear = !document.querySelector('dialog[open]');
    dialogo.current.showModal();
    if (bloquear) document.body.style.overflow = 'hidden';
    botaoFechar.current.focus();
    return () => {
      dialogo.current?.close();
      if (bloquear) document.body.style.overflow = rolagem;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);
  return <dialog ref={dialogo} className="instalacao-dialogo" aria-labelledby={titulo} onCancel={e => { e.preventDefault(); fechar(); }}>
    <header><h2 id={titulo}><Smartphone size={22} aria-hidden="true" />Instalar Dayvilo</h2><button ref={botaoFechar} type="button" aria-label="Fechar instruções de instalação" onClick={fechar}><X size={22} aria-hidden="true" /></button></header>
    {instalacao.instalado ? <p role="status">O Dayvilo já está aberto como aplicativo ou a instalação foi confirmada neste navegador.</p> : <>
      <p>Acesse pelo ícone na tela inicial. Seus dados continuam na mesma conta e o Dayvilo precisa de internet.</p>
      {instalacao.disponivel && <button type="button" className="botao-principal instalacao-acao" disabled={instalacao.ocupado} onClick={instalacao.instalar}><Download size={18} aria-hidden="true" />Instalar agora</button>}
      <label className="instalacao-dispositivo">Seu dispositivo<select value={dispositivo} onChange={e => setDispositivo(e.target.value)}><option value="android">Android</option><option value="ios">iPhone ou iPad</option><option value="computador">Computador</option></select></label>
      {dispositivo === 'ios' ? <ol><li>Abra o Dayvilo no Safari.</li><li>Abra o menu de compartilhamento e escolha <strong>Adicionar à Tela de Início</strong>.</li><li>Se aparecer <strong>Abrir como App</strong>, mantenha ativado. Confirme em <strong>Adicionar</strong>.</li></ol> : dispositivo === 'android' ? <ol><li>Abra o Dayvilo no Chrome, fora de aplicativos como Instagram ou WhatsApp.</li><li>Abra o menu de três pontos do navegador.</li><li>Procure <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong> e siga a confirmação.</li></ol> : <ol><li>Abra o Dayvilo no Chrome ou Edge.</li><li>Procure o ícone de instalação na barra de endereço ou a opção de instalar no menu do navegador.</li><li>Confirme para criar o acesso ao Dayvilo.</li></ol>}
      <p className="instalacao-nota">Os nomes das opções variam conforme o navegador. Se não aparecerem, tente um navegador atualizado. Você pode continuar usando o site normalmente.</p>
    </>}
    {instalacao.ocupado && <p role="status" className="instalacao-retorno">Conclua a escolha na janela do navegador.</p>}
    {instalacao.mensagem && <p role="status" className="instalacao-retorno">{instalacao.mensagem}</p>}
  </dialog>;
}

export default function InstalarDayvilo({ instalacao, painel = false }) {
  const [aberto, setAberto] = useState(false);
  if (!painel && !aberto && (instalacao.instalado || instalacao.oculto)) return null;
  return <>
    <section className={painel ? 'conta-painel instalacao-painel' : 'instalacao-convite'} aria-label="Instalação do Dayvilo">
      <div>{painel ? <h2>Dayvilo no seu dispositivo</h2> : <strong>Seu dia a um toque</strong>}
        <p>{instalacao.instalado ? 'Você já está usando como aplicativo ou instalou nesta abertura.' : 'Adicione o Dayvilo à tela inicial para acessar com facilidade.'}</p>
      </div>
      {!instalacao.instalado && <button type="button" className="botao-secundario instalacao-acao" onClick={() => setAberto(true)}><Download size={17} aria-hidden="true" />Instalar Dayvilo</button>}
      {!painel && <button type="button" className="instalacao-fechar" aria-label="Dispensar convite de instalação" title="Você pode instalar depois em Minha conta" onClick={instalacao.dispensar}><X size={18} aria-hidden="true" /></button>}
    </section>
    {aberto && <Instrucoes instalacao={instalacao} fechar={() => setAberto(false)} />}
  </>;
}
