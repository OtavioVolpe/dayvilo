import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {criarPoolBanco} from '../src/db.js';
import {criarAplicacao} from '../src/app.js';
import {criarRepositorioTarefas} from '../src/repositorios/tarefas.js';
import {obterDataHoje} from '../src/validacoes/tarefas.js';
import {prepararSessaoTeste} from './sessao-fixture.js';

test('regras: puladas exigem restauração, futuras acompanham edição e encerramento preserva histórico',async()=>{
 const pool=criarPoolBanco(), banco=await pool.getConnection();let servidor;
 try {
  await banco.beginTransaction();
  const[u]=await banco.execute('INSERT INTO usuarios (nome) VALUES (?)',['Teste regras de situação']);
  const headers=await prepararSessaoTeste(banco,u.insertId);
  servidor=criarAplicacao({banco}).listen(0,'127.0.0.1');await once(servidor,'listening');
  const url=`http://127.0.0.1:${servidor.address().port}/api/tarefas`;
  const chamar=async(id,sufixo,method,body)=>{const r=await fetch(`${url}/${id}${sufixo}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,dados:await r.json()};};
  const hoje=obterDataHoje('America/Sao_Paulo');
  const dia=n=>{const d=new Date(hoje+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const repo=criarRepositorioTarefas(banco);
  await repo.criarRepetidas(u.insertId,{titulo:'Acordar',observacao:null,horario:'07:00',prioridade:false},[-2,-1,0,1,2,3,4,5].map(dia));
  const lista=await repo.listarPeriodo(u.insertId,dia(-2),dia(5));
  const ids=Object.fromEntries(lista.map(t=>[t.data_prevista,t.id]));
  const id=n=>ids[dia(n)];
  for(const n of [-2,0,2,4])await repo.definirSituacao(u.insertId,id(n),'pulada');
  await repo.definirSituacao(u.insertId,id(3),'concluida');
  for(const n of [0,2,3]){
   for(const [sufixo,method,body] of [['','PUT',{titulo:'Bloqueada'}],['/agendamento','PATCH',{data_prevista:hoje}],['/serie','PUT',{titulo:'Bloqueada'}],['/serie/encerramento','PATCH',{}]])assert.equal((await chamar(id(n),sufixo,method,body)).status,409);
  }
  for(const [sufixo,body] of [['/conclusao',{concluida:true}],['/conclusao',{concluida:false}],['/situacao',{situacao:'concluida'}]])assert.equal((await chamar(id(2),sufixo,'PATCH',body)).status,409);
  const editada=await chamar(id(-1),'/serie','PUT',{titulo:'Acordar',horario:'07:30'});
  assert.equal(editada.status,200);assert.equal(editada.dados.inicio,hoje);assert.equal(editada.dados.quantidade,4);
  for(const n of [-2,-1,0,3])assert.equal((await repo.buscar(u.insertId,id(n))).horario,'07:00');
  for(const n of [1,2,4,5])assert.equal((await repo.buscar(u.insertId,id(n))).horario,'07:30');
  assert.equal((await repo.buscar(u.insertId,id(2))).situacao,'pulada');
  const restaurada=await chamar(id(2),'/situacao','PATCH',{situacao:'pendente'});
  assert.equal(restaurada.status,200);assert.equal(restaurada.dados.tarefa.horario,'07:30');
  const fim=await chamar(id(1),'/serie/encerramento','PATCH',{});
  assert.equal(fim.status,200);assert.equal(fim.dados.quantidade,4);
  for(const n of [1,2,4,5])assert.equal(await repo.buscar(u.insertId,id(n)),null);
  for(const n of [-2,-1,0,3])assert.ok(await repo.buscar(u.insertId,id(n)));
  assert.equal((await chamar(id(4),'/situacao','PATCH',{situacao:'pendente'})).status,404);
  assert.equal((await chamar(id(0),'','DELETE')).status,200);
  assert.equal((await chamar(id(3),'/conclusao','PATCH',{concluida:false})).status,200);
 }finally{if(servidor){servidor.closeAllConnections();await new Promise(r=>servidor.close(r));}await banco.rollback();banco.release();await pool.end();}
});
