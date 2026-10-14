import { createHash } from 'node:crypto';
import { ErroConta, transacionar } from './autenticacao.js';
import { validarObjeto, validarData, validarId, validarNovaTarefa, obterDataHoje, ErroValidacao } from '../validacoes/tarefas.js';
import { obterSemana } from './semana.js';

const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const campos = 'r.id, r.tarefa_id, r.mostrar_rotina, r.nota, r.versao, t.titulo, t.observacao, t.data_prevista, t.horario, t.situacao';
const selecao = `SELECT ${campos} FROM tarefas t JOIN refeicoes r ON r.tarefa_id = t.id WHERE t.usuario_id = ?`;
const apresentar = r => ({ ...r, mostrar_rotina: Boolean(r.mostrar_rotina), horario: r.horario?.slice(0, 5) ?? null, revisao: hash(r) });
function revisar(d, r) {
  if (typeof d.revisao !== 'string' || d.revisao !== r.revisao) throw new ErroConta(409, 'A refeição mudou. Atualize a lista e abra novamente.');
}
export function validarRefeicao(d) {
  validarObjeto(d, ['titulo', 'observacao', 'horario', 'data_prevista', 'mostrar_rotina', 'revisao']);
  if (typeof d.mostrar_rotina !== 'boolean') throw new ErroValidacao('Informe se deseja mostrar na Rotina.');
  validarData(d.data_prevista);
  if (typeof d.observacao !== 'string' || !d.observacao.trim()) throw new ErroValidacao('Informe os alimentos da refeição.');
  return { ...validarNovaTarefa({ titulo: d.titulo, observacao: d.observacao, horario: d.horario, data_prevista: d.data_prevista }), mostrar_rotina: d.mostrar_rotina };
}
export function validarCopia(d, hoje) {
  validarObjeto(d, ['origem', 'destinos', 'modo', 'confirmacao']);
  const origem = validarData(d.origem);
  if (!['adicionar', 'substituir'].includes(d.modo)) throw new ErroValidacao('Escolha como copiar.');
  if (!Array.isArray(d.destinos) || !d.destinos.length || d.destinos.length > 31) throw new ErroValidacao('Escolha de 1 a 31 dias.');
  const destinos = d.destinos.map(validarData).sort();
  if (new Set(destinos).size !== destinos.length || destinos.includes(origem)) throw new ErroValidacao('Escolha dias diferentes do dia de origem, sem duplicatas.');
  if (destinos.some(data => data < hoje || (new Date(data) - new Date(hoje)) / 86400000 > 365)) throw new ErroValidacao('Copie para hoje ou os próximos 365 dias.');
  return { origem, destinos, modo: d.modo };
}
export function criarServicoAlimentacao(banco) {
  async function bloquear(c, u) {
    // Serializa criações/cópias da mesma conta, inclusive quando o dia ainda está vazio.
    await c.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [u.id]);
  }
  async function obter(c, u, id) {
    const [[r]] = await c.execute(selecao + ' AND r.id = ? FOR UPDATE', [u.id, validarId(id)]);
    if (!r) throw new ErroConta(404, 'Refeição não encontrada.');
    return apresentar(r);
  }
  async function inserir(c, u, v) {
    const [t] = await c.execute('INSERT INTO tarefas (usuario_id, titulo, observacao, data_prevista, horario) VALUES (?, ?, ?, ?, ?)', [u.id, v.titulo, v.observacao, v.data_prevista, v.horario]);
    const [r] = await c.execute('INSERT INTO refeicoes (tarefa_id, mostrar_rotina) VALUES (?, ?)', [t.insertId, v.mostrar_rotina]);
    return r.insertId;
  }
  async function operacao(u, id, d, fn) {
    return transacionar(banco, async c => {
      await bloquear(c, u);
      const r = await obter(c, u, id); revisar(d, r);
      await fn(c, r);
      return { salva: true };
    });
  }
  return {
    async listar(u, q) {
      validarObjeto(q, ['data', 'semanal']);
      if (q.semanal !== undefined && q.semanal !== 'true') throw new ErroValidacao('Período inválido.');
      const hoje = obterDataHoje(u.fuso_horario), data = validarData(q.data || hoje);
      const periodo = q.semanal === 'true' ? obterSemana(data) : { inicio: data, fim: data, dias: [data] };
      const [rows] = await banco.execute(selecao + ' AND t.data_prevista BETWEEN ? AND ? ORDER BY t.data_prevista, t.horario IS NULL, t.horario, t.id', [u.id, periodo.inicio, periodo.fim]);
      return { ...periodo, hoje, refeicoes: rows.map(apresentar) };
    },
    async salvar(u, d, id) {
      const v = validarRefeicao(d);
      return transacionar(banco, async c => {
        await bloquear(c, u);
        if (!id) return { id: await inserir(c, u, v) };
        const r = await obter(c, u, id); revisar(d, r);
        await c.execute('UPDATE tarefas SET titulo = ?, observacao = ?, horario = ?, ordem = IF(data_prevista = ?, ordem, 0), data_prevista = ? WHERE id = ? AND usuario_id = ?', [v.titulo, v.observacao, v.horario, v.data_prevista, v.data_prevista, r.tarefa_id, u.id]);
        await c.execute('UPDATE refeicoes SET mostrar_rotina = ?, versao = versao + 1 WHERE id = ?', [v.mostrar_rotina, r.id]);
        return { id: r.id };
      });
    },
    async situacao(u, id, d) {
      validarObjeto(d, ['situacao', 'revisao']);
      if (!['pendente', 'concluida', 'pulada'].includes(d.situacao)) throw new ErroValidacao('Situação inválida.');
      return operacao(u, id, d, async (c, r) => {
        await c.execute("UPDATE tarefas SET situacao = ?, concluida_em = IF(? = 'concluida', COALESCE(concluida_em, CURRENT_TIMESTAMP), NULL) WHERE id = ? AND usuario_id = ?", [d.situacao, d.situacao, r.tarefa_id, u.id]);
        await c.execute('UPDATE refeicoes SET versao = versao + 1 WHERE id = ?', [r.id]);
      });
    },
    async anotar(u, id, d) {
      validarObjeto(d, ['nota', 'revisao']);
      if (typeof d.nota !== 'string' || d.nota.length > 2000) throw new ErroValidacao('Escreva uma nota de até 2000 caracteres.');
      return operacao(u, id, d, (c, r) => c.execute('UPDATE refeicoes SET nota = ?, versao = versao + 1 WHERE id = ?', [d.nota.trim(), r.id]));
    },
    async excluir(u, id, d) {
      validarObjeto(d, ['revisao']);
      return operacao(u, id, d, (c, r) => c.execute('DELETE FROM tarefas WHERE id = ? AND usuario_id = ?', [r.tarefa_id, u.id]));
    },
    async copiar(u, d) {
      const v = validarCopia(d, obterDataHoje(u.fuso_horario));
      return transacionar(banco, async c => {
        await bloquear(c, u);
        const datas = [v.origem, ...v.destinos].sort();
        const [rows] = await c.execute(selecao + ` AND t.data_prevista IN (${datas.map(() => '?').join(',')}) ORDER BY t.id FOR UPDATE`, [u.id, ...datas]);
        const origem = rows.filter(r => r.data_prevista === v.origem);
        if (!origem.length) throw new ErroValidacao('O dia de origem não tem refeições.');
        if (origem.length * v.destinos.length > 500) throw new ErroValidacao('Copie até 500 refeições por vez.');
        const resumo = v.destinos.map(data => {
          const existentes = rows.filter(r => r.data_prevista === data);
          return { data, existentes: existentes.length, remover: v.modo === 'substituir' ? existentes.filter(r => r.situacao === 'pendente').length : 0, preservar: existentes.filter(r => r.situacao !== 'pendente').length, adicionar: origem.length };
        });
        const confirmacao = hash({ v, rows });
        if (!d.confirmacao) return { resumo, confirmacao };
        if (d.confirmacao !== confirmacao) throw new ErroConta(409, 'O planejamento mudou. Revise a cópia novamente.');
        if (v.modo === 'substituir') {
          for (const r of rows.filter(r => v.destinos.includes(r.data_prevista) && r.situacao === 'pendente')) await c.execute('DELETE FROM tarefas WHERE id = ? AND usuario_id = ?', [r.tarefa_id, u.id]);
        }
        for (const data of v.destinos) for (const r of origem) await inserir(c, u, { ...r, data_prevista: data });
        return { quantidade: origem.length * v.destinos.length, removidas: resumo.reduce((n, r) => n + r.remover, 0) };
      });
    },
  };
}
