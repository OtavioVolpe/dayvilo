import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { criarPoolBanco } from '../src/db.js';
import { criarAplicacao } from '../src/app.js';
import { criarServicoAutenticacao } from '../src/servicos/autenticacao.js';
import { criarServicoRecuperacao } from '../src/servicos/recuperacao-senha.js';

test('Minha conta: nome isolado, senha atual, revogação e saída de todos', async () => {
  assert.ok(['localhost','127.0.0.1','::1'].includes(process.env.MYSQL_HOST));
  const pool = criarPoolBanco(), banco = await pool.getConnection(); let servidor;
  try {
    await banco.beginTransaction();
    const contas = criarServicoAutenticacao(banco), email = randomUUID()+'@example.test';
    const senha = 'Senha anterior para minha conta', nova = 'Outra senha para minha conta';
    const a = await contas.cadastrar({nome:'Conta A',email,senha});
    const a2 = await contas.entrar({email,senha});
    const b = await contas.cadastrar({nome:'Conta B',email:'b-'+email,senha});
    const dono = await contas.consultar(a.token);
    await banco.execute('INSERT INTO tarefas(usuario_id,titulo) VALUES (?,?)',[dono.id,'Preservar']);
    const [antes] = await banco.execute('SELECT * FROM tarefas WHERE usuario_id=?',[dono.id]);
    const mensagens=[];
    const recuperacao=criarServicoRecuperacao({banco,urlAplicacao:'http://127.0.0.1:5173/',enviarEmail:async m=>mensagens.push(m)});
    await recuperacao.solicitar({email});
    const token=mensagens[0].texto.match(/redefinir-senha=([a-f0-9]{64})/)[1];
    servidor=criarAplicacao({banco,enviarEmail:async()=>{}}).listen(0,'127.0.0.1');await once(servidor,'listening');
    const chamar=async(rota,method,body,sessao=a,csrf=sessao?.csrf)=>{
      const r=await fetch(`http://127.0.0.1:${servidor.address().port}/api/contas${rota}`,{method,headers:{'Content-Type':'application/json','X-Dayvilo':'1',...(sessao?{Cookie:'dayvilo_sessao='+sessao.token,'X-CSRF-Token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:r.status,dados:await r.json(),cookie:r.headers.get('set-cookie')};
    };
    for(const [rota,metodo,body] of [['/perfil','PATCH',{nome:'Novo'}],['/senha','PUT',{senha_atual:senha,nova_senha:nova}],['/saida-todas','POST',undefined]]){
      assert.equal((await chamar(rota,metodo,body,null)).status,401);
      assert.equal((await chamar(rota,metodo,body,a,b.csrf)).status,403);
    }
    assert.equal((await chamar('/perfil','PATCH',{nome:' ',usuario_id:dono.id})).status,400);
    assert.equal((await chamar('/perfil','PATCH',{nome:' Nome novo '})).status,200);
    assert.equal((await contas.consultar(a.token)).nome,'Nome novo');
    assert.equal((await contas.consultar(b.token)).nome,'Conta B');
    assert.equal((await chamar('/senha','PUT',{senha_atual:'incorreta',nova_senha:nova})).status,400);
    assert.equal((await chamar('/senha','PUT',{senha_atual:senha,nova_senha:'curta'})).status,400);
    assert.ok(await contas.consultar(a2.token));
    assert.equal((await chamar('/senha','PUT',{senha_atual:senha,nova_senha:nova})).status,200);
    assert.equal(await contas.consultar(a.token),null);assert.equal(await contas.consultar(a2.token),null);
    assert.ok(await contas.consultar(b.token));
    await assert.rejects(recuperacao.validar({token}),{status:400});
    await assert.rejects(contas.entrar({email,senha}),{status:401});
    const nova1=await contas.entrar({email,senha:nova}),nova2=await contas.entrar({email,senha:nova});
    const saida=await chamar('/saida-todas','POST',undefined,nova1);
    assert.equal(saida.status,200);assert.match(saida.cookie,/HttpOnly/);
    assert.equal(await contas.consultar(nova1.token),null);assert.equal(await contas.consultar(nova2.token),null);assert.ok(await contas.consultar(b.token));
    const [depois]=await banco.execute('SELECT * FROM tarefas WHERE usuario_id=?',[dono.id]);assert.deepEqual(depois,antes);
  } finally { if(servidor){servidor.closeAllConnections();await new Promise(r=>servidor.close(r));}await banco.rollback();banco.release();await pool.end(); }
});
