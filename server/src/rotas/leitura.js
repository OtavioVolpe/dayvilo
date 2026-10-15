import { Router } from 'express';
import { criarServicoLeitura } from '../servicos/leitura.js';

export function criarRotasLeitura(banco) {
  const r = Router(), s = criarServicoLeitura(banco);
  r.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    next();
  });
  r.get('/', async (req, res) => res.json(await s.listar(req.usuario)));
  r.get('/:id', async (req, res) => res.json(await s.detalhes(req.usuario, req.params.id)));
  r.post('/', async (req, res) => res.status(201).json(await s.salvar(req.usuario, req.body)));
  r.put('/:id', async (req, res) => res.json(await s.salvar(req.usuario, req.body, req.params.id)));
  r.post('/:id/agendar', async (req, res) => res.json(await s.agendar(req.usuario, req.params.id, req.body)));
  r.post('/:id/desagendar', async (req, res) => res.json(await s.agendar(req.usuario, req.params.id, req.body, true)));
  r.post('/:id/notas', async (req, res) => res.json(await s.anotar(req.usuario, req.params.id, req.body)));
  r.delete('/:id', async (req, res) => res.json(await s.excluir(req.usuario, req.params.id, req.body)));
  return r;
}
