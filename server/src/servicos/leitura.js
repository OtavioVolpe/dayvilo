import { ErroConta, transacionar } from './autenticacao.js';
import { validarObjeto, validarData, validarId, validarNovaTarefa, obterDataHoje, ErroValidacao } from '../validacoes/tarefas.js';

function texto(v, max, nome, obrigatorio = false) {
  if (typeof v !== 'string' || [...v.trim()].length > max || (obrigatorio && !v.trim())) throw new ErroValidacao(`Informe ${nome} com até ${max} caracteres.`);
  return v.trim();
}
function pagina(v, minimo = 0) {
  if (v === null || v === undefined) return null;
  if (!Number.isInteger(v) || v < minimo || v > 1000000) throw new ErroValidacao('Informe uma quantidade de páginas válida.');
  return v;
}
export function validarLivro(d, hoje, anterior) {
  validarObjeto(d, ['titulo', 'autor', 'estado', 'total_paginas', 'pagina_atual', 'inicio', 'termino', 'versao', 'encerrar_agendamentos']);
  if (!['quero_ler', 'lendo', 'lido'].includes(d.estado)) throw new ErroValidacao('Escolha a situação do livro.');
  if (d.encerrar_agendamentos !== undefined && typeof d.encerrar_agendamentos !== 'boolean') throw new ErroValidacao('Escolha se deseja encerrar os agendamentos.');
  const total = pagina(d.total_paginas, 1), atual = pagina(d.pagina_atual);
  if (total !== null && atual !== null && atual > total) throw new ErroValidacao('A página atual não pode ultrapassar o total.');
  let inicio = d.inicio ? validarData(d.inicio) : null, termino = d.termino ? validarData(d.termino) : null;
  if (!inicio && d.estado === 'lendo' && anterior?.estado !== 'lendo') inicio = hoje;
  if (!termino && d.estado === 'lido' && anterior?.estado !== 'lido') termino = hoje;
  if (d.estado !== 'lido') termino = null;
  if ((inicio && inicio > hoje) || (termino && termino > hoje) || (inicio && termino && inicio > termino)) throw new ErroValidacao('Revise as datas de leitura: use datas passadas ou de hoje, com término após o início.');
  return [texto(d.titulo, 180, 'um título', true), texto(d.autor ?? '', 160, 'o autor'), d.estado, total, atual, inicio, termino];
}
export function validarAgenda(d, hoje) {
  validarObjeto(d, ['inicio', 'fim', 'dias', 'horario', 'versao']);
  const inicio = validarData(d.inicio), fim = validarData(d.fim);
  if (inicio < hoje || fim < inicio || (new Date(fim) - new Date(inicio)) / 86400000 > 365) throw new ErroValidacao('Escolha um período a partir de hoje, com até 366 dias.');
  if (!Array.isArray(d.dias) || !d.dias.length || d.dias.length > 7 || d.dias.some(v => !Number.isInteger(v) || v < 0 || v > 6) || new Set(d.dias).size !== d.dias.length) throw new ErroValidacao('Selecione os dias da semana.');
  const { horario } = validarNovaTarefa({ titulo: 'Leitura', horario: d.horario });
  const datas = [];
  for (let data = new Date(inicio + 'T12:00:00Z'); data.toISOString().slice(0, 10) <= fim; data.setUTCDate(data.getUTCDate() + 1)) {
    if (d.dias.includes(data.getUTCDay())) datas.push(data.toISOString().slice(0, 10));
  }
  if (!datas.length) throw new ErroValidacao('Nenhum dos dias selecionados ocorre nesse período.');
  return { datas, horario };
}
export function criarServicoLeitura(banco) {
  async function obter(c, u, id, lock = false) {
    const [[l]] = await c.execute('SELECT * FROM livros WHERE usuario_id = ? AND id = ?' + (lock ? ' FOR UPDATE' : ''), [u.id, validarId(id)]);
    if (!l) throw new ErroConta(404, 'Livro não encontrado.');
    return l;
  }
  function revisar(d, l) {
    if (d.versao !== l.versao) throw new ErroConta(409, 'O livro mudou. Atualize a estante e abra novamente.');
  }
  async function removerFuturas(c, u, id) {
    const [r] = await c.execute("DELETE t FROM tarefas t JOIN leituras_agendadas a ON a.tarefa_id = t.id WHERE t.usuario_id = ? AND a.livro_id = ? AND t.data_prevista >= ? AND t.situacao = 'pendente'", [u.id, id, obterDataHoje(u.fuso_horario)]);
    return r.affectedRows;
  }
  async function mudar(u, id, d, fn) {
    return transacionar(banco, async c => {
      const l = await obter(c, u, id, true); revisar(d, l);
      const resultado = await fn(c, l);
      await c.execute('UPDATE livros SET versao = versao + 1 WHERE id = ? AND usuario_id = ?', [l.id, u.id]);
      return resultado ?? { salvo: true };
    });
  }
  return {
    async listar(u) {
      const [livros] = await banco.execute('SELECT * FROM livros WHERE usuario_id = ? ORDER BY titulo, id', [u.id]);
      return { livros, hoje: obterDataHoje(u.fuso_horario) };
    },
    async detalhes(u, id) {
      // Uma transação mantém livro e notas na mesma revisão.
      return transacionar(banco, async c => {
        const livro = await obter(c, u, id, true);
        const [notas] = await c.execute('SELECT id, texto, pagina, criado_em FROM notas_leitura WHERE livro_id = ? ORDER BY id DESC', [livro.id]);
        const [agendamentos] = await c.execute('SELECT t.id, t.data_prevista, t.horario, t.situacao FROM tarefas t JOIN leituras_agendadas a ON a.tarefa_id = t.id WHERE t.usuario_id = ? AND a.livro_id = ? AND t.data_prevista >= ? ORDER BY t.data_prevista, t.id LIMIT 366', [u.id, livro.id, obterDataHoje(u.fuso_horario)]);
        return { livro, notas, agendamentos };
      });
    },
    async salvar(u, d, id) {
      validarObjeto(d, ['titulo', 'autor', 'estado', 'total_paginas', 'pagina_atual', 'inicio', 'termino', 'versao', 'encerrar_agendamentos']);
      const hoje = obterDataHoje(u.fuso_horario);
      if (id !== undefined) return mudar(u, id, d, async (c, l) => {
        const v = validarLivro(d, hoje, l);
        await c.execute('UPDATE livros SET titulo = ?, autor = ?, estado = ?, total_paginas = ?, pagina_atual = ?, inicio = ?, termino = ? WHERE id = ? AND usuario_id = ?', [...v, l.id, u.id]);
        if (d.estado === 'lido' && d.encerrar_agendamentos) await removerFuturas(c, u, l.id);
        return { id: l.id };
      });
      const v = validarLivro(d, hoje);
      const [r] = await banco.execute('INSERT INTO livros (titulo, autor, estado, total_paginas, pagina_atual, inicio, termino, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [...v, u.id]);
      return { id: r.insertId };
    },
    async agendar(u, id, d, remover = false) {
      if (remover && d?.tarefas !== undefined) {
        validarObjeto(d, ['versao', 'tarefas']);
        if (!Array.isArray(d.tarefas) || !d.tarefas.length || d.tarefas.length > 366) throw new ErroValidacao('Selecione de 1 a 366 leituras.');
        const ids = d.tarefas.map(validarId).sort((a, b) => a - b);
        if (new Set(ids).size !== ids.length) throw new ErroValidacao('Não repita leituras na seleção.');
        return mudar(u, id, d, async (c, l) => {
          let quantidade = 0;
          for (const tarefa of ids) {
            const [[atual]] = await c.execute('SELECT t.id, t.data_prevista, t.situacao FROM tarefas t JOIN leituras_agendadas a ON a.tarefa_id = t.id WHERE t.id = ? AND t.usuario_id = ? AND a.livro_id = ? FOR UPDATE', [tarefa, u.id, l.id]);
            if (!atual) throw new ErroConta(409, 'Os agendamentos mudaram. Atualize os dados e selecione novamente.');
            if (atual.data_prevista < obterDataHoje(u.fuso_horario) || atual.situacao !== 'pendente') continue;
            await c.execute('DELETE FROM tarefas WHERE id = ? AND usuario_id = ?', [atual.id, u.id]);
            quantidade++;
          }
          return { quantidade, preservados: ids.length - quantidade };
        });
      }
      const v = validarAgenda(d, obterDataHoje(u.fuso_horario));
      return mudar(u, id, d, async (c, l) => {
        if (!remover && l.estado !== 'lendo') throw new ErroValidacao('Passe o livro para Lendo antes de agendar.');
        let quantidade = 0;
        for (const data of v.datas) {
          if (remover) {
            const [r] = await c.execute("DELETE t FROM tarefas t JOIN leituras_agendadas a ON a.tarefa_id = t.id WHERE t.usuario_id = ? AND a.livro_id = ? AND t.data_prevista = ? AND t.situacao = 'pendente'", [u.id, l.id, data]);
            quantidade += r.affectedRows;
          } else {
            const [[existe]] = await c.execute('SELECT t.id FROM tarefas t JOIN leituras_agendadas a ON a.tarefa_id = t.id WHERE t.usuario_id = ? AND a.livro_id = ? AND t.data_prevista = ? LIMIT 1', [u.id, l.id, data]);
            if (existe) continue;
            const [t] = await c.execute('INSERT INTO tarefas (usuario_id, titulo, data_prevista, horario) VALUES (?, ?, ?, ?)', [u.id, `Ler - ${l.titulo}`, data, v.horario]);
            await c.execute('INSERT INTO leituras_agendadas (tarefa_id, livro_id) VALUES (?, ?)', [t.insertId, l.id]); quantidade++;
          }
        }
        return { quantidade };
      });
    },
    async anotar(u, id, d) {
      validarObjeto(d, ['versao', 'texto', 'pagina', 'nota_id', 'excluir']);
      if (d.excluir !== undefined && typeof d.excluir !== 'boolean') throw new ErroValidacao('Ação inválida.');
      const textoNota = d.excluir ? '' : texto(d.texto, 4000, 'a anotação', true), p = pagina(d.pagina, 1);
      if (d.excluir && !d.nota_id) throw new ErroValidacao('Escolha a anotação.');
      return mudar(u, id, d, async (c, l) => {
        if (d.nota_id) {
          const nota = validarId(d.nota_id);
          const [[existe]] = await c.execute('SELECT id FROM notas_leitura WHERE id = ? AND livro_id = ?', [nota, l.id]);
          if (!existe) throw new ErroConta(404, 'Anotação não encontrada.');
          if (d.excluir) await c.execute('DELETE FROM notas_leitura WHERE id = ? AND livro_id = ?', [nota, l.id]);
          else await c.execute('UPDATE notas_leitura SET texto = ?, pagina = ? WHERE id = ? AND livro_id = ?', [textoNota, p, nota, l.id]);
        } else await c.execute('INSERT INTO notas_leitura (livro_id, texto, pagina) VALUES (?, ?, ?)', [l.id, textoNota, p]);
      });
    },
    async excluir(u, id, d) {
      validarObjeto(d, ['versao']);
      return mudar(u, id, d, async (c, l) => {
        await removerFuturas(c, u, l.id);
        await c.execute('DELETE FROM livros WHERE id = ? AND usuario_id = ?', [l.id, u.id]);
        return { excluido: true };
      });
    },
  };
}
