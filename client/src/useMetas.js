import { useEffect, useRef, useState } from 'react';
import { solicitar } from './api.js';

export default function useMetas(revisao) {
  const [dados,setDados]=useState(null), [erro,setErro]=useState(''), [carregando,setCarregando]=useState(true), [salvando,setSalvando]=useState(false), [tentativa,setTentativa]=useState(0);
  const numero=useRef(0), trava=useRef(false);
  useEffect(()=>{
    const consulta=++numero.current, abortar=new AbortController();
    setCarregando(true);setErro('');
    solicitar('/metas',{signal:abortar.signal}).then(r=>{if(numero.current===consulta)setDados(r);})
      .catch(e=>{if(!abortar.signal.aborted&&numero.current===consulta)setErro(e.message);})
      .finally(()=>{if(numero.current===consulta)setCarregando(false);});
    return()=>abortar.abort();
  },[revisao,tentativa]);
  async function enviar(caminho,method,body) {
    if(trava.current)return false;
    trava.current=true;setSalvando(true);setErro('');++numero.current;
    try {const r=await solicitar('/metas'+caminho,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setDados(r);return true;}
    catch(e){setErro(e.message);return false;}
    finally{trava.current=false;setSalvando(false);}
  }
  return {dados,erro,carregando,salvando,enviar,recarregar:()=>setTentativa(v=>v+1)};
}
