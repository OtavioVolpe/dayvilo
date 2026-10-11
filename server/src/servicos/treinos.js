import { ErroConta, transacionar } from './autenticacao.js';
import { validarObjeto, validarData, validarId, ErroValidacao } from '../validacoes/tarefas.js';
const json = valor => typeof valor === 'string' ? JSON.parse(valor) : valor;
const texto = (valor, max, obrigatorio = false) => {
  if (typeof valor !== 'string' || valor.length > max || (obrigatorio && !valor.trim())) throw new ErroValidacao('Preencha os textos dentro do limite indicado.');
  return valor.trim();
};
function numero(valor, max, inteiro = false, opcional = false) {
  if (opcional && valor === null) return null;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > max || (inteiro && !Number.isInteger(valor))) throw new ErroValidacao('Informe um número válido.');
  return valor;
}
export function validarFicha(dados) {
  validarObjeto(dados, ['nome', 'exercicios', 'versao']);
  const nome = texto(dados.nome, 120, true);
  if (!Array.isArray(dados.exercicios) || !dados.exercicios.length || dados.exercicios.length > 30) throw new ErroValidacao('Inclua de 1 a 30 exercícios.');
  const exercicios = dados.exercicios.map(e => {
    validarObjeto(e, ['nome', 'series', 'repeticoes', 'carga', 'descanso', 'observacao']);
    const series = numero(e.series, 10, true);
    if (!series) throw new ErroValidacao('Inclua ao menos uma série.');
    return { nome: texto(e.nome, 120, true), series, repeticoes: texto(e.repeticoes, 40, true), carga: numero(e.carga, 2000, false, true), descanso: numero(e.descanso, 3600, true, true), observacao: texto(e.observacao, 500) };
  });
  return { nome, exercicios };
}
export function criarServicoTreinos(banco) {
  async function ficha(c, usuario, id, lock = false) {
    const [[f]] = await c.execute(`SELECT * FROM fichas_treino WHERE id = ? AND usuario_id = ? AND arquivada = FALSE${lock ? ' FOR UPDATE' : ''}`, [validarId(id), usuario.id]);
    if (!f) throw new ErroConta(404, 'Ficha não encontrada.');
    return { ...f, exercicios: json(f.exercicios) };
  }
  async function sessao(c, usuario, id, lock = false) {
    const [[s]] = await c.execute(`SELECT s.*, t.titulo, t.data_prevista, t.situacao FROM sessoes_treino s JOIN tarefas t ON t.id = s.tarefa_id WHERE s.id = ? AND t.usuario_id = ?${lock ? ' FOR UPDATE' : ''}`, [validarId(id), usuario.id]);
    if (!s) throw new ErroConta(404, 'Treino não encontrado.');
    return { ...s, planejado: json(s.planejado), realizado: json(s.realizado) };
  }
  return {
    async listar(usuario, query) {
      validarObjeto(query, ['inicio', 'fim']);
      const inicio = validarData(query.inicio), fim = validarData(query.fim);
      if (fim < inicio || (new Date(fim) - new Date(inicio)) / 86400000 > 31) throw new ErroValidacao('Consulte até 31 dias.');
      const [fichas] = await banco.execute('SELECT id, nome, exercicios, versao FROM fichas_treino WHERE usuario_id = ? AND arquivada = FALSE ORDER BY id', [usuario.id]);
      const [sessoes] = await banco.execute('SELECT s.id, s.tarefa_id, t.titulo, t.data_prevista, t.situacao FROM sessoes_treino s JOIN tarefas t ON t.id = s.tarefa_id WHERE t.usuario_id = ? AND t.data_prevista BETWEEN ? AND ? ORDER BY t.data_prevista, t.id', [usuario.id, inicio, fim]);
      return { fichas: fichas.map(f => ({ ...f, exercicios: json(f.exercicios) })), sessoes };
    },
    async salvarFicha(usuario, dados, id) {
      const validada = validarFicha(dados);
      return transacionar(banco, async c => {
        if (id) {
          const anterior = await ficha(c, usuario, id, true);
          if (dados.versao !== anterior.versao) throw new ErroConta(409, 'A ficha mudou. Reabra antes de salvar.');
          await c.execute('UPDATE fichas_treino SET nome = ?, exercicios = ?, versao = versao + 1 WHERE id = ?', [validada.nome, JSON.stringify(validada.exercicios), anterior.id]);
        } else {
          const [r] = await c.execute('INSERT INTO fichas_treino (usuario_id, nome, exercicios) VALUES (?, ?, ?)', [usuario.id, validada.nome, JSON.stringify(validada.exercicios)]); id = r.insertId;
        }
        return { ficha: await ficha(c, usuario, id) };
      });
    },
    async arquivar(usuario, id) {
      const f = await ficha(banco, usuario, id);
      await banco.execute('UPDATE fichas_treino SET arquivada = TRUE WHERE id = ? AND usuario_id = ?', [f.id, usuario.id]);
      return { mensagem: 'Ficha arquivada. Os treinos agendados foram mantidos.' };
    },
    async agendar(usuario, dados) {
      validarObjeto(dados, ['ficha_id', 'inicio', 'fim', 'dias']);
      const inicio = validarData(dados.inicio), fim = validarData(dados.fim);
      if (fim < inicio || (new Date(fim) - new Date(inicio)) / 86400000 > 365) throw new ErroValidacao('Escolha um período de até 366 dias.');
      if (!Array.isArray(dados.dias) || !dados.dias.length || dados.dias.length > 7 || dados.dias.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new ErroValidacao('Escolha os dias da semana.');
      return transacionar(banco, async c => {
        const f = await ficha(c, usuario, dados.ficha_id, true);
        let quantidade = 0;
        const duracao = Math.round((new Date(fim) - new Date(inicio)) / 86400000);
        for (let deslocamento = 0; deslocamento <= duracao; deslocamento++) {
          const dia = new Date(inicio + 'T12:00:00Z');
          dia.setUTCDate(dia.getUTCDate() + deslocamento);
          if (!dados.dias.includes(dia.getUTCDay())) continue;
          const data = dia.toISOString().slice(0, 10);
          const [[existe]] = await c.execute('SELECT s.id FROM sessoes_treino s JOIN tarefas t ON t.id = s.tarefa_id WHERE s.ficha_id = ? AND t.usuario_id = ? AND t.data_prevista = ?', [f.id, usuario.id, data]);
          if (existe) continue;
          const [t] = await c.execute('INSERT INTO tarefas (usuario_id, titulo, data_prevista) VALUES (?, ?, ?)', [usuario.id, 'Treino — ' + f.nome, data]);
          const realizado = f.exercicios.map(e => ({ series: Array.from({ length: e.series }, () => ({ carga: null, repeticoes: null, feita: false })), observacao: '' }));
          await c.execute('INSERT INTO sessoes_treino (tarefa_id, ficha_id, planejado, realizado) VALUES (?, ?, ?, ?)', [t.insertId, f.id, JSON.stringify({ nome: f.nome, exercicios: f.exercicios }), JSON.stringify(realizado)]);
          quantidade++;
        }
        return { quantidade };
      });
    },
    async consultar(usuario, id) { return { sessao: await sessao(banco, usuario, id) }; },
    async registrar(usuario, id, dados) {
      validarObjeto(dados, ['versao', 'realizado', 'concluir']);
      if (typeof dados.concluir !== 'boolean') throw new ErroValidacao('Informe a ação do treino.');
      return transacionar(banco, async c => {
        const s = await sessao(c, usuario, id, true);
        if (s.versao !== dados.versao) throw new ErroConta(409, 'O registro mudou. Reabra o treino antes de salvar.');
        if (s.situacao !== 'pendente') throw new ErroConta(409, 'Restaure o treino na Rotina antes de editar.');
        if (!Array.isArray(dados.realizado) || dados.realizado.length !== s.planejado.exercicios.length) throw new ErroValidacao('Exercícios incompatíveis com este treino.');
        const realizado = dados.realizado.map((e, i) => {
          validarObjeto(e, ['series', 'observacao']);
          if (!Array.isArray(e.series) || e.series.length !== s.planejado.exercicios[i].series) throw new ErroValidacao('Número de séries inválido.');
          return { observacao: texto(e.observacao, 500), series: e.series.map(r => {
            validarObjeto(r, ['carga', 'repeticoes', 'feita']);
            if (typeof r.feita !== 'boolean') throw new ErroValidacao('Indique as séries realizadas.');
            return { carga: numero(r.carga, 2000, false, true), repeticoes: numero(r.repeticoes, 1000, true, true), feita: r.feita };
          }) };
        });
        await c.execute('UPDATE sessoes_treino SET realizado = ?, versao = versao + 1 WHERE id = ?', [JSON.stringify(realizado), s.id]);
        if (dados.concluir) await c.execute("UPDATE tarefas SET situacao = 'concluida', concluida_em = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?", [s.tarefa_id, usuario.id]);
        return { sessao: await sessao(c, usuario, id) };
      });
    },
  };
}
