const colunas = 'id, titulo, observacao, data_prevista, horario, prioridade, situacao, ordem';

function apresentarTarefa(tarefa) {
  return { ...tarefa, prioridade: Boolean(tarefa.prioridade), horario: tarefa.horario?.slice(0, 5) ?? null };
}

export function criarRepositorioTarefas(banco) {
  return {
    async listar(usuarioId, data) {
      const [tarefas] = await banco.execute(
        `SELECT ${colunas} FROM tarefas WHERE usuario_id = ? AND data_prevista <=> ? ORDER BY ordem, id`,
        [usuarioId, data],
      );
      return tarefas.map(apresentarTarefa);
    },
    async listarPeriodo(usuarioId, inicio, fim) {
      const [tarefas] = await banco.execute(
        'SELECT ' + colunas + ' FROM tarefas WHERE usuario_id = ? AND data_prevista BETWEEN ? AND ? ORDER BY data_prevista, horario IS NULL, horario, ordem, id',
        [usuarioId, inicio, fim],
      );
      return tarefas.map(apresentarTarefa);
    },
    async buscar(usuarioId, id) {
      const [[tarefa]] = await banco.execute(`SELECT ${colunas} FROM tarefas WHERE usuario_id = ? AND id = ?`, [usuarioId, id]);
      return tarefa ? apresentarTarefa(tarefa) : null;
    },
    async criar(usuarioId, dados) {
      const [resultado] = await banco.execute(
        'INSERT INTO tarefas (usuario_id, titulo, observacao, data_prevista, horario, prioridade) VALUES (?, ?, ?, ?, ?, ?)',
        [usuarioId, dados.titulo, dados.observacao, dados.data_prevista, dados.horario, dados.prioridade],
      );
      return this.buscar(usuarioId, resultado.insertId);
    },
    async criarRepetidas(usuarioId, dados, datas) {
      // Um único INSERT no InnoDB salva todas as ocorrências ou nenhuma.
      const valores = datas.flatMap(data => [usuarioId, dados.titulo, dados.observacao, data, dados.horario, dados.prioridade]);
      const marcadores = datas.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const [resultado] = await banco.execute(
        'INSERT INTO tarefas (usuario_id, titulo, observacao, data_prevista, horario, prioridade) VALUES ' + marcadores, valores,
      );
      return { tarefa: await this.buscar(usuarioId, resultado.insertId), quantidade: datas.length };
    },
    async editar(usuarioId, id, dados) {
      await banco.execute('UPDATE tarefas SET titulo = ?, observacao = ?, horario = ?, prioridade = ?, data_prevista = COALESCE(?, data_prevista) WHERE usuario_id = ? AND id = ?',
        [dados.titulo, dados.observacao, dados.horario, dados.prioridade, dados.data_prevista, usuarioId, id]);
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
