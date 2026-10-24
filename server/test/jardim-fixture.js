import assert from 'node:assert/strict';
import { criarServicoMetas } from '../src/servicos/metas.js';
import { consultarJardim, sincronizarJardim } from '../src/servicos/jardim.js';

export async function verificarJardim({pool,servidor,a,b,usuarioId}) {
  const metas=criarServicoMetas(pool), ids=[], hoje='2026-10-24';
  const base=await consultarJardim(pool,usuarioId);
  const padrao={tipo:'manual',periodo:'semanal',medida:'dias',titulo:'Teste jardim',quantidade:1,origem:'pessoal'};
  for(let i=0;i<5;i++) {
    const id=await metas.criar(usuarioId,padrao);ids.push(id);
    await metas.marcar(usuarioId,id,hoje,{versao:1,dia:hoje,cumprido:true});
  }
  const resultados=await Promise.all([sincronizarJardim(pool,usuarioId,hoje),sincronizarJardim(pool,usuarioId,hoje)]);
  assert.equal(resultados.reduce((s,r)=>s+r.jardim.novasPlantas,0),1);
  assert.equal(resultados[0].jardim.total,base.total+5);
  assert.equal(resultados[0].jardim.atual,base.atual);
  await metas.marcar(usuarioId,ids[0],hoje,{versao:2,dia:hoje,cumprido:false});
  await sincronizarJardim(pool,usuarioId,hoje);
  await metas.marcar(usuarioId,ids[0],hoje,{versao:3,dia:hoje,cumprido:true});
  assert.equal((await sincronizarJardim(pool,usuarioId,hoje)).jardim.total,base.total+5);
  await metas.editar(usuarioId,ids[0],{...padrao,periodo:'mensal',versao:4});
  await metas.marcar(usuarioId,ids[0],hoje,{versao:5,dia:hoje,cumprido:true});
  assert.equal((await sincronizarJardim(pool,usuarioId,hoje)).jardim.total,base.total+5);
  await metas.marcar(usuarioId,ids[1],'2026-10-26',{versao:2,dia:'2026-10-26',cumprido:true});
  assert.equal((await sincronizarJardim(pool,usuarioId,'2026-10-26')).jardim.total,base.total+6);
  async function chamar(sessao,csrf,body={}) {
    return fetch(`http://127.0.0.1:${servidor.address().port}/api/metas/jardim/sincronizar`,{method:'POST',headers:{'Content-Type':'application/json','X-Dayvilo':'1',...(sessao?{Cookie:`dayvilo_sessao=${sessao.token}`,'X-CSRF-Token':csrf}:{})},body:JSON.stringify(body)});
  }
  assert.equal((await chamar()).status,401);
  assert.equal((await chamar(a,b.csrf)).status,403);
  assert.equal((await chamar(a,a.csrf,{usuario_id:999})).status,400);
  const outro=await (await chamar(b,b.csrf)).json();assert.equal(outro.jardim.total,1);
  for(const id of ids) {
    const m=(await metas.listar(usuarioId,hoje)).metas.find(m=>m.id===id);
    await metas.remover(usuarioId,id,{versao:m.versao});
  }
  assert.equal((await consultarJardim(pool,usuarioId)).total,base.total+6);
  await pool.execute('DELETE FROM jardim_conquistas WHERE usuario_id=? AND meta_id IN ('+ids.map(()=>'?').join(',')+')',[usuarioId,...ids]);
  assert.deepEqual(await consultarJardim(pool,usuarioId),base);
}
