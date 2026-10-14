import { randomUUID } from 'node:crypto';
import { ErroConta, transacionar } from './autenticacao.js';
import { validarObjeto, validarData, validarId, obterDataHoje, ErroValidacao } from '../validacoes/tarefas.js';

const texto = (v, max, obrigatorio = true) => {
  if (typeof v !== 'string' || v.length > max || (obrigatorio && !v.trim())) throw new ErroValidacao('Confira os textos e seus limites.');
  return v.trim();
};
const escolher = (v, opcoes) => { if (!opcoes.includes(v)) throw new ErroValidacao('Escolha uma opção válida.'); return v; };
export function centavos(v, zero = false) {
  if (!Number.isSafeInteger(v) || v < (zero ? 0 : 1) || v > 100000000000) throw new ErroValidacao('Informe um valor em centavos, de até R$ 1 bilhão.');
  return v;
}
function numeroOpcional(v, max) {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) throw new ErroValidacao('Informe uma quantidade ou taxa válida.');
  return v;
}
export function datasMensais(inicio, fim) {
  validarData(inicio); validarData(fim);
  if (fim < inicio || (new Date(fim) - new Date(inicio)) / 86400000 > 365) throw new ErroValidacao('Repita por até 366 dias.');
  const [ano, mes, dia] = inicio.split('-').map(Number), datas = [];
  for (let n = 0; n < 13; n++) {
    const y = ano + Math.floor((mes - 1 + n) / 12), m = (mes - 1 + n) % 12 + 1;
    if (y > 9999) break;
    const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const data = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`;
    if (data > fim) break;
    datas.push(data);
  }
  return datas;
}
function mesPeriodo(mes) {
  if (typeof mes !== 'string' || !/^[1-9]\d{3}-\d{2}$/.test(mes)) throw new ErroValidacao('Escolha um mês válido.');
  const inicio = validarData(mes + '-01'), [a, m] = mes.split('-').map(Number);
  return [inicio, mes + '-' + new Date(Date.UTC(a, m, 0)).getUTCDate()];
}
function pagamento(data, usuario) {
  if (data === null) return null;
  validarData(data);
  if (data > obterDataHoje(usuario.fuso_horario)) throw new ErroValidacao('A data realizada não pode estar no futuro.');
  return data;
}
function lancamento(d, usuario) {
  validarObjeto(d, ['tipo','descricao','categoria','valor_centavos','data_prevista','data_pagamento','observacao','repetir_ate','escopo','versao']);
  return { tipo: escolher(d.tipo, ['receita','despesa']), descricao: texto(d.descricao,120), categoria: texto(d.categoria,60), valor_centavos: centavos(d.valor_centavos), data_prevista: validarData(d.data_prevista), data_pagamento: pagamento(d.data_pagamento, usuario), observacao: texto(d.observacao,1000,false) };
}
function investimento(d) {
  validarObjeto(d, ['tipo','nome','instituicao','detalhes','versao']);
  const tipo = escolher(d.tipo, ['fixa','variavel']);
  const e = d.detalhes;
  let detalhes;
  if (tipo === 'fixa') {
    validarObjeto(e, ['produto','emissor','indice','taxa','vencimento','liquidez']);
    detalhes = { produto: texto(e.produto,60), emissor: texto(e.emissor,120), indice: escolher(e.indice,['cdi','prefixado','ipca']), taxa: numeroOpcional(e.taxa,10000), vencimento: e.vencimento === null ? null : validarData(e.vencimento), liquidez: texto(e.liquidez,120,false) };
  } else {
    validarObjeto(e, ['codigo','classe','quantidade','preco_medio_centavos']);
    detalhes = { codigo: texto(e.codigo,30).toUpperCase(), classe: escolher(e.classe,['acao','fii','etf','outro']), quantidade: numeroOpcional(e.quantidade,1000000000), preco_medio_centavos: e.preco_medio_centavos === null ? null : centavos(e.preco_medio_centavos,true) };
  }
  return { tipo, nome: texto(d.nome,120), instituicao: texto(d.instituicao,120), detalhes };
}
const json = v => typeof v === 'string' ? JSON.parse(v) : v;
export function criarServicoFinanceiro(banco) {
  async function obter(c, tabela, usuario, id) {
    const [[r]] = await c.execute(`SELECT * FROM ${tabela} WHERE id = ? AND usuario_id = ? FOR UPDATE`, [validarId(id),usuario.id]);
    if (!r) throw new ErroConta(404,'Registro não encontrado.');
    return r;
  }
  function versao(d, r) { if (d.versao !== r.versao) throw new ErroConta(409,'O registro mudou. Feche e abra novamente antes de alterar.'); }
  return {
    async listar(usuario, query) {
      validarObjeto(query,['mes']);
      const mes = query.mes || obterDataHoje(usuario.fuso_horario).slice(0,7), [inicio,fim] = mesPeriodo(mes);
      const [lancamentos] = await banco.execute('SELECT * FROM financeiro_lancamentos WHERE usuario_id = ? AND data_prevista BETWEEN ? AND ? ORDER BY data_prevista, id', [usuario.id,inicio,fim]);
      // O mês é o da data prevista, inclusive para lançamentos quitados em outra data.
      const resumo = { recebido:0, pago:0, receber:0, pagar:0, categorias:Object.create(null) };
      for (const l of lancamentos) {
        l.valor_centavos = Number(l.valor_centavos);
        const chave = l.tipo === 'receita' ? (l.data_pagamento ? 'recebido':'receber') : (l.data_pagamento ? 'pago':'pagar');
        resumo[chave] += l.valor_centavos;
        if (chave === 'pago') resumo.categorias[l.categoria] = (Object.hasOwn(resumo.categorias,l.categoria) ? resumo.categorias[l.categoria] : 0) + l.valor_centavos;
      }
      return { mes, lancamentos, resumo };
    },
    async salvarLancamento(usuario, d, id) {
      const v = lancamento(d,usuario);
      return transacionar(banco, async c => {
        if (id) {
          if (d.repetir_ate) throw new ErroValidacao('A repetição é definida na criação.');
          const r = await obter(c,'financeiro_lancamentos',usuario,id); versao(d,r);
          const escopo = escolher(d.escopo || 'este',['este','proximos']);
          if (escopo === 'proximos') {
            if (!r.serie || r.data_pagamento || r.data_prevista < obterDataHoje(usuario.fuso_horario) || v.data_pagamento || v.data_prevista !== r.data_prevista) throw new ErroValidacao('Edite próximos a partir de um lançamento pendente de hoje em diante, sem mudar data ou situação.');
            await c.execute('UPDATE financeiro_lancamentos SET tipo=?, descricao=?, categoria=?, valor_centavos=?, observacao=?, versao=versao+1 WHERE usuario_id=? AND serie=? AND data_prevista>=? AND data_pagamento IS NULL', [v.tipo,v.descricao,v.categoria,v.valor_centavos,v.observacao,usuario.id,r.serie,r.data_prevista]);
          } else await c.execute('UPDATE financeiro_lancamentos SET tipo=?, descricao=?, categoria=?, valor_centavos=?, data_prevista=?, data_pagamento=?, observacao=?, versao=versao+1 WHERE id=? AND usuario_id=?', [...Object.values(v),r.id,usuario.id]);
          return { mensagem:'Lançamento atualizado.' };
        }
        const datas = d.repetir_ate ? datasMensais(v.data_prevista,d.repetir_ate) : [v.data_prevista];
        const serie = d.repetir_ate ? randomUUID() : null;
        for (let i=0;i<datas.length;i++) await c.execute('INSERT INTO financeiro_lancamentos (usuario_id,tipo,descricao,categoria,valor_centavos,data_prevista,data_pagamento,observacao,serie) VALUES (?,?,?,?,?,?,?,?,?)',[usuario.id,v.tipo,v.descricao,v.categoria,v.valor_centavos,datas[i],i===0?v.data_pagamento:null,v.observacao,serie]);
        return { mensagem:`${datas.length} lançamento(s) criado(s).` };
      });
    },
    async situacao(usuario,id,d) {
      validarObjeto(d,['versao','data_pagamento']); const data = pagamento(d.data_pagamento,usuario);
      return transacionar(banco, async c => {
        const r = await obter(c,'financeiro_lancamentos',usuario,id); versao(d,r);
        await c.execute('UPDATE financeiro_lancamentos SET data_pagamento=?, versao=versao+1 WHERE id=? AND usuario_id=?',[data,r.id,usuario.id]);
        return { mensagem:data?'Pagamento/recebimento registrado.':'Lançamento voltou a pendente.' };
      });
    },
    async excluirLancamento(usuario,id,d) {
      validarObjeto(d,['versao','escopo']); const escopo = escolher(d.escopo,['este','proximos']);
      return transacionar(banco, async c => {
        const r = await obter(c,'financeiro_lancamentos',usuario,id); versao(d,r);
        if (escopo==='este') await c.execute('DELETE FROM financeiro_lancamentos WHERE id=? AND usuario_id=?',[r.id,usuario.id]);
        else {
          if (!r.serie) throw new ErroValidacao('Este lançamento não tem repetição.');
          const inicio = r.data_prevista > obterDataHoje(usuario.fuso_horario) ? r.data_prevista : obterDataHoje(usuario.fuso_horario);
          await c.execute('DELETE FROM financeiro_lancamentos WHERE usuario_id=? AND serie=? AND data_prevista>=? AND data_pagamento IS NULL',[usuario.id,r.serie,inicio]);
        }
        return { mensagem:escopo==='este'?'Lançamento excluído.':'Repetição encerrada a partir da data selecionada ou de hoje. Pagos e passados mantidos.' };
      });
    },
    async investimentos(usuario) {
      const [itens] = await banco.execute('SELECT * FROM financeiro_investimentos WHERE usuario_id=? ORDER BY id DESC',[usuario.id]);
      const [registros] = await banco.execute('SELECT r.* FROM financeiro_registros r JOIN financeiro_investimentos i ON i.id=r.investimento_id WHERE i.usuario_id=? ORDER BY r.data, r.id',[usuario.id]);
      return { investimentos:itens.map(i=>{
        const movimentos=registros.filter(r=>r.investimento_id===i.id).map(r=>({...r,valor_centavos:Number(r.valor_centavos)}));
        const saldo=movimentos.filter(r=>r.tipo==='saldo').at(-1) || null;
        return {...i,detalhes:json(i.detalhes),registros:movimentos,aportes:movimentos.filter(r=>r.tipo==='aporte').reduce((a,r)=>a+r.valor_centavos,0),resgates:movimentos.filter(r=>r.tipo==='resgate').reduce((a,r)=>a+r.valor_centavos,0),saldo};
      }) };
    },
    async salvarInvestimento(usuario,d,id) {
      const v=investimento(d);
      return transacionar(banco,async c=>{
        if(id){const r=await obter(c,'financeiro_investimentos',usuario,id);versao(d,r);await c.execute('UPDATE financeiro_investimentos SET tipo=?, nome=?, instituicao=?, detalhes=?, versao=versao+1 WHERE id=? AND usuario_id=?',[v.tipo,v.nome,v.instituicao,JSON.stringify(v.detalhes),r.id,usuario.id]);}
        else {const [r]=await c.execute('INSERT INTO financeiro_investimentos (usuario_id,tipo,nome,instituicao,detalhes) VALUES (?,?,?,?,?)',[usuario.id,v.tipo,v.nome,v.instituicao,JSON.stringify(v.detalhes)]);id=r.insertId;}
        return { id:Number(id),mensagem:'Investimento salvo. Registre os aportes e o valor atual separadamente.' };
      });
    },
    async registrar(usuario,id,d) {
      validarObjeto(d,['versao','tipo','data','valor_centavos','observacao']);
      const tipo=escolher(d.tipo,['aporte','resgate','saldo']), valor=centavos(d.valor_centavos,tipo==='saldo'), data=pagamento(d.data,usuario), obs=texto(d.observacao,500,false);
      if(!data) throw new ErroValidacao('Informe a data do registro.');
      return transacionar(banco,async c=>{
        const r=await obter(c,'financeiro_investimentos',usuario,id);versao(d,r);
        await c.execute('INSERT INTO financeiro_registros (investimento_id,tipo,valor_centavos,data,observacao) VALUES (?,?,?,?,?)',[r.id,tipo,valor,data,obs]);
        await c.execute('UPDATE financeiro_investimentos SET versao=versao+1 WHERE id=?',[r.id]);
        return { mensagem:'Registro salvo. Não altera entradas ou despesas.' };
      });
    },
    async excluirInvestimento(usuario,id,d) {
      validarObjeto(d,['versao']);return transacionar(banco,async c=>{
        const r=await obter(c,'financeiro_investimentos',usuario,id);versao(d,r);
        await c.execute('DELETE FROM financeiro_investimentos WHERE id=? AND usuario_id=?',[r.id,usuario.id]);
        return { mensagem:'Investimento e seus registros excluídos.' };
      });
    },
    async excluirRegistro(usuario,id,registro,d) {
      validarObjeto(d,['versao']);return transacionar(banco,async c=>{
        const r=await obter(c,'financeiro_investimentos',usuario,id);versao(d,r);
        const [resultado]=await c.execute('DELETE FROM financeiro_registros WHERE id=? AND investimento_id=?',[validarId(registro),r.id]);
        if(!resultado.affectedRows) throw new ErroConta(404,'Registro não encontrado.');
        await c.execute('UPDATE financeiro_investimentos SET versao=versao+1 WHERE id=?',[r.id]);
        return { mensagem:'Registro removido.' };
      });
    },
  };
}
