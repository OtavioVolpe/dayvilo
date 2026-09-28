import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';

export default function MenuTarefa({ titulo, opcoes, bloqueado }) {
  const id = useId();
  const botaoRef = useRef(null);
  const painelRef = useRef(null);
  const [aberto, definirAberto] = useState(false);
  const [posicao, definirPosicao] = useState(null);
  useLayoutEffect(() => {
    if (!aberto) return;
    const botao = botaoRef.current.getBoundingClientRect();
    const painel = painelRef.current.getBoundingClientRect();
    const abaixo = botao.bottom + 6;
    definirPosicao({
      left: Math.max(12, Math.min(botao.right - painel.width, window.innerWidth - painel.width - 12)),
      top: abaixo + painel.height <= window.innerHeight - 12 ? abaixo : Math.max(12, botao.top - painel.height - 6),
    });
  }, [aberto]);
  useEffect(() => {
    if (!aberto) return;
    const fechar = evento => {
      if (evento.type === 'scroll' && evento.target instanceof Node && painelRef.current?.contains(evento.target)) return;
      painelRef.current?.hidePopover();
    };
    window.addEventListener('resize', fechar);
    window.addEventListener('scroll', fechar, true);
    return () => { window.removeEventListener('resize', fechar); window.removeEventListener('scroll', fechar, true); };
  }, [aberto]);
  useEffect(() => { if (bloqueado) painelRef.current?.hidePopover(); }, [bloqueado]);
  if (!opcoes.length) return null;
  return <>
    <button ref={botaoRef} type="button" className="botao-mais-acoes" disabled={bloqueado}
      aria-label={'Mais opções: ' + titulo} title="Mais opções" aria-expanded={aberto}
      aria-controls={id} popoverTarget={id}><Ellipsis size={20} aria-hidden="true" /></button>
    <div ref={painelRef} id={id} popover="auto" className="menu-tarefa" role="group"
      aria-label={'Opções de ' + titulo} style={{ ...posicao, visibility: aberto && posicao ? 'visible' : 'hidden' }}
      onToggle={evento => { const visivel = evento.newState === 'open'; definirAberto(visivel); if (!visivel) definirPosicao(null); }}>
      {opcoes.map(({ texto, Icone, executar, desabilitada, separador }) => <button key={texto}
        type="button" className={separador ? 'menu-separador' : undefined}
        disabled={bloqueado || desabilitada} onClick={() => { painelRef.current.hidePopover(); executar(); }}>
        <Icone size={17} aria-hidden="true" /><span>{texto}</span>
      </button>)}
    </div>
  </>;
}
