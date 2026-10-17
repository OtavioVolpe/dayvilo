import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPoolBanco } from '../src/db.js';
import { criarServicoFinanceiro } from '../src/servicos/financeiro.js';
import { obterDataHoje } from '../src/validacoes/tarefas.js';

test('Aportes: totais, destino, sincronização, conversão, vínculos e isolamento',async()=>{
  const pool=criarPoolBanco(),c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const [a]=await c.execute('INSERT INTO usuarios(nome) VALUES (?)',['Aportes']);
    const [b]=await c.execute('INSERT INTO usuarios(nome) VALUES (?)',['Outra carteira']);
    const u={id:a.insertId,fuso_horario:'America/Sao_Paulo'},outro={...u,id:b.insertId};
    const s=criarServicoFinanceiro(c),hoje=obterDataHoje(u.fuso_horario),mes=hoje.slice(0,7);
    const fixa={tipo:'fixa',nome:'Reserva',instituicao:'Banco',detalhes:{produto:'CDB',emissor:'Banco',indice:'cdi',taxa:100,vencimento:null,liquidez:'Diária'}};
    const i=await s.salvarInvestimento(u,fixa),j=await s.salvarInvestimento(u,{...fixa,nome:'Objetivo'}),alheio=await s.salvarInvestimento(outro,fixa);
    const base={tipo:'aporte',descricao:'Meu aporte',categoria:'Investimentos',valor_centavos:12345,data_prevista:hoje,data_pagamento:null,observacao:'',investimento_id:i.id};
    const carteira=async id=>(await s.investimentos(u)).investimentos.find(x=>x.id===id);
    const movimentos=async()=>(await s.listar(u,{mes}));
    await assert.rejects(s.salvarLancamento(u,{...base,investimento_id:alheio.id}),{status:404});
    await assert.rejects(s.salvarLancamento(u,{...base,investimento_id:null}),{status:400});
    assert.equal((await movimentos()).lancamentos.length,0);
    await s.salvarLancamento(u,base);
    let l=(await movimentos()).lancamentos[0];
    assert.equal((await movimentos()).resumo.aportar,12345);
    assert.equal((await carteira(i.id)).aportes,0);
    await s.situacao(u,l.id,{versao:l.versao,data_pagamento:hoje});
    let resumo=(await movimentos()).resumo;
    assert.equal(resumo.aportado,12345);assert.equal(resumo.pago,0);assert.deepEqual(Object.keys(resumo.categorias),[]);
    assert.equal((await carteira(i.id)).aportes,12345);
    await assert.rejects(s.situacao(u,l.id,{versao:l.versao,data_pagamento:hoje}),{status:409});
    let inv=await carteira(i.id);
    await assert.rejects(s.excluirRegistro(u,i.id,inv.registros[0].id,{versao:inv.versao}),{status:409});
    await assert.rejects(s.excluirInvestimento(u,i.id,{versao:inv.versao}),{status:409});
    l=await s.consultarLancamento(u,l.id);
    await s.salvarLancamento(u,{...base,versao:l.versao,data_pagamento:hoje,valor_centavos:20000,investimento_id:j.id},l.id);
    assert.equal((await carteira(i.id)).aportes,0);assert.equal((await carteira(j.id)).aportes,20000);
    l=await s.consultarLancamento(u,l.id);
    await s.situacao(u,l.id,{versao:l.versao,data_pagamento:null});
    assert.equal((await carteira(j.id)).aportes,0);
    l=await s.consultarLancamento(u,l.id);
    await s.situacao(u,l.id,{versao:l.versao,data_pagamento:hoje});
    assert.equal((await carteira(j.id)).registros.length,1);
    l=await s.consultarLancamento(u,l.id);
    await s.excluirLancamento(u,l.id,{versao:l.versao,escopo:'este'});
    assert.equal((await carteira(j.id)).registros.length,0);

    // Existing category expenses remain unchanged until explicitly converted.
    await s.salvarLancamento(u,{...base,tipo:'despesa',data_pagamento:hoje});
    assert.equal((await movimentos()).resumo.pago,12345);
    inv=await carteira(i.id);
    await s.registrar(u,i.id,{versao:inv.versao,tipo:'aporte',valor_centavos:12345,data:hoje,observacao:''});
    const existente=(await carteira(i.id)).registros[0];
    l=(await movimentos()).lancamentos[0];
    await assert.rejects(s.salvarLancamento(u,{...base,versao:l.versao,data_pagamento:hoje,registro_id:existente.id,valor_centavos:1},l.id),{status:400});
    assert.equal((await s.consultarLancamento(u,l.id)).tipo,'despesa');
    await s.salvarLancamento(u,{...base,versao:l.versao,data_pagamento:hoje,registro_id:existente.id},l.id);
    inv=await carteira(i.id);assert.equal(inv.registros.length,1);assert.equal(inv.registros[0].id,existente.id);
    assert.equal((await movimentos()).resumo.pago,0);
    await assert.rejects(s.salvarLancamento(u,{...base,data_pagamento:hoje,registro_id:existente.id}),{status:400});
    assert.equal((await movimentos()).lancamentos.length,1);
    // Going back to an expense removes the linked portfolio record.
    l=await s.consultarLancamento(u,l.id);
    await s.salvarLancamento(u,{...base,tipo:'despesa',versao:l.versao,data_pagamento:hoje},l.id);
    assert.equal((await carteira(i.id)).aportes,0);

    inv=await carteira(i.id);
    await s.registrar(u,i.id,{versao:inv.versao,tipo:'aporte',valor_centavos:5000,data:hoje,observacao:'Da carteira',incluir_movimentacao:true});
    inv=await carteira(i.id);assert.equal(inv.aportes,5000);assert.ok(inv.registros[0].lancamento_id);
    assert.equal((await movimentos()).resumo.aportado,5000);
    await assert.rejects(s.registrar(u,i.id,{versao:inv.versao,tipo:'saldo',valor_centavos:5000,data:hoje,observacao:'',incluir_movimentacao:true}),{status:400});
    assert.equal((await s.listar(outro,{mes})).lancamentos.length,0);

    // Only realized occurrences affect the portfolio; future edits choose a new destination.
    const ano=Number(hoje.slice(0,4))+1,inicio=ano+'-01-01';
    await s.salvarLancamento(u,{...base,data_prevista:inicio,repetir_ate:ano+'-03-01'});
    const primeiro=(await s.listar(u,{mes:ano+'-01'})).lancamentos[0];
    await s.salvarLancamento(u,{...base,data_prevista:inicio,versao:primeiro.versao,escopo:'proximos',investimento_id:j.id},primeiro.id);
    const segundo=(await s.listar(u,{mes:ano+'-02'})).lancamentos[0];
    assert.equal(segundo.investimento_id,j.id);
    await s.situacao(u,segundo.id,{versao:segundo.versao,data_pagamento:hoje});
    const atualizado=await s.consultarLancamento(u,primeiro.id);
    await s.excluirLancamento(u,primeiro.id,{versao:atualizado.versao,escopo:'proximos'});
    assert.equal((await carteira(j.id)).aportes,12345);
    assert.equal((await s.listar(u,{mes:ano+'-03'})).lancamentos.length,0);
  }finally{await c.rollback();c.release();await pool.end();}
});
