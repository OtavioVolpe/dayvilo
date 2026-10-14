import { Router } from 'express';
import { criarServicoFinanceiro } from '../servicos/financeiro.js';
export function criarRotasFinanceiro(banco) {
  const r=Router(), s=criarServicoFinanceiro(banco);
  r.use((req,res,next)=>{if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&!req.is('application/json'))return res.status(415).json({erro:'Use conteúdo JSON.'});next();});
  r.get('/',async(req,res)=>res.json(await s.listar(req.usuario,req.query)));
  r.post('/lancamentos',async(req,res)=>res.status(201).json(await s.salvarLancamento(req.usuario,req.body)));
  r.put('/lancamentos/:id',async(req,res)=>res.json(await s.salvarLancamento(req.usuario,req.body,req.params.id)));
  r.patch('/lancamentos/:id',async(req,res)=>res.json(await s.situacao(req.usuario,req.params.id,req.body)));
  r.delete('/lancamentos/:id',async(req,res)=>res.json(await s.excluirLancamento(req.usuario,req.params.id,req.body)));
  r.get('/investimentos',async(req,res)=>res.json(await s.investimentos(req.usuario)));
  r.post('/investimentos',async(req,res)=>res.status(201).json(await s.salvarInvestimento(req.usuario,req.body)));
  r.put('/investimentos/:id',async(req,res)=>res.json(await s.salvarInvestimento(req.usuario,req.body,req.params.id)));
  r.delete('/investimentos/:id',async(req,res)=>res.json(await s.excluirInvestimento(req.usuario,req.params.id,req.body)));
  r.post('/investimentos/:id/registros',async(req,res)=>res.status(201).json(await s.registrar(req.usuario,req.params.id,req.body)));
  r.delete('/investimentos/:id/registros/:registro',async(req,res)=>res.json(await s.excluirRegistro(req.usuario,req.params.id,req.params.registro,req.body)));
  return r;
}
