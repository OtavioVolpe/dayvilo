import { randomUUID } from 'node:crypto';

const colunas = 'id, titulo, observacao, data_prevista, horario, horario_final, prioridade, situacao, ordem, (SELECT serie_id FROM ocorrencias_series WHERE tarefa_id = tarefas.id) AS serie_id';

function apresentarTarefa(tarefa) {
  return { ...tarefa, prioridade: Boolean(tarefa.prioridade), horario: tarefa.horario?.slice(0, 5) ?? null, horario_final: tarefa.horario_final?.slice(0, 5) ?? null };
}

export function criarRepositorioTarefas(banco) {
  return {
    async listar(usuarioId, data) {
      const [tarefas] = await banco.execute(
        `SELECT ${colunas} FROM tarefas WHERE usuario_id = ? AND data_prevista <=> ? ORDER BY ordem = 0, ordem, id`,
        [usuarioId, data],
      );
      return tarefas.map(apresentarTarefa);
    },
    async listarAtrasadas(usuarioId, hoje) {
      const [tarefas] = await banco.execute(
        'SELECT ' + colunas + " FROM tarefas WHERE usuario_id = ? AND situacao = 'pendente' AND data_prevista < ? ORDER BY data_prevista, horario IS NULL, horario, id",
        [usuarioId, hoje],
      );
      return tarefas.map(apresentarTarefa);
    },
    async reagendar(usuarioId, id, data) {
      await banco.execute('UPDATE tarefas SET ordem = IF(data_prevista <=> ?, ordem, 0), data_prevista = ? WHERE usuario_id = ? AND id = ?', [data, data, usuarioId, id]);
      return this.buscar(usuarioId, id);
    },
    async definirSituacao(usuarioId, id, situacao) {
      await banco.execute("UPDATE tarefas SET situacao = ?, concluida_em = IF(? = 'concluida', COALESCE(concluida_em, CURRENT_TIMESTAMP), NULL) WHERE usuario_id = ? AND id = ?", [situacao, situacao, usuarioId, id]);
      return this.buscar(usuarioId, id);
    },
    async listarPeriodo(usuarioId, inicio, fim) {
      const [tarefas] = await banco.execute(
        'SELECT ' + colunas + ' FROM tarefas WHERE usuario_id = ? AND data_prevista BETWEEN ? AND ? ORDER BY data_prevista, horario IS NULL, horario, ordem, id',
        [usuarioId, inicio, fim],
      );
      return tarefas.map(apresentarTarefa);
    },
    async buscar(usuarioId, id, bloquear = false) {
      const [[tarefa]] = await banco.execute(`SELECT ${colunas} FROM tarefas WHERE usuario_id = ? AND id = ?${bloquear ? ' FOR UPDATE' : ''}`, [usuarioId, id]);
      return tarefa ? apresentarTarefa(tarefa) : null;
    },
    async criar(usuarioId, dados) {
      const [resultado] = await banco.execute(
        'INSERT INTO tarefas (usuario_id, titulo, observacao, data_prevista, horario, horario_final, prioridade) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [usuarioId, dados.titulo, dados.observacao, dados.data_prevista, dados.horario, dados.horario_final ?? null, dados.prioridade],
      );
      return this.buscar(usuarioId, resultado.insertId);
    },
    async criarRepetidas(usuarioId, dados, datas) {
      const conexao = banco.getConnection ? await banco.getConnection() : banco;
      const propria = conexao !== banco;
      const serieId = randomUUID();
      let primeira;
      try {
        if (propria) await conexao.beginTransaction();
        else await conexao.query('SAVEPOINT criar_serie');
        for (const data of datas) {
          const [resultado] = await conexao.execute(
            'INSERT INTO tarefas (usuario_id, titulo, observacao, data_prevista, horario, horario_final, prioridade) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [usuarioId, dados.titulo, dados.observacao, data, dados.horario, dados.horario_final ?? null, dados.prioridade],
          );
          primeira ??= resultado.insertId;
          await conexao.execute('INSERT INTO ocorrencias_series (tarefa_id, serie_id) VALUES (?, ?)', [resultado.insertId, serieId]);
        }
        const tarefa = await criarRepositorioTarefas(conexao).buscar(usuarioId, primeira);
        if (propria) await conexao.commit();
        else await conexao.query('RELEASE SAVEPOINT criar_serie');
        return { tarefa, quantidade: datas.length };
      } catch (erro) {
        if (propria) await conexao.rollback();
        else await conexao.query('ROLLBACK TO SAVEPOINT criar_serie');
        throw erro;
      } finally { if (propria) conexao.release(); }
    },
    async editarProximas(usuarioId, serieId, inicio, dados, hoje = inicio) {
      const [resultado] = await banco.execute(
        "UPDATE tarefas JOIN ocorrencias_series ON tarefa_id = tarefas.id SET titulo = ?, observacao = ?, horario = ?, horario_final = ?, prioridade = ? WHERE usuario_id = ? AND serie_id = ? AND data_prevista >= ? AND (situacao = 'pendente' OR (situacao = 'pulada' AND data_prevista > ?))",
        [dados.titulo, dados.observacao, dados.horario, dados.horario_final ?? null, dados.prioridade, usuarioId, serieId, inicio, hoje],
      );
      return resultado.affectedRows;
    },
    async encerrarProximas(usuarioId, serieId, inicio, hoje = inicio) {
      const [resultado] = await banco.execute(
        "DELETE tarefas FROM tarefas JOIN ocorrencias_series ON tarefa_id = tarefas.id WHERE usuario_id = ? AND serie_id = ? AND data_prevista >= ? AND (situacao = 'pendente' OR (situacao = 'pulada' AND data_prevista > ?))",
        [usuarioId, serieId, inicio, hoje],
      );
      return resultado.affectedRows;
    },
    async editar(usuarioId, id, dados) {
      await banco.execute('UPDATE tarefas SET titulo = ?, observacao = ?, horario = ?, horario_final = ?, prioridade = ?, ordem = IF(? IS NULL OR data_prevista <=> ?, ordem, 0), data_prevista = COALESCE(?, data_prevista) WHERE usuario_id = ? AND id = ?',
        [dados.titulo, dados.observacao, dados.horario, dados.horario_final ?? null, dados.prioridade, dados.data_prevista, dados.data_prevista, dados.data_prevista, usuarioId, id]);
      return this.buscar(usuarioId, id);
    },
    async excluir(usuarioId, id) {
      const [resultado] = await banco.execute('DELETE FROM tarefas WHERE usuario_id = ? AND id = ?', [usuarioId, id]);
      return resultado.affectedRows > 0;
    },
    async definirConclusao(usuarioId, id, concluida) {
      await banco.execute(
        "UPDATE tarefas SET situacao = ?, concluida_em = IF(?, CURRENT_TIMESTAMP, NULL) WHERE usuario_id = ? AND id = ?",
        [concluida ? 'concluida' : 'pendente', concluida, usuarioId, id],
      );
      return this.buscar(usuarioId, id);
    },
  };
}
