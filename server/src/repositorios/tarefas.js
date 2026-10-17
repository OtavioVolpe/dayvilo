import { randomUUID } from 'node:crypto';

const colunas = '(SELECT lancamento_id FROM financeiro_lembretes WHERE tarefa_id = tarefas.id) AS financeiro_id, (SELECT livro_id FROM leituras_agendadas WHERE tarefa_id = tarefas.id) AS livro_id, EXISTS(SELECT 1 FROM leituras_agendadas WHERE tarefa_id = tarefas.id) AS leitura, (SELECT id FROM refeicoes WHERE tarefa_id = tarefas.id) AS refeicao_id, (SELECT id FROM sessoes_treino WHERE tarefa_id = tarefas.id) AS treino_sessao_id, id, titulo, observacao, area, ambiente, data_prevista, horario, horario_final, prioridade, situacao, ordem, (SELECT serie_id FROM ocorrencias_series WHERE tarefa_id = tarefas.id) AS serie_id';
export const visivelNaRotina = 'NOT EXISTS (SELECT 1 FROM refeicoes WHERE tarefa_id = tarefas.id AND mostrar_rotina = FALSE)';

function apresentarTarefa(tarefa) {
  // Padroniza também agendamentos antigos, sem reescrever o histórico no banco.
  if (tarefa.leitura) tarefa = { ...tarefa, titulo: tarefa.titulo.replace(/^Ler — /, 'Ler - ') };
  return { ...tarefa, prioridade: Boolean(tarefa.prioridade), horario: tarefa.horario?.slice(0, 5) ?? null, horario_final: tarefa.horario_final?.slice(0, 5) ?? null };
}

export function criarRepositorioTarefas(banco) {
  return {
    async definirObservacao(usuarioId, id, observacao) {
      await banco.execute('UPDATE tarefas SET observacao = ? WHERE usuario_id = ? AND id = ?', [observacao, usuarioId, id]);
      return this.buscar(usuarioId, id);
    },
    async listar(usuarioId, data) {
      const [tarefas] = await banco.execute(
        `SELECT ${colunas} FROM tarefas WHERE ${visivelNaRotina} AND usuario_id = ? AND data_prevista <=> ? ORDER BY ordem = 0, ordem, id`,
        [usuarioId, data],
      );
      return tarefas.map(apresentarTarefa);
    },
    async listarAtrasadas(usuarioId, hoje) {
      const [tarefas] = await banco.execute(
        'SELECT ' + colunas + ` FROM tarefas WHERE ${visivelNaRotina} AND usuario_id = ? AND situacao = 'pendente' AND data_prevista < ? ORDER BY data_prevista, horario IS NULL, horario, id`,
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
        'SELECT ' + colunas + ` FROM tarefas WHERE ${visivelNaRotina} AND usuario_id = ? AND data_prevista BETWEEN ? AND ? ORDER BY data_prevista, horario IS NULL, horario, ordem, id`,
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
        'INSERT INTO tarefas (usuario_id, titulo, observacao, data_prevista, horario, horario_final, prioridade, area, ambiente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [usuarioId, dados.titulo, dados.observacao, dados.data_prevista, dados.horario, dados.horario_final ?? null, dados.prioridade, dados.area ?? 'rotina', dados.ambiente ?? null],
      );
      return this.buscar(usuarioId, resultado.insertId);
    },
    async criarRepetidas(usuarioId, dados, datas, regra = null) {
      const conexao = banco.getConnection ? await banco.getConnection() : banco;
      const propria = conexao !== banco;
      const serieId = randomUUID();
      let primeira;
      try {
        if (propria) await conexao.beginTransaction();
        else await conexao.query('SAVEPOINT criar_serie');
        if (regra) await conexao.execute('INSERT INTO configuracoes_series (serie_id, usuario_id, tipo, dias, ate, inicio) VALUES (?, ?, ?, ?, ?, ?)', [serieId, usuarioId, regra.tipo, JSON.stringify(regra.dias ?? null), regra.ate, dados.data_prevista]);
        for (const data of datas) {
          const [resultado] = await conexao.execute(
            'INSERT INTO tarefas (usuario_id, titulo, observacao, data_prevista, horario, horario_final, prioridade, area, ambiente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [usuarioId, dados.titulo, dados.observacao, data, dados.horario, dados.horario_final ?? null, dados.prioridade, dados.area ?? 'rotina', dados.ambiente ?? null],
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
    async configuracaoSerie(usuarioId, serieId, bloquear = false) {
      // Séries antigas ainda não têm regra: nunca deduzir dias de tarefas já editadas/excluídas.
      if (bloquear) await banco.execute('INSERT IGNORE INTO configuracoes_series (serie_id, usuario_id, ate) SELECT ?, ?, MAX(data_prevista) FROM tarefas JOIN ocorrencias_series ON tarefa_id = tarefas.id WHERE usuario_id = ? AND serie_id = ? HAVING MAX(data_prevista) IS NOT NULL', [serieId, usuarioId, usuarioId, serieId]);
      const [[regra]] = await banco.execute('SELECT tipo, dias, ate, inicio FROM configuracoes_series WHERE usuario_id = ? AND serie_id = ?' + (bloquear ? ' FOR UPDATE' : ''), [usuarioId, serieId]);
      if (regra) return { ...regra, dias: typeof regra.dias === 'string' ? JSON.parse(regra.dias) : regra.dias };
      const [[limite]] = await banco.execute('SELECT MAX(data_prevista) AS ate FROM tarefas JOIN ocorrencias_series ON tarefa_id = tarefas.id WHERE usuario_id = ? AND serie_id = ?', [usuarioId, serieId]);
      return { tipo: null, dias: null, ate: limite.ate };
    },
    async ocorrenciasSerie(usuarioId, serieId, inicio, fim) {
      const [[limites]] = await banco.execute('SELECT MIN(t.data_prevista) AS inicio, MAX(t.data_prevista) AS fim FROM tarefas t JOIN ocorrencias_series o ON o.tarefa_id = t.id WHERE t.usuario_id = ? AND o.serie_id = ?', [usuarioId, serieId]);
      const [ocorrencias] = await banco.execute('SELECT t.id, t.titulo, t.data_prevista, t.horario, t.horario_final, t.situacao FROM tarefas t JOIN ocorrencias_series o ON o.tarefa_id = t.id WHERE t.usuario_id = ? AND o.serie_id = ? AND t.data_prevista BETWEEN ? AND ? ORDER BY t.data_prevista, t.horario, t.id', [usuarioId, serieId, inicio, fim]);
      return { limites, ocorrencias: ocorrencias.map(apresentarTarefa) };
    },
    async salvarConfiguracao(usuarioId, serieId, regra) {
      await banco.execute('UPDATE configuracoes_series SET tipo = ?, dias = ?, ate = ? WHERE usuario_id = ? AND serie_id = ?', [regra.tipo, JSON.stringify(regra.dias ?? null), regra.ate, usuarioId, serieId]);
    },
    async prolongar(usuarioId, serieId, dados, datas) {
      let criadas = 0;
      for (const data of datas) {
        const [[existente]] = await banco.execute('SELECT tarefas.id FROM tarefas JOIN ocorrencias_series ON tarefa_id = tarefas.id WHERE usuario_id = ? AND serie_id = ? AND data_prevista = ? LIMIT 1', [usuarioId, serieId, data]);
        if (existente) continue;
        const tarefa = await this.criar(usuarioId, { ...dados, data_prevista: data });
        await banco.execute('INSERT INTO ocorrencias_series (tarefa_id, serie_id) VALUES (?, ?)', [tarefa.id, serieId]);
        criadas++;
      }
      return criadas;
    },
    async editarProximas(usuarioId, serieId, inicio, dados, hoje = inicio) {
      const [resultado] = await banco.execute(
        "UPDATE tarefas JOIN ocorrencias_series ON tarefa_id = tarefas.id SET titulo = ?, observacao = ?, horario = ?, horario_final = ?, prioridade = ?, ambiente = ? WHERE usuario_id = ? AND serie_id = ? AND data_prevista >= ? AND (situacao = 'pendente' OR (situacao = 'pulada' AND data_prevista > ?))",
        [dados.titulo, dados.observacao, dados.horario, dados.horario_final ?? null, dados.prioridade, dados.ambiente ?? null, usuarioId, serieId, inicio, hoje],
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
      await banco.execute('UPDATE tarefas SET titulo = ?, observacao = ?, horario = ?, horario_final = ?, prioridade = ?, ambiente = ?, ordem = IF(? IS NULL OR data_prevista <=> ?, ordem, 0), data_prevista = COALESCE(?, data_prevista) WHERE usuario_id = ? AND id = ?',
        [dados.titulo, dados.observacao, dados.horario, dados.horario_final ?? null, dados.prioridade, dados.ambiente ?? null, dados.data_prevista, dados.data_prevista, dados.data_prevista, usuarioId, id]);
      return this.buscar(usuarioId, id);
    },
    async excluir(usuarioId, id) {
      await banco.execute('UPDATE financeiro_lancamentos l JOIN financeiro_lembretes f ON f.lancamento_id=l.id SET l.versao=l.versao+1 WHERE f.tarefa_id=? AND l.usuario_id=?', [id, usuarioId]);
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
