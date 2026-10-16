import { Router } from 'express';
import { criarServicoAlimentacao } from '../servicos/alimentacao.js';
import { criarServicoAgua } from '../servicos/agua.js';

export function criarRotasAlimentacao(banco) {
  const r = Router(), s = criarServicoAlimentacao(banco);
  const agua = criarServicoAgua(banco);
  r.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    next();
  });
  r.get('/agua', async (req, res) => res.json(await agua.consultar(req.usuario, req.query)));
  r.post('/agua', async (req, res) => res.status(201).json(await agua.registrar(req.usuario, req.body)));
  r.put('/agua/meta', async (req, res) => res.json(await agua.meta(req.usuario, req.body)));
  r.delete('/agua/ultimo', async (req, res) => res.json(await agua.desfazer(req.usuario, req.body)));
  r.get('/', async (req, res) => res.json(await s.listar(req.usuario, req.query)));
  r.post('/', async (req, res) => res.status(201).json(await s.salvar(req.usuario, req.body)));
  r.post('/copiar', async (req, res) => res.json(await s.copiar(req.usuario, req.body)));
  r.put('/:id', async (req, res) => res.json(await s.salvar(req.usuario, req.body, req.params.id)));
  r.patch('/:id/situacao', async (req, res) => res.json(await s.situacao(req.usuario, req.params.id, req.body)));
  r.patch('/:id/nota', async (req, res) => res.json(await s.anotar(req.usuario, req.params.id, req.body)));
  r.delete('/:id', async (req, res) => res.json(await s.excluir(req.usuario, req.params.id, req.body)));
  return r;
}
