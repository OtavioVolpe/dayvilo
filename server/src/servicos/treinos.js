import { ErroConta, transacionar } from './autenticacao.js';
import { encontrarReferencias } from './referencia-treino.js';
import { createHash } from 'node:crypto';
import { adaptarRegistro } from './atualizar-treino.js';
import { cardio, registroPreenchido, registroVazio } from './registro-treino.js';
import { validarObjeto, validarData, validarId, obterDataHoje, ErroValidacao } from '../validacoes/tarefas.js';
const json = valor => typeof valor === 'string' ? JSON.parse(valor) : valor;
const temRegistro = realizado => json(realizado).some(registroPreenchido);
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
  validarObjeto(dados, ['nome', 'exercicios', 'versao', 'atualizar_proximos', 'aplicar_hoje', 'confirmacao']);
  for (const campo of ['atualizar_proximos', 'aplicar_hoje']) if (dados[campo] !== undefined && typeof dados[campo] !== 'boolean') throw new ErroValidacao('Escolha quais agendamentos atualizar.');
  if (dados.confirmacao !== undefined && (typeof dados.confirmacao !== 'string' || !/^[a-f0-9]{64}$/.test(dados.confirmacao))) throw new ErroValidacao('Confirmação inválida.');
  const nome = texto(dados.nome, 120, true);
  if (!Array.isArray(dados.exercicios) || !dados.exercicios.length || dados.exercicios.length > 30) throw new ErroValidacao('Inclua de 1 a 30 exercícios.');
  const exercicios = dados.exercicios.map(e => {
    validarObjeto(e, ['tipo', 'nome', 'series', 'repeticoes', 'carga', 'descanso', 'observacao', 'modalidade', 'duracao', 'distancia']);
    if (e.tipo !== undefined && !['musculacao', 'cardio'].includes(e.tipo)) throw new ErroValidacao('Tipo de exercício inválido.');
    if (cardio(e)) {
      validarObjeto(e, ['tipo', 'nome', 'modalidade', 'duracao', 'distancia', 'observacao']);
      // Aceita a modalidade de fichas antigas, sem exigir esse campo no editor atual.
      if (e.modalidade !== undefined && !['bicicleta', 'esteira', 'escada', 'corrida', 'caminhada', 'outro'].includes(e.modalidade)) throw new ErroValidacao('Modalidade de cardio inválida.');
      const duracao = numero(e.duracao, 1440, false);
      if (!duracao) throw new ErroValidacao('Informe a duração planejada do cardio.');
      return { tipo: 'cardio', nome: texto(e.nome, 120, true), ...(e.modalidade !== undefined ? { modalidade: e.modalidade } : {}), duracao, distancia: numero(e.distancia, 2000, false, true), observacao: texto(e.observacao, 500) };
    }
    validarObjeto(e, ['tipo', 'nome', 'series', 'repeticoes', 'carga', 'descanso', 'observacao']);
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
        let atualizados = 0;
        if (id) {
          const anterior = await ficha(c, usuario, id, true);
          if (dados.versao !== anterior.versao) throw new ErroConta(409, 'A ficha mudou. Reabra antes de salvar.');
          const hoje = obterDataHoje(usuario.fuso_horario);
          const [candidatos] = await c.execute("SELECT s.id, s.tarefa_id, s.versao, s.planejado, s.realizado, t.data_prevista FROM sessoes_treino s JOIN tarefas t ON t.id = s.tarefa_id WHERE s.ficha_id = ? AND t.usuario_id = ? AND t.data_prevista >= ? AND t.situacao = 'pendente' ORDER BY s.id FOR UPDATE", [anterior.id, usuario.id, hoje]);
          const alteracoes = candidatos.filter(s => s.data_prevista === hoje ? dados.aplicar_hoje : dados.atualizar_proximos && !temRegistro(s.realizado)).map(s => ({ ...s, ...adaptarRegistro(json(s.planejado), json(s.realizado), validada.exercicios) }));
          const perdas = [...new Set(alteracoes.flatMap(s => s.perdas))];
          const token = createHash('sha256').update(JSON.stringify([usuario.id, anterior.id, anterior.versao, validada, alteracoes])).digest('hex');
          if (perdas.length && dados.confirmacao !== token) return { confirmacao: { token, mensagem: `A alteração de hoje removerá registros de exercícios ou séries de: ${perdas.join(', ')}. Os registros dos exercícios mantidos serão preservados. Deseja descartar esses registros e salvar?` } };
          for (const s of alteracoes) {
            await c.execute('UPDATE sessoes_treino SET planejado = ?, realizado = ?, versao = versao + 1 WHERE id = ?', [JSON.stringify(validada), JSON.stringify(s.registros), s.id]);
            await c.execute('UPDATE tarefas SET titulo = ? WHERE id = ? AND usuario_id = ?', ['Treino — ' + validada.nome, s.tarefa_id, usuario.id]);
          }
          atualizados = alteracoes.length;
          await c.execute('UPDATE fichas_treino SET nome = ?, exercicios = ?, versao = versao + 1 WHERE id = ?', [validada.nome, JSON.stringify(validada.exercicios), anterior.id]);
        } else {
          const [r] = await c.execute('INSERT INTO fichas_treino (usuario_id, nome, exercicios) VALUES (?, ?, ?)', [usuario.id, validada.nome, JSON.stringify(validada.exercicios)]); id = r.insertId;
        }
        return { ficha: await ficha(c, usuario, id), atualizados };
      });
    },
    async excluirFicha(usuario, id) {
      return transacionar(banco, async c => {
        const f = await ficha(c, usuario, id, true);
        const hoje = obterDataHoje(usuario.fuso_horario);
        const [sessoes] = await c.execute('SELECT s.tarefa_id, s.realizado, t.situacao FROM sessoes_treino s JOIN tarefas t ON t.id = s.tarefa_id WHERE s.ficha_id = ? AND t.usuario_id = ? AND t.data_prevista >= ? FOR UPDATE', [f.id, usuario.id, hoje]);
        let quantidade = 0;
        for (const s of sessoes) {
          if (s.situacao === 'concluida' || temRegistro(s.realizado)) continue;
          await c.execute('DELETE FROM tarefas WHERE id = ? AND usuario_id = ?', [s.tarefa_id, usuario.id]);
          quantidade++;
        }
        // A referência permanece somente para permitir consultar os registros preservados.
        await c.execute('UPDATE fichas_treino SET arquivada = TRUE WHERE id = ? AND usuario_id = ?', [f.id, usuario.id]);
        return { quantidade, mensagem: `Ficha excluída. ${quantidade} treino(s) desagendado(s). Histórico e registros mantidos.` };
      });
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
          const realizado = f.exercicios.map(registroVazio);
          await c.execute('INSERT INTO sessoes_treino (tarefa_id, ficha_id, planejado, realizado) VALUES (?, ?, ?, ?)', [t.insertId, f.id, JSON.stringify({ nome: f.nome, exercicios: f.exercicios }), JSON.stringify(realizado)]);
          quantidade++;
        }
        return { quantidade };
      });
    },
    async desagendar(usuario, dados) {
      validarObjeto(dados, ['ficha_id', 'inicio', 'fim', 'dias']);
      const inicio = validarData(dados.inicio), fim = validarData(dados.fim);
      if (fim < inicio || (new Date(fim) - new Date(inicio)) / 86400000 > 365) throw new ErroValidacao('Escolha um período de até 366 dias.');
      if (!Array.isArray(dados.dias) || !dados.dias.length || dados.dias.length > 7 || dados.dias.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new ErroValidacao('Escolha os dias da semana.');
      return transacionar(banco, async c => {
        const f = await ficha(c, usuario, dados.ficha_id, true);
        const [sessoes] = await c.execute('SELECT s.tarefa_id, s.realizado, t.data_prevista, t.situacao FROM sessoes_treino s JOIN tarefas t ON t.id = s.tarefa_id WHERE s.ficha_id = ? AND t.usuario_id = ? AND t.data_prevista BETWEEN ? AND ? FOR UPDATE', [f.id, usuario.id, inicio, fim]);
        const hoje = obterDataHoje(usuario.fuso_horario);
        let quantidade = 0, preservados = 0;
        for (const s of sessoes) {
          if (!dados.dias.includes(new Date(s.data_prevista + 'T12:00:00Z').getUTCDay())) continue;
          if (s.data_prevista < hoje || s.situacao === 'concluida' || temRegistro(s.realizado)) { preservados++; continue; }
          await c.execute('DELETE FROM tarefas WHERE id = ? AND usuario_id = ?', [s.tarefa_id, usuario.id]);
          quantidade++;
        }
        return { quantidade, preservados };
      });
    },
    async consultar(usuario, id) {
      const atual = await sessao(banco, usuario, id);
      const [anteriores] = await banco.execute("SELECT s.planejado, s.realizado, t.data_prevista FROM sessoes_treino s JOIN tarefas t ON t.id = s.tarefa_id WHERE s.ficha_id = ? AND t.usuario_id = ? AND t.data_prevista < ? AND t.data_prevista <= ? AND t.situacao <> 'pulada' ORDER BY t.data_prevista DESC, s.id DESC", [atual.ficha_id, usuario.id, atual.data_prevista, obterDataHoje(usuario.fuso_horario)]);
      return { sessao: { ...atual, referencias: encontrarReferencias(atual.planejado, anteriores) } };
    },
    async registrar(usuario, id, dados) {
      validarObjeto(dados, ['versao', 'realizado', 'concluir']);
      if (typeof dados.concluir !== 'boolean') throw new ErroValidacao('Informe a ação do treino.');
      return transacionar(banco, async c => {
        const s = await sessao(c, usuario, id, true);
        if (s.versao !== dados.versao) throw new ErroConta(409, 'O registro mudou. Reabra o treino antes de salvar.');
        if (s.situacao !== 'pendente') throw new ErroConta(409, 'Restaure o treino na Rotina antes de editar.');
        if (!Array.isArray(dados.realizado) || dados.realizado.length !== s.planejado.exercicios.length) throw new ErroValidacao('Exercícios incompatíveis com este treino.');
        const realizado = dados.realizado.map((e, i) => {
          if (cardio(s.planejado.exercicios[i])) {
            validarObjeto(e, ['duracao', 'distancia', 'feita', 'observacao']);
            if (typeof e.feita !== 'boolean') throw new ErroValidacao('Indique se o cardio foi realizado.');
            return { duracao: numero(e.duracao, 1440, false, true), distancia: numero(e.distancia, 2000, false, true), feita: e.feita, observacao: texto(e.observacao, 500) };
          }
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
