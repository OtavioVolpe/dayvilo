import { Router } from 'express';
import { ErroValidacao, validarObjeto } from '../validacoes/tarefas.js';

export function validarAtalhos(dados) {
  validarObjeto(dados, ['areas']);
  if (!Array.isArray(dados.areas) || dados.areas.length > 2 || new Set(dados.areas).size !== dados.areas.length || dados.areas.some(a => !['Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura', 'Metas'].includes(a))) throw new ErroValidacao('Escolha até duas áreas diferentes para os atalhos.');
  return dados.areas;
}
export function criarRotasAtalhos(banco) {
  const rotas = Router();
  rotas.get('/', async (req, res) => {
    const [[registro]] = await banco.execute('SELECT areas FROM atalhos_usuario WHERE usuario_id = ?', [req.usuario.id]);
    res.json({ areas: registro ? (typeof registro.areas === 'string' ? JSON.parse(registro.areas) : registro.areas) : [] });
  });
  rotas.put('/', async (req, res) => {
    if (!req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    const areas = validarAtalhos(req.body);
    await banco.execute('INSERT INTO atalhos_usuario (usuario_id, areas) VALUES (?, ?) ON DUPLICATE KEY UPDATE areas = ?', [req.usuario.id, JSON.stringify(areas), JSON.stringify(areas)]);
    res.json({ areas });
  });
  return rotas;
}
