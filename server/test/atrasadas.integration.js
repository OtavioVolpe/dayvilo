import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarAplicacao } from '../src/app.js';
import { criarPoolBanco } from '../src/db.js';
import { obterDataHoje } from '../src/validacao-tarefas.js';

test('atrasadas, pular, restaurar e reagendar preservam dados e isolamento', async () => {
  const pool = criarPoolBanco(); const banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const [u] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Teste atrasadas']);
    const [outro] = await banco.execute('INSERT INTO usuarios (nome) VALUES (?)', ['Outro perfil']);
    servidor = criarAplicacao({ banco, usuario: {id:u.insertId,nome:'Teste',fuso_horario:'America/Sao_Paulo'} }).listen(0,'127.0.0.1');
    await once(servidor,'listening');
    const url = `http://127.0.0.1:${servidor.address().port}/api`;
    const chamar = async (rota, method='GET', body) => {
      const r = await fetch(url+rota,{method,headers:{'Content-Type':'application/json'},body:body === undefined ? undefined : JSON.stringify(body)});
      return {status:r.status,dados:await r.json()};
    };
    const hoje = obterDataHoje('America/Sao_Paulo');
    const criar = async (titulo,data) => (await chamar('/tarefas','POST',{titulo,data_prevista:data,horario:'09:30',observacao:'Preservar',prioridade:true})).dados.tarefa;
    const antiga = await criar('Antiga','2020-01-01');
    const concluida = await criar('Concluída','2020-01-02');
    await criar('Hoje',hoje); await criar('Sem data',null); await criar('Futura','2099-01-01');
    await chamar(`/tarefas/${concluida.id}/situacao`,'PATCH',{situacao:'concluida'});
    const [privada] = await banco.execute('INSERT INTO tarefas (usuario_id,titulo,data_prevista) VALUES (?,?,?)',[outro.insertId,'Privada','2020-01-01']);
    assert.deepEqual((await chamar('/tarefas/atrasadas')).dados.tarefas.map(t=>t.id),[antiga.id]);
    assert.equal((await chamar(`/tarefas/${antiga.id}/situacao`,'PATCH',{situacao:'pulada'})).dados.tarefa.situacao,'pulada');
    assert.equal((await chamar('/tarefas/atrasadas')).dados.tarefas.length,0);
    assert.equal((await chamar('/tarefas/historico?inicio=2020-01-01&fim=2020-01-01')).dados.tarefas[0].situacao,'pulada');
    await chamar(`/tarefas/${antiga.id}/situacao`,'PATCH',{situacao:'pendente'});
    assert.equal((await chamar('/tarefas/atrasadas')).dados.tarefas.length,1);
    const movida = await chamar(`/tarefas/${antiga.id}/agendamento`,'PATCH',{data_prevista:hoje});
    assert.equal(movida.dados.tarefa.horario,'09:30'); assert.equal(movida.dados.tarefa.observacao,'Preservar'); assert.equal(movida.dados.tarefa.prioridade,true);
    assert.equal((await chamar('/tarefas/atrasadas')).dados.tarefas.length,0);
    assert.ok((await chamar('/tarefas?data='+hoje)).dados.tarefas.some(t=>t.id===antiga.id));
    await chamar(`/tarefas/${concluida.id}/situacao`,'PATCH',{situacao:'pulada'});
    const [[registro]] = await banco.execute('SELECT concluida_em FROM tarefas WHERE id=?',[concluida.id]); assert.equal(registro.concluida_em,null);
    assert.equal((await chamar(`/tarefas/${privada.insertId}/situacao`,'PATCH',{situacao:'pulada'})).status,404);
    assert.equal((await chamar(`/tarefas/${privada.insertId}/agendamento`,'PATCH',{data_prevista:hoje})).status,404);
    assert.equal((await chamar(`/tarefas/${antiga.id}/situacao`,'PATCH',{situacao:'invalida'})).status,400);
    assert.equal((await chamar(`/tarefas/${antiga.id}/agendamento`,'PATCH',{data_prevista:'2026-02-30'})).status,400);
  } finally {
    if(servidor){servidor.closeAllConnections();await new Promise(resolve=>servidor.close(resolve));}
    await banco.rollback(); banco.release(); await pool.end();
  }
});
