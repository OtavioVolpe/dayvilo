import { Router } from 'express';
import { criarControladorTarefas } from '../controladores/tarefas.js';

export function criarRotasTarefas(banco) {
  const rotas = Router();
  const controlador = criarControladorTarefas(banco);
  rotas.get('/perfil', controlador.perfil);
  rotas.get('/tarefas/atrasadas', controlador.atrasadas);
  rotas.patch('/tarefas/:id/situacao', controlador.situacao);
  rotas.patch('/tarefas/:id/agendamento', controlador.reagendar);
  rotas.get('/tarefas/historico', controlador.historico);
  rotas.get('/tarefas/semana', controlador.semana);
  rotas.get('/tarefas', controlador.listar);
  rotas.patch('/tarefas/ordem', controlador.ordenar);
  rotas.post('/tarefas/repetidas', controlador.repetir);
  rotas.post('/tarefas', controlador.criar);
  rotas.put('/tarefas/:id/serie', controlador.editarSerie);
  rotas.patch('/tarefas/:id/serie/encerramento', controlador.encerrarSerie);
  rotas.put('/tarefas/:id', controlador.editar);
  rotas.delete('/tarefas/:id', controlador.excluir);
  rotas.patch('/tarefas/:id/conclusao', controlador.concluir);
  return rotas;
}
