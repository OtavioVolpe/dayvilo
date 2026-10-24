import { Target, ArrowUpRight } from 'lucide-react';
import useMetas from './useMetas.js';
import './metas.css';

export default function MetaSemanal({revisao,aoAbrirMetas}) {
  const {dados,erro,carregando,recarregar}=useMetas(revisao);
  const metas=dados?.metas || [], concluidas=metas.filter(m=>m.concluida).length;
  return <section className="missoes-resumo" aria-label="Resumo das metas">
    <button onClick={aoAbrirMetas}><Target size={20} aria-hidden="true"/><span><strong>Minhas metas</strong><small>{carregando?'Atualizando…':erro?'Não foi possível atualizar':metas.length?`${concluidas} de ${metas.length} cumpridas nos períodos atuais`:'Escolha uma missão para sua rotina.'}</small></span><span className="missoes-resumo-link">Ver metas<ArrowUpRight size={16} aria-hidden="true"/></span></button>
    {erro&&<p role="alert">{erro} <button className="botao-secundario" onClick={recarregar}>Tentar novamente</button></p>}
  </section>;
}
