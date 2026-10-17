import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoFinanceiro } from '../src/servicos/financeiro.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';
import { criarAplicacao } from '../src/app.js';
import { prepararSessaoTeste } from './sessao-fixture.js';
const base={tipo:'despesa',descricao:'Internet',categoria:'Moradia',valor_centavos:10999,data_prevista:'2030-01-31',data_pagamento:null,observacao:''};
const fixa={tipo:'fixa',nome:'Reserva',instituicao:'Corretora teste',detalhes:{produto:'CDB',emissor:'Banco teste',indice:'cdi',taxa:110,vencimento:'2030-12-31',liquidez:'Diária'}};
async function fixture(acao){const pool=criarPoolBanco(),banco=await pool.getConnection();try{await banco.beginTransaction();const [a]=await banco.execute('INSERT INTO usuarios(nome) VALUES (?)',['Financeiro teste']);const [b]=await banco.execute('INSERT INTO usuarios(nome) VALUES (?)',['Outra conta']);await acao(banco,{id:a.insertId,fuso_horario:'America/Sao_Paulo'},{id:b.insertId,fuso_horario:'America/Sao_Paulo'});}finally{await banco.rollback();banco.release();await pool.end();}}
test('Financeiro: consulta mensal, centavos, situação, edição e isolamento',async()=>fixture(async(banco,u,outro)=>{
  const s=criarServicoFinanceiro(banco),hoje=obterDataHoje(u.fuso_horario);
  await s.salvarLancamento(u,{...base,data_prevista:'2026-01-01',data_pagamento:hoje});
  await s.salvarLancamento(u,{...base,tipo:'receita',descricao:'Salário',data_prevista:'2026-01-02',valor_centavos:300001,data_pagamento:hoje});
  const r=await s.listar(u,{mes:'2026-01'}),l=r.lancamentos[0];
  assert.equal(r.resumo.pago,10999);assert.equal(r.resumo.recebido,300001);assert.equal(r.resumo.categorias.Moradia,10999);
  assert.equal((await s.listar(outro,{mes:'2026-01'})).lancamentos.length,0);
  await assert.rejects(s.situacao(outro,l.id,{versao:1,data_pagamento:null}),{status:404});
  await assert.rejects(s.excluirLancamento(outro,l.id,{versao:1,escopo:'este'}),{status:404});
  await s.situacao(u,l.id,{versao:1,data_pagamento:null});
  await assert.rejects(s.situacao(u,l.id,{versao:1,data_pagamento:hoje}),{status:409});
  await s.salvarLancamento(u,{...base,data_prevista:'2026-02-01',valor_centavos:12345,versao:2,escopo:'este'},l.id);
  const fevereiro=await s.listar(u,{mes:'2026-02'});assert.equal(fevereiro.resumo.pagar,12345);assert.equal((await s.listar(u,{mes:'2026-01'})).lancamentos.length,1);
  await assert.rejects(s.listar(u,{mes:'2026-13'}),{status:400});
  await assert.rejects(s.salvarLancamento(u,{...base,valor_centavos:1.234}),{status:400});
  await assert.rejects(s.salvarLancamento(u,{...base,data_pagamento:'9999-12-31'}),{status:400});
  await s.excluirLancamento(u,l.id,{versao:3,escopo:'este'});assert.equal((await s.listar(u,{mes:'2026-02'})).lancamentos.length,0);
}));
test('Financeiro: recorrências, edições futuras e encerramento preservam pagos',async()=>fixture(async(banco,u)=>{
  const s=criarServicoFinanceiro(banco);
  await s.salvarLancamento(u,{...base,repetir_ate:'2030-04-30'});
  const jan=(await s.listar(u,{mes:'2030-01'})).lancamentos[0],fev=(await s.listar(u,{mes:'2030-02'})).lancamentos[0];
  assert.equal(fev.data_prevista,'2030-02-28');
  assert.equal(fev.repeticao_ativa,true);
  assert.equal((await s.consultarLancamento(u,fev.id)).repeticao_ativa,true);
  await s.situacao(u,fev.id,{versao:1,data_pagamento:obterDataHoje(u.fuso_horario)});
  await s.salvarLancamento(u,{...base,valor_centavos:20000,versao:1,escopo:'proximos'},jan.id);
  assert.equal((await s.listar(u,{mes:'2030-02'})).lancamentos[0].valor_centavos,10999);
  assert.equal((await s.listar(u,{mes:'2030-03'})).lancamentos[0].valor_centavos,20000);
  await s.excluirLancamento(u,jan.id,{versao:2,escopo:'proximos'});
  assert.equal((await s.listar(u,{mes:'2030-01'})).lancamentos.length,0);
  assert.equal((await s.listar(u,{mes:'2030-02'})).lancamentos.length,1);
  assert.equal((await s.listar(u,{mes:'2030-03'})).lancamentos.length,0);
  const preservado=(await s.listar(u,{mes:'2030-02'})).lancamentos[0];
  assert.equal(preservado.repeticao_ativa,false);
  assert.equal(preservado.serie,fev.serie);
  assert.equal((await s.consultarLancamento(u,fev.id)).repeticao_ativa,false);
}));

test('Financeiro: indicador considera a série inteira, a data do card e somente pendentes de hoje em diante',async()=>fixture(async(banco,u,outro)=>{
  const s=criarServicoFinanceiro(banco),hoje=obterDataHoje(u.fuso_horario);
  const ano=Number(hoje.slice(0,4))+1,mes=ano+'-01';
  await s.salvarLancamento(u,{...base,data_prevista:mes+'-10',data_pagamento:hoje,repetir_ate:ano+'-03-10'});
  const jan=(await s.listar(u,{mes})).lancamentos[0];
  assert.equal(jan.repeticao_ativa,true); // A próxima ocorrência fica em outro mês.
  const mar=(await s.listar(u,{mes:ano+'-03'})).lancamentos[0];
  await s.excluirLancamento(u,mar.id,{versao:mar.versao,escopo:'proximos'});
  assert.equal((await s.consultarLancamento(u,jan.id)).repeticao_ativa,true); // Fevereiro continua.
  const fev=(await s.listar(u,{mes:ano+'-02'})).lancamentos[0];
  await s.situacao(u,fev.id,{versao:fev.versao,data_pagamento:hoje});
  assert.equal((await s.consultarLancamento(u,jan.id)).repeticao_ativa,false);
  await s.situacao(u,fev.id,{versao:fev.versao+1,data_pagamento:null});
  assert.equal((await s.consultarLancamento(u,jan.id)).repeticao_ativa,true);
  // Não confundir pendências anteriores ao card, passadas ou de outra conta.
  await banco.execute('UPDATE financeiro_lancamentos SET data_prevista=? WHERE id=?',['2000-01-01',fev.id]);
  await s.salvarLancamento(outro,{...base,data_prevista:ano+'-04-10'});
  await banco.execute('UPDATE financeiro_lancamentos SET serie=? WHERE usuario_id=?',[jan.serie,outro.id]);
  assert.equal((await s.consultarLancamento(u,jan.id)).repeticao_ativa,false);
  await s.salvarLancamento(u,{...base,data_prevista:mes+'-15'});
  assert.equal((await s.listar(u,{mes})).lancamentos.find(l=>!l.serie).repeticao_ativa,false);
}));
test('Financeiro: posições manuais, registros, datas, concorrência e separação de despesas',async()=>fixture(async(banco,u,outro)=>{
  const s=criarServicoFinanceiro(banco),{id}=await s.salvarInvestimento(u,fixa);
  await assert.rejects(s.salvarInvestimento(outro,{...fixa,versao:1},id),{status:404});
  await assert.rejects(s.registrar(outro,id,{versao:1,tipo:'aporte',data:'2026-01-01',valor_centavos:10000,observacao:''}),{status:404});
  await s.registrar(u,id,{versao:1,tipo:'aporte',data:'2026-01-01',valor_centavos:10000,observacao:'Inicial'});
  await assert.rejects(s.registrar(u,id,{versao:1,tipo:'aporte',data:'2026-01-01',valor_centavos:10000,observacao:''}),{status:409});
  await s.registrar(u,id,{versao:2,tipo:'saldo',data:'2026-03-01',valor_centavos:11000,observacao:''});
  await s.registrar(u,id,{versao:3,tipo:'saldo',data:'2026-02-01',valor_centavos:10500,observacao:'Avaliação antiga'});
  await s.registrar(u,id,{versao:4,tipo:'resgate',data:'2026-04-01',valor_centavos:5000,observacao:''});
  let i=(await s.investimentos(u)).investimentos[0];
  assert.equal(i.aportes,10000);assert.equal(i.resgates,5000);assert.equal(i.saldo.valor_centavos,11000);assert.equal(i.saldo.data,'2026-03-01');
  assert.equal((await s.listar(u,{mes:'2026-01'})).lancamentos.length,0);
  assert.equal((await s.investimentos(outro)).investimentos.length,0);
  await assert.rejects(s.excluirRegistro(outro,id,i.registros[0].id,{versao:i.versao}),{status:404});
  await s.excluirRegistro(u,id,i.saldo.id,{versao:i.versao});
  i=(await s.investimentos(u)).investimentos[0];assert.equal(i.saldo.valor_centavos,10500);
  await s.salvarInvestimento(u,{tipo:'variavel',nome:'Ação',instituicao:'Corretora',detalhes:{codigo:'abcd3',classe:'acao',quantidade:10,preco_medio_centavos:3025}});
  await assert.rejects(s.salvarInvestimento(u,{...fixa,detalhes:{...fixa.detalhes,taxa:-1}}),{status:400});
  await s.excluirInvestimento(u,id,{versao:i.versao});
  const [[resto]]=await banco.execute('SELECT COUNT(*) AS total FROM financeiro_registros WHERE investimento_id=?',[id]);assert.equal(resto.total,0);
}));
test('Financeiro HTTP: sessão, CSRF, JSON e persistência',async()=>fixture(async(banco,u)=>{
  const headers=await prepararSessaoTeste(banco,u.id),servidor=criarAplicacao({banco}).listen(0,'127.0.0.1');await once(servidor,'listening');
  try{
    const url=`http://127.0.0.1:${servidor.address().port}/api/financeiro`;
    assert.equal((await fetch(url)).status,401);
    assert.equal((await fetch(url+'/lancamentos',{method:'POST',headers:{...headers,'X-CSRF-Token':''},body:JSON.stringify(base)})).status,403);
    assert.equal((await fetch(url+'/lancamentos',{method:'POST',headers,body:JSON.stringify(base)})).status,201);
    const lista=await (await fetch(url+'?mes=2030-01',{headers})).json();assert.equal(lista.lancamentos.length,1);
    const invest=await fetch(url+'/investimentos',{method:'POST',headers,body:JSON.stringify(fixa)});assert.equal(invest.status,201);
    const {id}=await invest.json();assert.equal((await fetch(url+'/investimentos/'+id,{method:'DELETE',headers:{...headers,'X-CSRF-Token':''},body:JSON.stringify({versao:1})})).status,403);
  }finally{await new Promise(r=>servidor.close(r));}
}));
