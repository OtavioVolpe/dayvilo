import { transacionar } from './autenticacao.js';
import { criarServicoMetas } from './metas.js';

export async function consultarJardim(banco, usuarioId) {
  const [conquistas] = await banco.execute("SELECT DATE_FORMAT(conquistada_em,'%Y-%m-%d') AS dia FROM jardim_conquistas WHERE usuario_id=? ORDER BY id", [usuarioId]);
  return { total:conquistas.length, atual:conquistas.length%5, alvo:5,
    plantas:conquistas.filter((_,i)=>(i+1)%5===0).map((c,i)=>({numero:i+1,dia:c.dia})) };
}

export async function sincronizarJardim(banco, usuarioId, hoje) {
  return transacionar(banco, async c => {
    // Serializa sincronizações da conta e lê as metas sob bloqueio antes de premiar.
    await c.execute('SELECT id FROM usuarios WHERE id=? FOR UPDATE',[usuarioId]);
    await c.execute('SELECT id FROM metas WHERE usuario_id=? FOR UPDATE',[usuarioId]);
    const anterior=await consultarJardim(c,usuarioId);
    const dados=await criarServicoMetas(c).listar(usuarioId,hoje);
    for (const m of dados.metas.filter(m=>m.concluida)) {
      const p=dados.periodos[m.periodo];
      // A conquista sobrevive à edição/exclusão da meta. Períodos sobrepostos
      // também não premiam novamente ao alternar entre semana e mês.
      await c.execute(`INSERT INTO jardim_conquistas(usuario_id,meta_id,inicio,fim)
        SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM jardim_conquistas
        WHERE usuario_id=? AND meta_id=? AND inicio<=? AND fim>=?)`,
      [usuarioId,m.id,p.inicio,p.fim,usuarioId,m.id,p.fim,p.inicio]);
    }
    const jardim=await consultarJardim(c,usuarioId);
    return {...dados,jardim:{...jardim,novasPlantas:jardim.plantas.length-anterior.plantas.length}};
  });
}
