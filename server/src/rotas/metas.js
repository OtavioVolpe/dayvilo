import { Router } from 'express';
import { criarServicoMetas } from '../servicos/metas.js';
import { obterDataHoje } from '../validacoes/tarefas.js';

export function criarRotasMetas(banco) {
  const rotas=Router(), servico=criarServicoMetas(banco);
  const listar=req=>servico.listar(req.usuario.id,obterDataHoje(req.usuario.fuso_horario));
  rotas.get('/',async(req,res)=>res.json(await listar(req)));
  rotas.use((req,res,next)=>{if(!req.is('application/json'))return res.status(415).json({erro:'Use conteúdo JSON.'});next();});
  rotas.post('/',async(req,res)=>{await servico.criar(req.usuario.id,req.body);res.status(201).json(await listar(req));});
  rotas.put('/:id',async(req,res)=>{await servico.editar(req.usuario.id,req.params.id,req.body);res.json(await listar(req));});
  rotas.patch('/:id/dias',async(req,res)=>{await servico.marcar(req.usuario.id,req.params.id,obterDataHoje(req.usuario.fuso_horario),req.body);res.json(await listar(req));});
  rotas.delete('/:id',async(req,res)=>{await servico.remover(req.usuario.id,req.params.id,req.body);res.json(await listar(req));});
  return rotas;
}
