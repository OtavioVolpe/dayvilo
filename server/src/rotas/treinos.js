import { Router } from 'express';
import { criarServicoTreinos } from '../servicos/treinos.js';
export function criarRotasTreinos(banco) {
  const rotas = Router(), servico = criarServicoTreinos(banco);
  rotas.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    next();
  });
  rotas.get('/', async (req, res) => res.json(await servico.listar(req.usuario, req.query)));
  rotas.post('/fichas', async (req, res) => res.status(201).json(await servico.salvarFicha(req.usuario, req.body)));
  rotas.put('/fichas/:id', async (req, res) => res.json(await servico.salvarFicha(req.usuario, req.body, req.params.id)));
  rotas.delete('/fichas/:id', async (req, res) => res.json(await servico.excluirFicha(req.usuario, req.params.id)));
  rotas.post('/agenda', async (req, res) => res.json(await servico.agendar(req.usuario, req.body)));
  rotas.post('/agenda/desagendar', async (req, res) => res.json(await servico.desagendar(req.usuario, req.body)));
  rotas.get('/sessoes/:id', async (req, res) => res.json(await servico.consultar(req.usuario, req.params.id)));
  rotas.put('/sessoes/:id', async (req, res) => res.json(await servico.registrar(req.usuario, req.params.id, req.body)));
  return rotas;
}
