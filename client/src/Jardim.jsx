import { useEffect, useRef, useState } from 'react';
import { Sprout, RotateCcw } from 'lucide-react';
import { desenharArvore } from './arvore.js';
import './jardim.css';

function Arvore({total,replay}) {
  const canvas=useRef(null), exibido=useRef(Math.max(0,Math.min(total,30)-1)), ultimaRepeticao=useRef(replay);
  useEffect(()=>{
    const elemento=canvas.current, reduzido=window.matchMedia('(prefers-reduced-motion: reduce)');
    const repetir=ultimaRepeticao.current!==replay;ultimaRepeticao.current=replay;
    const inicio=repetir?0:exibido.current, destino=Math.min(total,30), tempo=performance.now();
    let frame;const duracao=repetir?6500:1100;
    function pintar(agora){const t=reduzido.matches?1:Math.min(1,(agora-tempo)/duracao);exibido.current=inicio+(destino-inicio)*(repetir?t:1-Math.pow(1-t,3));desenharArvore(elemento,exibido.current);if(t<1)frame=requestAnimationFrame(pintar);}
    frame=requestAnimationFrame(pintar);
    const resize=new ResizeObserver(()=>desenharArvore(elemento,exibido.current));resize.observe(elemento);
    function reduzir(){if(reduzido.matches){cancelAnimationFrame(frame);exibido.current=destino;desenharArvore(elemento,destino);}}
    reduzido.addEventListener('change',reduzir);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();reduzido.removeEventListener('change',reduzir);};
  },[total,replay]);
  return <canvas ref={canvas} className="arvore-canvas" role="img" aria-label={total===0?'Árvore com tronco e galhos, ainda sem folhas':total<20?'Sua árvore com folhas e galhos em crescimento':'Sua árvore com copa desenvolvida e flores'}/>;
}

export function ProgressoJardim({jardim}) {
  const [completo,setCompleto]=useState(false);
  useEffect(()=>{if(!jardim.novasPlantas){setCompleto(false);return;}setCompleto(true);const timer=setTimeout(()=>setCompleto(false),1500);return()=>clearTimeout(timer);},[jardim.total,jardim.novasPlantas]);
  const valor=completo?jardim.alvo:jardim.atual;
  return <section className="jardim-progresso" aria-label="Progresso da árvore"><div className="jardim-linha"><div><Sprout size={21} aria-hidden="true"/><strong>Próximo crescimento</strong></div><span>{valor} de {jardim.alvo} metas</span></div><progress max={jardim.alvo} value={valor} aria-label="Metas cumpridas neste ciclo"/><p role="status">{completo?'Ciclo completo! Sua árvore cresceu.': 'Cada meta alimenta sua árvore. A contagem reinicia a cada 5; o crescimento permanece.'}</p></section>;
}

export default function Jardim({jardim}) {
  const [replay,setReplay]=useState(0);
  const total=jardim.total;
  const etapa=total===0?'O começo':total<5?'Primeiras folhas':total<10?'Novos galhos':total<20?'Uma copa mais cheia':'Tempo de florescer';
  return <section className="arvore-secao" aria-labelledby="titulo-arvore"><header><h2 id="titulo-arvore">Minha árvore</h2><p>Pequenos compromissos criam raízes.</p></header><div className="arvore-cena"><Arvore total={total} replay={replay}/><div className="arvore-legenda"><span>{total} {total===1?'meta cumprida':'metas cumpridas'}</span><span>{etapa}</span></div></div><div className="arvore-acoes"><button className="botao-secundario" disabled={!total} onClick={()=>setReplay(v=>v+1)}><RotateCcw size={15} aria-hidden="true"/>Rever crescimento</button><span>{Math.floor(total/5)} {Math.floor(total/5)===1?'ciclo completo':'ciclos completos'}</span></div><p className="jardim-nota">Sua árvore não perde folhas nos dias de descanso. Conquistas registradas permanecem mesmo ao editar, desfazer ou remover uma meta.</p>{total>=30&&<p className="jardim-nota">Sua árvore está florida. As próximas conquistas continuam somando metas e ciclos.</p>}</section>;
}
