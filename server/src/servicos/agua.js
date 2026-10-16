import { transacionar, ErroConta } from './autenticacao.js';
import { validarObjeto, validarData, validarId, ErroValidacao } from '../validacoes/tarefas.js';

function quantidade(ml) {
  if (!Number.isInteger(ml) || ml < 1 || ml > 10000) throw new ErroValidacao('Informe uma quantidade inteira entre 1 e 10.000 ml.');
  return ml;
}
export function criarServicoAgua(banco) {
  async function consultar(c, u, data) {
    const [[meta]] = await c.execute('SELECT ml FROM agua_metas WHERE usuario_id = ? AND desde <= ? ORDER BY desde DESC LIMIT 1', [u.id, data]);
    const [[total]] = await c.execute('SELECT COALESCE(SUM(ml), 0) AS ml FROM agua_registros WHERE usuario_id = ? AND dia = ?', [u.id, data]);
    const [[ultimo]] = await c.execute('SELECT id, ml FROM agua_registros WHERE usuario_id = ? AND dia = ? ORDER BY id DESC LIMIT 1', [u.id, data]);
    return { data, meta: meta?.ml ?? null, total: Number(total.ml), ultimo: ultimo ?? null };
  }
  async function alterar(u, data, fn) {
    return transacionar(banco, async c => {
      await c.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [u.id]);
      await fn(c);
      return consultar(c, u, data);
    });
  }
  return {
    async consultar(u, q) {
      validarObjeto(q, ['data']); const data = validarData(q.data);
      return transacionar(banco, c => consultar(c, u, data));
    },
    async registrar(u, d) {
      validarObjeto(d, ['data', 'ml', 'chave']); const data = validarData(d.data), ml = quantidade(d.ml);
      if (typeof d.chave !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(d.chave)) throw new ErroValidacao('Identificador de registro inválido.');
      return alterar(u, data, async c => {
        const [[existente]] = await c.execute('SELECT dia, ml FROM agua_registros WHERE usuario_id = ? AND chave = ?', [u.id, d.chave]);
        if (existente) {
          if (existente.dia !== data || existente.ml !== ml) throw new ErroConta(409, 'Esse registro já foi usado. Atualize o card.');
          return;
        }
        await c.execute('INSERT INTO agua_registros (usuario_id, dia, ml, chave) VALUES (?, ?, ?, ?)', [u.id, data, ml, d.chave]);
      });
    },
    async meta(u, d) {
      validarObjeto(d, ['data', 'ml']); const data = validarData(d.data), ml = d.ml === null ? null : quantidade(d.ml);
      return alterar(u, data, c => c.execute('INSERT INTO agua_metas (usuario_id, desde, ml) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE ml = ?', [u.id, data, ml, ml]));
    },
    async desfazer(u, d) {
      validarObjeto(d, ['data', 'id']); const data = validarData(d.data), id = validarId(d.id);
      return alterar(u, data, async c => {
        const [[ultimo]] = await c.execute('SELECT id FROM agua_registros WHERE usuario_id = ? AND dia = ? ORDER BY id DESC LIMIT 1', [u.id, data]);
        if (ultimo?.id !== id) throw new ErroConta(409, 'O último registro mudou. Atualize o card antes de desfazer.');
        await c.execute('DELETE FROM agua_registros WHERE usuario_id = ? AND id = ?', [u.id, id]);
      });
    },
  };
}
