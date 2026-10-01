import { Router } from 'express';
import { criarServicoAutenticacao } from '../servicos/autenticacao.js';
import { criarServicoConfirmacao } from '../servicos/confirmacao-email.js';
import { criarServicoRecuperacao } from '../servicos/recuperacao-senha.js';
import { criarControladorContas } from '../controladores/contas.js';
import { carregarSessao, exigirConta, conferirCsrf } from '../middlewares/sessao.js';
import { criarLimitador } from '../middlewares/limitar-tentativas.js';

export function instalarContas(aplicacao, banco, entrega) {
  const contas = criarServicoAutenticacao(banco);
  const confirmacao = criarServicoConfirmacao({ banco, ...entrega });
  const recuperacao = criarServicoRecuperacao({ banco, ...entrega });
  aplicacao.use('/api', carregarSessao(contas));
  const rotas = Router();
  const controlador = criarControladorContas({ contas, confirmacao, recuperacao, entrega });
  const limitar = criarLimitador(10);
  const limitarPedidos = criarLimitador(5);
  const limitarConfirmacoes = criarLimitador(5);
  const limitarTokensConfirmacao = criarLimitador(30);
  const limitarLinks = criarLimitador(30);
  const limitarRedefinicoes = criarLimitador(10);
  rotas.post('/cadastro', limitar, controlador.cadastrar);
  rotas.post('/entrada', limitar, controlador.entrar);
  rotas.post('/recuperacao', limitarPedidos, controlador.solicitarRecuperacao);
  rotas.post('/recuperacao/validar', limitarLinks, controlador.validarRecuperacao);
  rotas.post('/recuperacao/redefinir', limitarRedefinicoes, controlador.redefinirSenha);
  rotas.post('/confirmacao', exigirConta, conferirCsrf, limitarConfirmacoes, controlador.solicitarConfirmacao);
  rotas.post('/confirmacao/confirmar', limitarTokensConfirmacao, controlador.confirmarEmail);
  rotas.get('/sessao', controlador.sessao);
  rotas.post('/saida', exigirConta, conferirCsrf, controlador.sair);
  aplicacao.use('/api/contas', rotas);
  aplicacao.use('/api', exigirConta, conferirCsrf);
}
