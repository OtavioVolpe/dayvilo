import { ErroValidacao, validarObjeto, validarData } from '../validacoes/tarefas.js';
import { obterSemana } from './semana.js';
import { transacionar } from './autenticacao.js';

const titulos = { rotina: 'Avançar na rotina', treino: 'Manter os treinos', leitura: 'Reservar tempo para ler', casa: 'Cuidar da casa' };
export function validarMeta(dados) {
  validarObjeto(dados, ['tipo', 'titulo', 'dias']);
  if (![...Object.keys(titulos), 'manual'].includes(dados.tipo)) throw new ErroValidacao('Escolha um tipo de meta.');
  if (!Number.isInteger(dados.dias) || dados.dias < 1 || dados.dias > 7) throw new ErroValidacao('Escolha de 1 a 7 dias por semana.');
  if (dados.tipo === 'manual' && (typeof dados.titulo !== 'string' || !dados.titulo.trim() || [...dados.titulo.trim()].length > 80)) throw new ErroValidacao('Dê um nome à meta, com até 80 caracteres.');
  return { tipo: dados.tipo, titulo: titulos[dados.tipo] || dados.titulo.trim(), dias: dados.dias };
}
const datasManuais = meta => typeof meta.dias_manuais === 'string' ? JSON.parse(meta.dias_manuais) : meta.dias_manuais;

export function criarServicoMetaSemanal(banco) {
  return {
    async consultar(usuarioId, hoje) {
      const semana = obterSemana(hoje);
      const [[meta]] = await banco.execute('SELECT tipo,titulo,dias,DATE_FORMAT(semana_manual, "%Y-%m-%d") AS semana_manual,dias_manuais FROM metas_semanais WHERE usuario_id=?', [usuarioId]);
      if (!meta) return { meta: null, semana, hoje };
      let cumpridos;
      if (meta.tipo === 'manual') cumpridos = meta.semana_manual === semana.inicio ? datasManuais(meta).filter(d => d >= semana.inicio && d <= hoje) : [];
      else {
        // A área e o vínculo vêm do banco; nenhum filtro SQL é fornecido pelo cliente.
        const filtro = { rotina: '1=1', casa: "t.area='casa'", treino: 'EXISTS (SELECT 1 FROM sessoes_treino s WHERE s.tarefa_id=t.id)', leitura: 'EXISTS (SELECT 1 FROM leituras_agendadas l WHERE l.tarefa_id=t.id)' }[meta.tipo];
        const [registros] = await banco.execute(`SELECT DISTINCT DATE_FORMAT(t.data_prevista, '%Y-%m-%d') AS dia FROM tarefas t WHERE t.usuario_id=? AND t.situacao='concluida' AND t.data_prevista BETWEEN ? AND ? AND ${filtro} ORDER BY dia`, [usuarioId, semana.inicio, hoje]);
        cumpridos = registros.map(r => r.dia);
      }
      return { meta: { tipo: meta.tipo, titulo: meta.titulo, dias: meta.dias, cumpridos }, semana, hoje };
    },
    async salvar(usuarioId, dados) {
      const meta = validarMeta(dados);
      await banco.execute("INSERT INTO metas_semanais(usuario_id,tipo,titulo,dias,dias_manuais) VALUES (?,?,?,?,JSON_ARRAY()) ON DUPLICATE KEY UPDATE tipo=?,titulo=?,dias=?,semana_manual=NULL,dias_manuais=JSON_ARRAY()", [usuarioId, meta.tipo, meta.titulo, meta.dias, meta.tipo, meta.titulo, meta.dias]);
    },
    async marcar(usuarioId, hoje, dados) {
      validarObjeto(dados, ['dia', 'cumprido']);
      const dia = validarData(dados.dia), semana = obterSemana(hoje);
      if (dia < semana.inicio || dia > hoje || typeof dados.cumprido !== 'boolean') throw new ErroValidacao('Marque apenas dias desta semana que já chegaram.');
      await transacionar(banco, async c => {
        const [[meta]] = await c.execute('SELECT tipo,DATE_FORMAT(semana_manual, "%Y-%m-%d") AS semana_manual,dias_manuais FROM metas_semanais WHERE usuario_id=? FOR UPDATE', [usuarioId]);
        if (!meta || meta.tipo !== 'manual') throw new ErroValidacao('Esta meta não permite marcação manual. Atualize a página.');
        const dias = new Set(meta.semana_manual === semana.inicio ? datasManuais(meta) : []);
        if (dados.cumprido) dias.add(dia); else dias.delete(dia);
        await c.execute('UPDATE metas_semanais SET semana_manual=?,dias_manuais=? WHERE usuario_id=?', [semana.inicio, JSON.stringify([...dias].sort()), usuarioId]);
      });
    },
    async remover(usuarioId) { await banco.execute('DELETE FROM metas_semanais WHERE usuario_id=?', [usuarioId]); },
  };
}
