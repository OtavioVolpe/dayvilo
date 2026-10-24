import { useEffect, useState } from 'react';
import { Sprout, RotateCcw } from 'lucide-react';
import { formatarData } from './datas.js';
import './jardim.css';

function Planta({animada=false}) {
  return <div className={`jardim-planta${animada?' jardim-crescendo':''}`} role="img" aria-label="Uma margarida com folhas verdes e pétalas douradas">
    <svg viewBox="0 0 200 240" aria-hidden="true">
      <ellipse cx="100" cy="218" rx="66" ry="9" fill="currentColor" opacity=".1"/>
      <path className="jardim-caule" d="M100 212 Q90 165 100 76" fill="none" stroke="#76b78d" strokeWidth="7" strokeLinecap="round"/>
      <g className="jardim-folhas"><path d="M98 166 Q51 170 47 128 Q90 126 98 166" fill="#64a87a"/><path d="M97 141 Q139 146 153 105 Q107 101 97 141" fill="#99d8a9"/><path d="M97 166 L60 139 M99 140 L140 116" stroke="#426d50" strokeWidth="2" fill="none"/></g>
      <g className="jardim-flor">{Array.from({length:8},(_,i)=><ellipse key={i} cx="100" cy="51" rx="12" ry="23" fill={i%2?'#f0d6a0':'#e6c17a'} transform={`rotate(${i*45} 100 76)`}/>)}<circle cx="100" cy="76" r="17" fill="#aa733d"/><circle cx="95" cy="71" r="5" fill="#dba455"/></g>
      <path d="M76 210 Q100 199 124 210" stroke="#8ca88c" strokeWidth="4" fill="none" strokeLinecap="round"/>
    </svg>
  </div>;
}

export function ProgressoJardim({jardim}) {
  const [celebrar,setCelebrar]=useState(false);
  useEffect(()=>{if(jardim.novasPlantas>0)setCelebrar(true);},[jardim.total,jardim.novasPlantas]);
  return <>
    <section className="jardim-progresso" aria-label="Progresso para a próxima planta"><div className="jardim-linha"><div><Sprout size={21} aria-hidden="true"/><strong>Um passo para o seu jardim</strong></div><span>{jardim.atual} de {jardim.alvo} metas</span></div><progress max={jardim.alvo} value={jardim.atual} aria-label="Metas cumpridas neste ciclo"/><p>A cada 5 metas cumpridas, uma nova planta. Semanais e mensais contam juntas.</p></section>
    {celebrar&&<section className="jardim-nascimento" aria-label="Nova planta conquistada"><Planta animada/><div><p className="jardim-etiqueta">Seu jardim cresceu</p><h2>{jardim.novasPlantas>1?'Novas plantas conquistadas!':'Uma nova planta nasceu!'}</h2><p>Ela já está guardada no Meu jardim. Um novo ciclo começou.</p><button className="botao-secundario" onClick={()=>setCelebrar(false)}>Continuar</button></div></section>}
  </>;
}

export default function Jardim({jardim}) {
  const [replay,setReplay]=useState({numero:jardim.plantas.at(-1)?.numero,vez:1});
  return <section className="jardim-colecao" aria-labelledby="titulo-jardim"><header><h2 id="titulo-jardim">Meu jardim</h2><p>{jardim.plantas.length} {jardim.plantas.length===1?'planta conquistada':'plantas conquistadas'} · Cada uma guarda um ciclo de 5 metas.</p></header>
    {jardim.plantas.length===0?<div className="jardim-vazio"><Sprout size={40} aria-hidden="true"/><h3>Seu jardim começa com pequenos passos</h3><p>Conclua suas metas e volte aqui para ver sua primeira planta nascer.</p></div>:<div className="jardim-grade">{[...jardim.plantas].reverse().map(p=><article className="jardim-vaso" key={p.numero}><Planta key={replay.numero===p.numero?replay.vez:0} animada={replay.numero===p.numero}/><h3>Margarida {p.numero}</h3><p>Conquistada em {formatarData(p.dia,{day:'2-digit',month:'short',year:'numeric'})}</p><button className="botao-secundario" onClick={()=>setReplay({numero:p.numero,vez:replay.vez+1})}><RotateCcw size={14} aria-hidden="true"/>Ver crescer</button></article>)}</div>}
    <p className="jardim-nota">Sem pressa: suas plantas não desaparecem nos dias de descanso. Cada meta conta uma vez por período. Conquistas já registradas permanecem mesmo se você editar, desfizer ou remover a meta.</p>
  </section>;
}
