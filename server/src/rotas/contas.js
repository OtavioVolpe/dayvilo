import { Router } from 'express';
import { criarServicoAlteracaoEmail } from '../servicos/alteracao-email.js';
import { limitarOperacaoSenha } from '../servicos/limite-senha.js';
import { criarControladorMinhaConta } from '../controladores/minha-conta.js';
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
  const alteracaoEmail = criarServicoAlteracaoEmail({ banco, ...entrega });
  aplicacao.use('/api', carregarSessao(contas));
  const rotas = Router();
  const controlador = criarControladorContas({ contas, confirmacao, recuperacao, entrega });
  const minhaConta = criarControladorMinhaConta(banco);
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
  rotas.get('/email', exigirConta, async (req, res) => res.json(await alteracaoEmail.consultar(req.usuario.id)));
  rotas.delete('/email', exigirConta, conferirCsrf, async (req, res) => res.json(await alteracaoEmail.cancelar(req.usuario.id)));
  rotas.post('/email', exigirConta, conferirCsrf, limitarPedidos, async (req, res) => {
    if (!req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    await limitarOperacaoSenha(async () => res.json(await alteracaoEmail.solicitar(req.usuario.id, req.tokenSessao, req.body)));
  });
  rotas.post('/email/confirmar', limitarTokensConfirmacao, async (req, res) => {
    if (!req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    res.json(await alteracaoEmail.confirmar(req.body));
  });
  rotas.get('/sessao', controlador.sessao);
  rotas.post('/saida', exigirConta, conferirCsrf, controlador.sair);
  rotas.patch('/perfil', exigirConta, conferirCsrf, minhaConta.nome);
  rotas.put('/senha', exigirConta, conferirCsrf, limitarRedefinicoes, minhaConta.senha);
  rotas.post('/saida-todas', exigirConta, conferirCsrf, minhaConta.sairTodas);
  aplicacao.use('/api/contas', rotas);
  aplicacao.use('/api', exigirConta, conferirCsrf);
}
