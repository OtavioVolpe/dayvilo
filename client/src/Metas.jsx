import { useEffect, useState } from 'react';
import { Plus, Check, Target, Dumbbell, BookOpen, House, Pencil, Trash2, ChevronDown } from 'lucide-react';
import Jardim, { ProgressoJardim } from './Jardim.jsx';
import useMetas from './useMetas.js';
import ConfirmacaoTreino from './ConfirmacaoTreino.jsx';
import { formatarData } from './datas.js';
import './metas.css';

const opcoes=[['rotina','Rotina',Target],['treino','Treino',Dumbbell],['leitura','Leitura',BookOpen],['casa','Casa',House],['manual','Pessoal',Pencil]];
const dicas={rotina:'Conta tarefas concluídas na Rotina, incluindo as outras áreas.',treino:'Conta treinos agendados marcados como concluídos.',leitura:'Conta dias com leitura agendada marcada como concluída.',casa:'Conta tarefas de Casa marcadas como concluídas.',manual:'Você marca os dias em que cumpriu o compromisso.'};
function sugestao(tipo,periodo) {
  const semanal=periodo==='semanal';
  const quantidade={rotina:semanal?5:20,treino:semanal?3:12,leitura:semanal?4:15,casa:semanal?2:8}[tipo];
  const titulo={rotina:`Conclua ${quantidade} tarefas`,treino:`Conclua ${quantidade} treinos`,leitura:`Leia em ${quantidade} dias diferentes`,casa:`Cuide de ${quantidade} tarefas da casa`}[tipo];
  return {tipo,periodo,medida:tipo==='leitura'?'dias':'ocorrencias',titulo,quantidade,origem:'sugestao'};
}
const novaPessoal=periodo=>({tipo:'manual',periodo,medida:'dias',titulo:'',quantidade:periodo==='semanal'?3:10,origem:'pessoal'});

export default function Metas({aoAlterarSujo}) {
  const {dados,erro,carregando,salvando,enviar,recarregar}=useMetas();
  const [aba,setAba]=useState('metas');
  const [periodo,setPeriodo]=useState('semanal'), [form,setForm]=useState(null), [remover,setRemover]=useState(null), [aviso,setAviso]=useState(''), [detalhe,setDetalhe]=useState(null);
  useEffect(()=>{aoAlterarSujo?.(Boolean(form)||salvando);return()=>aoAlterarSujo?.(false);},[form,salvando,aoAlterarSujo]);
  const metas=(dados?.metas||[]).filter(m=>m.periodo===periodo), bloqueado=carregando||salvando;
  const intervalo=dados?.periodos[periodo];
  function abrir(m) {setAba('metas');setAviso('');setForm(m?{...m}:novaPessoal(periodo));}
  async function salvar(e) {
    e.preventDefault();
    const {tipo,periodo,medida,titulo,quantidade,origem,id,versao}=form;
    if(await enviar(id?'/'+id:'',id?'PUT':'POST',{tipo,periodo,medida,titulo,quantidade,origem,...(id?{versao}:{})})) {setPeriodo(periodo);setForm(null);setAviso(id?'Meta atualizada.':'Meta adicionada. Vá no seu ritmo.');}
  }
  return <section className="pagina-missoes" aria-labelledby="titulo-metas">
    <header className="missoes-cabecalho"><div><h1 id="titulo-metas">Minhas metas</h1><p>Pequenos compromissos, conquistas de verdade.</p></div><button className="botao-principal" disabled={bloqueado||Boolean(form)} onClick={()=>abrir()}><Plus size={17} aria-hidden="true"/>Nova meta</button></header>
    <nav className="missoes-abas" aria-label="Metas e jardim">{[['metas','Minhas metas'],['jardim','Meu jardim']].map(([id,nome])=><button key={id} aria-pressed={aba===id} disabled={salvando||Boolean(form)} onClick={()=>setAba(id)}>{nome}</button>)}</nav>
    {dados?.jardim&&<ProgressoJardim jardim={dados.jardim}/>}
    {aba==='jardim'&&dados?.jardim&&<Jardim jardim={dados.jardim}/>}
    {aba==='metas'&&<nav className="missoes-abas" aria-label="Período das metas">{[['semanal','Semanais'],['mensal','Mensais']].map(([p,nome])=><button key={p} aria-pressed={periodo===p} disabled={salvando||Boolean(form)} onClick={()=>{setPeriodo(p);setDetalhe(null);setAviso('');}}>{nome}</button>)}</nav>}
    {erro&&<p className="mensagem-erro" role="alert">{erro} <button className="botao-secundario" disabled={salvando} onClick={recarregar}>Atualizar metas</button></p>}
    {aviso&&<p className="missoes-aviso" role="status">{aviso}</p>}
    {carregando&&<p className="estado-lista" role="status">Carregando suas metas…</p>}
    {form&&<form className="missao-formulario" onSubmit={salvar}><fieldset disabled={bloqueado}><legend>{form.id?'Editar meta':'Nova meta'}</legend>
      <label>Nome da meta<input name="titulo" required maxLength={80} value={form.titulo} placeholder="Ex.: praticar violão" onChange={e=>setForm({...form,titulo:e.target.value,origem:'pessoal'})}/></label>
      <div className="missao-campos"><label>Como acompanhar?<select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value,medida:['manual','leitura'].includes(e.target.value)?'dias':'ocorrencias',origem:'pessoal',quantidade:3})}>{opcoes.map(([t,n])=><option key={t} value={t}>{t==='manual'?'Marcar manualmente':n+' · automático'}</option>)}</select></label>
      <label>Repetir a cada<select value={form.periodo} onChange={e=>setForm({...form,periodo:e.target.value,quantidade:Math.min(form.quantidade,7)})}><option value="semanal">Semana</option><option value="mensal">Mês</option></select></label></div>
      {!['manual','leitura'].includes(form.tipo)&&<label>O que contar?<select value={form.medida} onChange={e=>setForm({...form,medida:e.target.value,quantidade:Math.min(form.quantidade,7)})}><option value="ocorrencias">{form.tipo==='treino'?'Treinos concluídos':'Tarefas concluídas'}</option><option value="dias">Dias diferentes com atividade</option></select></label>}
      <label>{form.medida==='dias'?'Quantos dias?':'Quantas conclusões?'}<input name="quantidade" required type="number" min="1" max={form.medida==='dias'?(form.periodo==='semanal'?7:31):1000} value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value===''?'':Number(e.target.value)})}/></label>
      <p>{dicas[form.tipo]} A contagem considera as datas planejadas do período atual, até hoje.</p>
      {form.periodo==='mensal'&&form.medida==='dias'&&<p>O mês pode ter de 28 a 31 dias. Escolha uma frequência que caiba também nos meses mais curtos.</p>}
      {form.id&&<p>Alterar tipo, período ou modo de contagem limpa as marcações manuais. Alterar só nome ou quantidade as preserva.</p>}
      <div className="missao-acoes"><button className="botao-secundario" type="button" onClick={()=>setForm(null)}>Cancelar</button><button className="botao-principal" type="submit">{salvando?'Salvando…':'Salvar meta'}</button></div>
    </fieldset></form>}
    {aba==='metas'&&!carregando&&dados&&!form&&<>
      <div className="missoes-periodo"><h2>{periodo==='semanal'?'Suas missões da semana':'Suas missões do mês'}</h2><span>{formatarData(intervalo.inicio,{day:'2-digit',month:'2-digit'})} a {formatarData(intervalo.fim,{day:'2-digit',month:'2-digit'})}</span></div>
      {metas.length===0&&<div className="missoes-vazio"><Target size={25} aria-hidden="true"/><h3>Um compromisso de cada vez</h3><p>Escolha uma sugestão abaixo ou crie uma meta com a sua cara.</p></div>}
      <div className="missoes-lista">{metas.map(m=>{
        const [ ,nome,Icone]=opcoes.find(o=>o[0]===m.tipo), completo=m.concluida;
        return <article className={`missao${completo?' missao-concluida':''}`} key={m.id} aria-label={m.titulo}>
          <div className="missao-principal"><div className="missao-contador" aria-hidden="true">{completo?<Check size={24}/>:m.quantidade>=100?<strong>{Math.min(100,Math.round(m.atual/m.quantidade*100))}%</strong>:<><strong>{m.atual}</strong><span>/{m.quantidade}</span></>}</div><div className="missao-conteudo"><p className="missao-origem"><Icone size={13} aria-hidden="true"/>{nome} · {m.origem==='sugestao'?'sugestão Dayvilo':'sua meta'}</p><h3>{m.titulo}</h3><progress value={Math.min(m.atual,m.quantidade)} max={m.quantidade} aria-label={m.titulo} aria-valuetext={`${m.atual} de ${m.quantidade}, ${completo?'meta cumprida':'em andamento'}`}/><div className="missao-andamento"><span>{m.atual} de {m.quantidade} {m.medida==='dias'?'dias':m.tipo==='treino'?'treinos':'tarefas'}</span><strong>{completo?'Meta cumprida!':`${Math.min(100,Math.round(m.atual/m.quantidade*100))}%`}</strong></div></div>
          <div className="missao-opcoes"><button aria-label={'Editar: '+m.titulo} disabled={bloqueado} onClick={()=>abrir(m)}><Pencil size={16} aria-hidden="true"/></button><button aria-label={'Remover: '+m.titulo} disabled={bloqueado} onClick={()=>setRemover(m)}><Trash2 size={16} aria-hidden="true"/></button></div></div>
          <button className="missao-detalhes" aria-expanded={detalhe===m.id} onClick={()=>setDetalhe(detalhe===m.id?null:m.id)}>{m.tipo==='manual'?'Marcar dias':'Como é contado'}<ChevronDown size={14} aria-hidden="true"/></button>
          {detalhe===m.id&&<div className="missao-explicacao"><p>{dicas[m.tipo]} {m.medida==='dias'?'Cada data conta uma vez.':'Cada tarefa vinculada conta uma vez, mesmo havendo várias no dia.'} Desfazer conclusões atualiza o progresso.</p>{m.tipo==='manual'&&<div className="missao-dias" aria-label={'Dias de '+m.titulo}>{intervalo.dias.map(dia=><button key={dia} disabled={bloqueado||dia>dados.hoje} aria-label={formatarData(dia,{weekday:'long',day:'numeric',month:'long'})} aria-pressed={m.dias_marcados.includes(dia)} onClick={async()=>{if(await enviar('/'+m.id+'/dias','PATCH',{versao:m.versao,dia,cumprido:!m.dias_marcados.includes(dia)}))setAviso('Marcação atualizada.');}}><span>{formatarData(dia,{weekday:'short'})}</span><strong>{dia.slice(-2)}</strong>{m.dias_marcados.includes(dia)&&<Check size={12} aria-hidden="true"/>}</button>)}</div>}</div>}
        </article>;
      })}</div>
      <section className="missoes-sugestoes" aria-labelledby="titulo-sugestoes"><h2 id="titulo-sugestoes">Ideias para começar</h2><div>{opcoes.filter(o=>o[0]!=='manual').map(([tipo,nome,Icone])=>{const s=sugestao(tipo,periodo);return <button key={tipo} disabled={bloqueado} onClick={()=>abrir(s)}><Icone size={17} aria-hidden="true"/><span>{s.titulo}</span><Plus size={16} aria-hidden="true"/></button>;})}</div></section>
      <p className="missoes-nota">{periodo==='semanal'?'De segunda a domingo.':'Do primeiro ao último dia do mês.'} As metas se repetem a cada período, com uma nova contagem. Dias de descanso fazem parte.</p>
    </>}
    {remover&&<ConfirmacaoTreino titulo="Remover meta?" mensagem="A meta e suas marcações manuais serão removidas. As tarefas e os registros das áreas continuam salvos." rotulo="Remover meta" destrutiva ocupado={salvando} erro={erro} cancelar={()=>setRemover(null)} confirmar={async()=>{if(await enviar('/'+remover.id,'DELETE',{versao:remover.versao})){setRemover(null);setAviso('Meta removida.');}}}/>}
  </section>;
}
