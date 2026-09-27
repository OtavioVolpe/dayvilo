import { randomUUID } from 'node:crypto';
import { criarSessao } from '../src/servicos/autenticacao.js';

export async function prepararSessaoTeste(banco, usuarioId) {
  const [conta] = await banco.execute('INSERT INTO contas (usuario_id, email, senha_hash) VALUES (?, ?, ?)', [usuarioId, `${randomUUID()}@example.test`, 'sem-login-fixture']);
  const sessao = await criarSessao(banco, conta.insertId);
  return { 'Content-Type': 'application/json', 'X-Dayvilo': '1', 'X-CSRF-Token': sessao.csrf, Cookie: `dayvilo_sessao=${sessao.token}` };
}
