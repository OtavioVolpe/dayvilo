import { Router } from 'express';
import { criarServicoMetaSemanal } from '../servicos/meta-semanal.js';
import { obterDataHoje } from '../validacoes/tarefas.js';

export function criarRotasMetaSemanal(banco) {
  const rotas = Router(), servico = criarServicoMetaSemanal(banco);
  const hoje = req => obterDataHoje(req.usuario.fuso_horario);
  rotas.get('/', async (req, res) => res.json(await servico.consultar(req.usuario.id, hoje(req))));
  rotas.use((req, res, next) => {
    if (req.method !== 'DELETE' && !req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    next();
  });
  rotas.put('/', async (req, res) => {
    await servico.salvar(req.usuario.id, req.body);
    res.json(await servico.consultar(req.usuario.id, hoje(req)));
  });
  rotas.patch('/dias', async (req, res) => {
    const dia = hoje(req);
    await servico.marcar(req.usuario.id, dia, req.body);
    res.json(await servico.consultar(req.usuario.id, dia));
  });
  rotas.delete('/', async (req, res) => { await servico.remover(req.usuario.id); res.json({ meta: null }); });
  return rotas;
}
