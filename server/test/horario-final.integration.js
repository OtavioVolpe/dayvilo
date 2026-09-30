import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {criarPoolBanco} from '../src/db.js';
import {criarAplicacao} from '../src/app.js';
import {prepararSessaoTeste} from './sessao-fixture.js';
import {obterDataHoje} from '../src/validacao-tarefas.js';
import {deslocarData} from '../../client/src/datas.js';
test('horário final: API persiste, edita, limpa e replica somente pendentes da série',async()=>{
  const pool=criarPoolBanco(), banco=await pool.getConnection();let servidor;
  try{
    await banco.beginTransaction();
    const [u]=await banco.execute('INSERT INTO usuarios(nome) VALUES (?)',['Horários teste']);
    const headers=await prepararSessaoTeste(banco,u.insertId);
    servidor=criarAplicacao({banco,enviarEmail:async()=>{}}).listen(0,'127.0.0.1');await once(servidor,'listening');
    const chamar=async(rota,method='GET',body)=>{const r=await fetch(`http://127.0.0.1:${servidor.address().port}/api${rota}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
    const hoje=obterDataHoje('America/Sao_Paulo');
    const base={titulo:'Estudar',data_prevista:hoje,horario:'23:00',horario_final:'01:00'};
    const criada=await chamar('/tarefas','POST',base);assert.equal(criada.status,201);assert.equal(criada.tarefa.horario_final,'01:00');
    assert.equal((await chamar('/tarefas?data='+hoje)).tarefas[0].horario_final,'01:00');
    assert.equal((await chamar(`/tarefas/${criada.tarefa.id}`,'PUT',{...base,horario:null})).status,400);
    assert.equal((await chamar(`/tarefas/${criada.tarefa.id}`,'PUT',{...base,horario_final:null})).tarefa.horario_final,null);
    const serie=await chamar('/tarefas/repetidas','POST',{tarefa:base,repeticao:{tipo:'diaria',ate:deslocarData(hoje,2)}});assert.equal(serie.status,201);
    const [ocorrencias]=await banco.execute('SELECT tarefa_id FROM ocorrencias_series WHERE serie_id=? ORDER BY tarefa_id',[serie.tarefa.serie_id]);
    await chamar(`/tarefas/${ocorrencias[1].tarefa_id}/conclusao`,'PATCH',{concluida:true});
    const mudanca={titulo:'Estudar',horario:'19:00',horario_final:'20:00',prioridade:false};
    assert.equal((await chamar(`/tarefas/${serie.tarefa.id}/serie`,'PUT',mudanca)).status,200);
    const [salvas]=await banco.execute('SELECT horario_final FROM tarefas JOIN ocorrencias_series ON tarefa_id=tarefas.id WHERE serie_id=? ORDER BY tarefas.id',[serie.tarefa.serie_id]);
    assert.deepEqual(salvas.map(t=>t.horario_final),['20:00:00','01:00:00','20:00:00']);
    assert.equal((await chamar(`/tarefas/historico?inicio=${hoje}&fim=${hoje}`)).tarefas.find(t=>t.id===serie.tarefa.id).horario_final,'20:00');
  }finally{if(servidor){servidor.closeAllConnections();await new Promise(r=>servidor.close(r));}await banco.rollback();banco.release();await pool.end();}
});
