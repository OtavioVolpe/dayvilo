import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarPoolBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { criarRepositorioTarefas } from '../src/repositorio-tarefas.js';
import { ordenarTarefas } from '../src/servicos/ordenacao.js';
import { prepararSessaoTeste } from './sessao-fixture.js';

test('ordenação: persistência por dia, isolamento, conflitos, novas tarefas, reagendamento e rollback', async () => {
  const pool=criarPoolBanco(); const banco=await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const [u]=await banco.execute('INSERT INTO usuarios(nome) VALUES (?)',['Ordem teste']);
    const [outro]=await banco.execute('INSERT INTO usuarios(nome) VALUES (?)',['Outra ordem']);
    const headers=await prepararSessaoTeste(banco,u.insertId);
    const repo=criarRepositorioTarefas(banco); const data='2026-09-28';
    const criar=async (titulo,usuario=u.insertId,dia=data)=>repo.criar(usuario,{titulo,data_prevista:dia,horario:null,observacao:null,prioridade:false});
    const a=await criar('A'),b=await criar('B'),c=await criar('C'),alheia=await criar('Outra',outro.insertId),outroDia=await criar('Outro dia',u.insertId,'2026-09-29');
    servidor=criarAplicacao({banco}).listen(0,'127.0.0.1');await once(servidor,'listening');
    const url=`http://127.0.0.1:${servidor.address().port}/api/tarefas/ordem`;
    async function enviar(dados, extras={}) {const r=await fetch(url,{method:'PATCH',headers:{...headers,...extras},body:JSON.stringify(dados)});return {status:r.status,dados:await r.json()};}
    const original=[a.id,b.id,c.id], nova=[c.id,a.id,b.id];
    assert.equal((await enviar({data,ids:nova,anteriores:original},{'X-CSRF-Token':''})).status,403);
    assert.equal((await enviar({data,ids:nova,anteriores:original})).status,200);
    assert.deepEqual((await repo.listar(u.insertId,data)).map(t=>t.id),nova);
    assert.equal((await enviar({data,ids:original,anteriores:original})).status,409);
    assert.equal((await enviar({data,ids:[a.id,b.id,alheia.id],anteriores:[a.id,b.id,alheia.id]})).status,409);
    assert.equal((await enviar({data,ids:[a.id,b.id,outroDia.id],anteriores:[a.id,b.id,outroDia.id]})).status,409);
    assert.equal((await enviar({data,ids:[a.id,a.id],anteriores:[a.id,a.id]})).status,400);
    assert.equal((await enviar({data,ids:['1',b.id],anteriores:['1',b.id]})).status,400);
    let atualizacoes=0;
    const falhando={query:banco.query.bind(banco),execute:async(sql,parametros)=>{if(sql.startsWith('UPDATE tarefas SET ordem') && ++atualizacoes===2)throw new Error('Falha simulada');return banco.execute(sql,parametros);}};
    await assert.rejects(ordenarTarefas(falhando,u.insertId,{data,ids:original,anteriores:nova}),/Falha simulada/);
    assert.deepEqual((await repo.listar(u.insertId,data)).map(t=>t.id),nova);
    const d=await criar('D'); assert.deepEqual((await repo.listar(u.insertId,data)).map(t=>t.id),[...nova,d.id]);
    await repo.definirConclusao(u.insertId,a.id,true);
    assert.equal((await enviar({data,ids:[...nova,d.id],anteriores:[...nova,d.id]})).status,409);
    await repo.definirConclusao(u.insertId,a.id,false);
    assert.equal((await repo.buscar(u.insertId,a.id)).ordem,2);
    await repo.reagendar(u.insertId,c.id,'2026-09-29');assert.equal((await repo.buscar(u.insertId,c.id)).ordem,0);
    await repo.editar(u.insertId,b.id,{titulo:'B editada',observacao:null,horario:null,prioridade:false,data_prevista:data});assert.equal((await repo.buscar(u.insertId,b.id)).ordem,3);
    await repo.editar(u.insertId,b.id,{titulo:'B editada',observacao:null,horario:null,prioridade:false,data_prevista:'2026-09-29'});assert.equal((await repo.buscar(u.insertId,b.id)).ordem,0);
    assert.equal((await repo.buscar(outro.insertId,alheia.id)).ordem,0);
  } finally {if(servidor){servidor.closeAllConnections();await new Promise(r=>servidor.close(r));}await banco.rollback();banco.release();await pool.end();}
});
