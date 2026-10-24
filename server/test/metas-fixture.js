import assert from 'node:assert/strict';
import { criarServicoMetas } from '../src/servicos/metas.js';

// Chamado exclusivamente pela instância descartável de excluir-conta.integration.js.
export async function verificarMissoes({pool,servidor,a,b,usuarioId}) {
  const metas=criarServicoMetas(pool), hoje='2026-10-23';
  const base=await metas.listar(usuarioId,hoje), ids=[], tarefas=[];
  const padrao={tipo:'rotina',periodo:'semanal',medida:'ocorrencias',titulo:'Concluir tarefas',quantidade:3,origem:'pessoal'};
  async function criar(dados={}){const id=await metas.criar(usuarioId,{...padrao,...dados});ids.push(id);return id;}
  async function obter(id,data=hoje){return (await metas.listar(usuarioId,data)).metas.find(m=>m.id===id);}
  async function api(caminho,method,body,sessao=a,csrf=sessao?.csrf){const r=await fetch(`http://127.0.0.1:${servidor.address().port}/api/metas${caminho}`,{method,headers:{'Content-Type':'application/json','X-Dayvilo':'1',...(sessao?{Cookie:`dayvilo_sessao=${sessao.token}`,'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,dados:await r.json()};}
  assert.equal((await api('','GET',null,null)).status,401);
  assert.equal((await api('','POST',padrao,a,b.csrf)).status,403);
  assert.equal((await api('','POST',{...padrao,usuario_id:999})).status,400);
  const resposta=await api('','POST',padrao);assert.equal(resposta.status,201);
  const id=resposta.dados.metas.find(m=>!base.metas.some(x=>x.id===m.id)).id;ids.push(id);
  assert.ok(!(await api('','GET',null,b)).dados.metas.some(m=>m.id===id));
  assert.equal((await api('/'+id,'PUT',{...padrao,versao:1},b)).status,404);
  assert.equal((await api('/'+id,'DELETE',{versao:1},b)).status,404);
  const mensal=await criar({periodo:'mensal',quantidade:12});
  const dias=await criar({medida:'dias',quantidade:3});
  for(const [data,situacao] of [['2026-10-01','concluida'],['2026-10-19','concluida'],['2026-10-19','concluida'],['2026-10-20','concluida'],['2026-10-21','pulada'],['2026-10-24','concluida']]) {
    const [r]=await pool.execute('INSERT INTO tarefas(usuario_id,titulo,data_prevista,situacao,concluida_em) VALUES (?,?,?,?,?)',[usuarioId,'Missão teste',data,situacao,situacao==='concluida'?'2026-10-23 12:00:00':null]);tarefas.push(r.insertId);
  }
  assert.equal((await obter(id)).atual,3);assert.equal((await obter(id)).concluida,true);
  assert.equal((await obter(mensal)).atual,4);assert.equal((await obter(dias)).atual,2);
  await pool.execute("UPDATE tarefas SET situacao='pendente',concluida_em=NULL WHERE id=?",[tarefas[3]]);
  assert.equal((await obter(id)).atual,2);assert.equal((await obter(id)).concluida,false);
  assert.equal((await obter(id,'2026-10-26')).atual,0);assert.equal((await obter(mensal,'2026-11-01')).atual,0);
  const [[f]]=await pool.execute('SELECT id FROM fichas_treino WHERE usuario_id=?',[usuarioId]);
  const [[l]]=await pool.execute('SELECT id FROM livros WHERE usuario_id=?',[usuarioId]);
  for(const t of [tarefas[1],tarefas[2]])await pool.execute('INSERT INTO sessoes_treino(tarefa_id,ficha_id,planejado,realizado) VALUES (?,?,?,?)',[t,f.id,'[]','[]']);
  await pool.execute('INSERT INTO leituras_agendadas(tarefa_id,livro_id) VALUES (?,?)',[tarefas[1],l.id]);
  await pool.execute("UPDATE tarefas SET area='casa',ambiente='Sala' WHERE id=?",[tarefas[1]]);
  for(const [tipo,medida,esperado] of [['treino','ocorrencias',2],['leitura','dias',1],['casa','ocorrencias',1]]) {
    const meta=await criar({tipo,medida});assert.equal((await obter(meta)).atual,esperado);
    await assert.rejects(metas.marcar(usuarioId,meta,hoje,{versao:1,dia:hoje,cumprido:true}),{status:400});
  }
  const manual=await criar({tipo:'manual',periodo:'mensal',medida:'dias',quantidade:10,titulo:'Violão'});
  await metas.marcar(usuarioId,manual,hoje,{versao:1,dia:'2026-10-03',cumprido:true});
  assert.equal((await obter(manual)).atual,1);
  await assert.rejects(metas.marcar(usuarioId,manual,hoje,{versao:1,dia:'2026-10-04',cumprido:true}),{status:409});
  await assert.rejects(metas.marcar(usuarioId,manual,hoje,{versao:2,dia:'2026-10-24',cumprido:true}),{status:400});
  await assert.rejects(metas.marcar(usuarioId,manual,hoje,{versao:2,dia:'2026-09-30',cumprido:true}),{status:400});
  await metas.editar(usuarioId,manual,{...padrao,tipo:'manual',periodo:'mensal',medida:'dias',titulo:'Violão novo',quantidade:8,versao:2});
  assert.equal((await obter(manual)).atual,1);
  await metas.marcar(usuarioId,manual,hoje,{versao:3,dia:'2026-10-03',cumprido:false});assert.equal((await obter(manual)).atual,0);
  await metas.marcar(usuarioId,manual,hoje,{versao:4,dia:'2026-10-03',cumprido:true});
  assert.equal((await obter(manual,'2026-11-01')).atual,0);
  await metas.marcar(usuarioId,manual,'2026-11-01',{versao:5,dia:'2026-11-01',cumprido:true});assert.deepEqual((await obter(manual,'2026-11-01')).dias_marcados,['2026-11-01']);
  await metas.editar(usuarioId,manual,{...padrao,tipo:'manual',medida:'dias',titulo:'Semanal',quantidade:3,versao:6});assert.equal((await obter(manual)).atual,0);
  // Mantém o retrato das contas usado no teste de exclusão/rollback.
  for(const meta of ids)await metas.remover(usuarioId,meta,{versao:(await obter(meta)).versao});
  for(const t of tarefas)await pool.execute('DELETE FROM tarefas WHERE id=?',[t]);
  assert.deepEqual(await metas.listar(usuarioId,hoje),base);
}
