import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarAplicacao } from '../src/app.js';
import { criarPoolBanco } from '../src/db.js';
import { criarRepositorioTarefas } from '../src/repositorios/tarefas.js';
import { alterarSelecao } from '../src/servicos/selecao-tarefas.js';
import { prepararSessaoTeste } from './sessao-fixture.js';

test('seleção: ações por situação, dia, isolamento, conflito e rollback',async()=>{
 const pool=criarPoolBanco(),banco=await pool.getConnection();let servidor;
 try{
  await banco.beginTransaction();
  const [u]=await banco.execute('INSERT INTO usuarios(nome) VALUES (?)',['Seleção']);
  const [outro]=await banco.execute('INSERT INTO usuarios(nome) VALUES (?)',['Outro']);
  const headers=await prepararSessaoTeste(banco,u.insertId),repo=criarRepositorioTarefas(banco),data='2026-10-03';
  const criar=(nome,usuario=u.insertId,dia=data)=>repo.criar(usuario,{titulo:nome,data_prevista:dia,observacao:null,horario:null,prioridade:false});
  const a=await criar('A'),b=await criar('B'),c=await criar('C'),privada=await criar('Privada',outro.insertId),amanha=await criar('Amanhã',u.insertId,'2026-10-04');
  servidor=criarAplicacao({banco}).listen(0,'127.0.0.1');await once(servidor,'listening');
  const enviar=async(acao,itens,extras={})=>{const r=await fetch('http://127.0.0.1:'+servidor.address().port+'/api/tarefas/selecao',{method:'PATCH',headers:{...headers,...extras},body:JSON.stringify({data,acao,tarefas:itens.map(([id,situacao='pendente'])=>({id,situacao}))})});return r.status;};
  assert.equal(await enviar('concluir',[[a.id],[b.id]],{'X-CSRF-Token':''}),403);
  assert.equal(await enviar('concluir',[[a.id],[privada.id]]),409);
  assert.equal((await repo.buscar(u.insertId,a.id)).situacao,'pendente');
  assert.equal(await enviar('concluir',[[a.id],[amanha.id]]),409);
  assert.equal(await enviar('concluir',[[a.id],[a.id]]),400);
  assert.equal(await enviar('concluir',[[a.id],[b.id]]),200);
  assert.equal((await repo.buscar(u.insertId,c.id)).situacao,'pendente');
  assert.equal(await enviar('pular',[[a.id,'concluida']]),409);
  assert.equal(await enviar('desfazer',[[a.id,'concluida'],[b.id,'concluida']]),200);
  assert.equal(await enviar('pular',[[a.id],[b.id]]),200);
  assert.equal(await enviar('concluir',[[a.id],[c.id]]),409);
  assert.equal((await repo.buscar(u.insertId,c.id)).situacao,'pendente');
  assert.equal(await enviar('restaurar',[[a.id,'pulada'],[b.id,'pulada']]),200);
  let mudancas=0;
  const falha={query:banco.query.bind(banco),execute:async(sql,args)=>{if(sql.startsWith('UPDATE tarefas SET situacao')&&++mudancas===2)throw Error('Falha simulada');return banco.execute(sql,args);}};
  await assert.rejects(alterarSelecao(falha,u.insertId,{data,acao:'concluir',tarefas:[a,b].map(t=>({id:t.id,situacao:'pendente'}))}),/Falha simulada/);
  assert.equal((await repo.buscar(u.insertId,a.id)).situacao,'pendente');
  await repo.definirSituacao(u.insertId,b.id,'pulada');
  assert.equal(await enviar('excluir',[[a.id],[b.id,'pulada']]),200);
  assert.equal(await repo.buscar(u.insertId,a.id),null);
  assert.equal(await repo.buscar(u.insertId,b.id),null);
  assert.ok(await repo.buscar(u.insertId,c.id));
 }finally{if(servidor){servidor.closeAllConnections();await new Promise(r=>servidor.close(r));}await banco.rollback();banco.release();await pool.end();}
});
