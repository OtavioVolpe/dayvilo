import { randomUUID } from 'node:crypto';
import { ErroValidacao, validarData, validarObjeto } from '../validacoes/tarefas.js';
import { ErroAplicacao } from '../erros/aplicacao.js';
import { obterSemana } from './semana.js';
import { transacionar } from './autenticacao.js';

const tipos = ['rotina', 'treino', 'leitura', 'casa', 'manual'];
export function periodoMeta(hoje, periodo) {
  validarData(hoje);
  if (periodo === 'semanal') return obterSemana(hoje);
  if (periodo !== 'mensal') throw new ErroValidacao('Escolha semanal ou mensal.');
  const fim = new Date(`${hoje.slice(0,7)}-01T12:00:00Z`);
  fim.setUTCMonth(fim.getUTCMonth()+1, 0);
  const ultimo = fim.getUTCDate();
  const dias = Array.from({length:ultimo}, (_,i) => `${hoje.slice(0,7)}-${String(i+1).padStart(2,'0')}`);
  return { inicio:dias[0], fim:dias.at(-1), dias };
}
export function validarMissao(dados) {
  validarObjeto(dados, ['tipo','periodo','medida','titulo','quantidade','origem','versao']);
  if (!tipos.includes(dados.tipo) || !['semanal','mensal'].includes(dados.periodo)) throw new ErroValidacao('Escolha o tipo e o período da meta.');
  if (!['dias','ocorrencias'].includes(dados.medida) || (['manual','leitura'].includes(dados.tipo) && dados.medida !== 'dias')) throw new ErroValidacao('Leitura e metas manuais contam dias diferentes.');
  const limite = dados.medida === 'dias' ? (dados.periodo === 'semanal' ? 7 : 31) : 1000;
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1 || dados.quantidade > limite) throw new ErroValidacao(`Escolha uma quantidade de 1 a ${limite}.`);
  if (typeof dados.titulo !== 'string' || !dados.titulo.trim() || [...dados.titulo.trim()].length > 80) throw new ErroValidacao('Dê um nome à meta, com até 80 caracteres.');
  if (!['sugestao','pessoal'].includes(dados.origem)) throw new ErroValidacao('Origem da meta inválida.');
  return {tipo:dados.tipo, periodo:dados.periodo, medida:dados.medida, titulo:dados.titulo.trim(), quantidade:dados.quantidade, origem:dados.origem};
}
function validarVersao(versao) { if (!Number.isSafeInteger(versao) || versao < 1) throw new ErroValidacao('Atualize a meta antes de continuar.'); }
export function validarIdMeta(id) { if (typeof id !== 'string' || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) throw new ErroValidacao('Meta inválida.'); return id; }
const campos = "id,usuario_id,tipo,periodo,medida,titulo,quantidade,origem,versao,DATE_FORMAT(periodo_manual,'%Y-%m-%d') AS periodo_manual,dias_manuais,legado_usuario_id";
const lerDias = m => typeof m.dias_manuais === 'string' ? JSON.parse(m.dias_manuais) : m.dias_manuais;

export function criarServicoMetas(banco) {
  async function atual(c, usuarioId, id, versao) {
    validarIdMeta(id); validarVersao(versao);
    const [[meta]] = await c.execute(`SELECT ${campos} FROM metas WHERE usuario_id=? AND id=? FOR UPDATE`, [usuarioId,id]);
    if (!meta) throw new ErroAplicacao(404,'Meta não encontrada.');
    if (meta.versao !== versao) throw new ErroAplicacao(409,'Esta meta mudou em outra tela. Atualize antes de tentar novamente.');
    return meta;
  }
  async function limparLegado(c, usuarioId, meta) {
    if (meta.legado_usuario_id) await c.execute('DELETE FROM metas_semanais WHERE usuario_id=?', [usuarioId]);
  }
  return {
    async listar(usuarioId, hoje) {
      const periodos = {semanal:periodoMeta(hoje,'semanal'), mensal:periodoMeta(hoje,'mensal')};
      const [lista] = await banco.execute(`SELECT ${campos} FROM metas WHERE usuario_id=? ORDER BY periodo,tipo,id`, [usuarioId]);
      const metas = [];
      for (const m of lista) {
        const intervalo = periodos[m.periodo];
        let cumpridos;
        if (m.tipo === 'manual') cumpridos = m.periodo_manual === intervalo.inicio ? lerDias(m).filter(d => d >= intervalo.inicio && d <= hoje) : [];
        else {
          const filtro = {rotina:'1=1', casa:"t.area='casa'", treino:'EXISTS (SELECT 1 FROM sessoes_treino s WHERE s.tarefa_id=t.id)', leitura:'EXISTS (SELECT 1 FROM leituras_agendadas l WHERE l.tarefa_id=t.id)'}[m.tipo];
          const [tarefas] = await banco.execute(`SELECT t.id,DATE_FORMAT(t.data_prevista,'%Y-%m-%d') AS dia FROM tarefas t WHERE t.usuario_id=? AND t.situacao='concluida' AND t.data_prevista BETWEEN ? AND ? AND ${filtro} ORDER BY t.data_prevista,t.id`, [usuarioId,intervalo.inicio,hoje]);
          cumpridos = m.medida === 'dias' ? [...new Set(tarefas.map(t=>t.dia))] : tarefas.map(t=>t.id);
        }
        metas.push({id:m.id,tipo:m.tipo,periodo:m.periodo,medida:m.medida,titulo:m.titulo,quantidade:m.quantidade,origem:m.origem,versao:m.versao,atual:cumpridos.length,concluida:cumpridos.length>=m.quantidade,...(m.tipo==='manual'?{dias_marcados:cumpridos}:{})});
      }
      return {metas,periodos,hoje};
    },
    async criar(usuarioId,dados) {
      const m = validarMissao(dados), id = randomUUID();
      await transacionar(banco, async c => {
        await c.execute('SELECT id FROM usuarios WHERE id=? FOR UPDATE',[usuarioId]);
        const [[{total}]] = await c.execute('SELECT COUNT(*) AS total FROM metas WHERE usuario_id=?',[usuarioId]);
        if (total >= 12) throw new ErroValidacao('Você pode acompanhar até 12 metas. Remova uma para criar outra.');
        await c.execute('INSERT INTO metas(id,usuario_id,tipo,periodo,medida,titulo,quantidade,origem,dias_manuais) VALUES (?,?,?,?,?,?,?,?,JSON_ARRAY())',[id,usuarioId,m.tipo,m.periodo,m.medida,m.titulo,m.quantidade,m.origem]);
      });
      return id;
    },
    async editar(usuarioId,id,dados) {
      const m = validarMissao(dados);
      await transacionar(banco, async c => {
        const anterior = await atual(c,usuarioId,id,dados.versao);
        // Alterar somente título/quantidade preserva os dias já marcados.
        const limpar = anterior.tipo!==m.tipo || anterior.periodo!==m.periodo || anterior.medida!==m.medida;
        await c.execute(`UPDATE metas SET tipo=?,periodo=?,medida=?,titulo=?,quantidade=?,origem=?,versao=versao+1${limpar?',periodo_manual=NULL,dias_manuais=JSON_ARRAY()':''} WHERE usuario_id=? AND id=?`,[m.tipo,m.periodo,m.medida,m.titulo,m.quantidade,m.origem,usuarioId,id]);
        await limparLegado(c,usuarioId,anterior);
      });
    },
    async marcar(usuarioId,id,hoje,dados) {
      validarObjeto(dados,['versao','dia','cumprido']); validarData(dados.dia);
      if (typeof dados.cumprido !== 'boolean') throw new ErroValidacao('Informe se o dia foi cumprido.');
      await transacionar(banco, async c => {
        const m = await atual(c,usuarioId,id,dados.versao), intervalo = periodoMeta(hoje,m.periodo);
        if (m.tipo !== 'manual') throw new ErroValidacao('Esta meta é atualizada automaticamente pelas atividades.');
        if (dados.dia < intervalo.inicio || dados.dia > hoje) throw new ErroValidacao('Marque um dia deste período que já chegou.');
        const dias = new Set(m.periodo_manual === intervalo.inicio ? lerDias(m) : []);
        if (dados.cumprido) dias.add(dados.dia); else dias.delete(dados.dia);
        await c.execute('UPDATE metas SET periodo_manual=?,dias_manuais=?,versao=versao+1 WHERE usuario_id=? AND id=?',[intervalo.inicio,JSON.stringify([...dias].sort()),usuarioId,id]);
        await limparLegado(c,usuarioId,m);
      });
    },
    async remover(usuarioId,id,dados) {
      validarObjeto(dados,['versao']);
      await transacionar(banco, async c => { const m = await atual(c,usuarioId,id,dados.versao); await c.execute('DELETE FROM metas WHERE usuario_id=? AND id=?',[usuarioId,id]); await limparLegado(c,usuarioId,m); });
    },
  };
}
