import { Router } from 'express';
import { validarObjeto, ErroValidacao } from '../validacoes/tarefas.js';
import { criarLimitador } from '../middlewares/limitar-tentativas.js';

export function validarFeedback(dados) {
  validarObjeto(dados, ['envio_id', 'tipo', 'area', 'mensagem']);
  if (!['sugestao', 'problema'].includes(dados.tipo)) throw new ErroValidacao('Escolha o tipo do relato.');
  if (!['Geral', 'Rotina', 'Casa', 'Treino', 'Financeiro', 'Alimentação', 'Leitura', 'Conta e instalação'].includes(dados.area)) throw new ErroValidacao('Escolha a área do relato.');
  if (typeof dados.envio_id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(dados.envio_id)) throw new ErroValidacao('Atualize a página e tente novamente.');
  if (typeof dados.mensagem !== 'string' || dados.mensagem.trim().length < 10 || dados.mensagem.trim().length > 2000) throw new ErroValidacao('Escreva uma mensagem entre 10 e 2.000 caracteres.');
  return { ...dados, mensagem: dados.mensagem.trim() };
}

export function criarRotasFeedback(banco) {
  const rotas = Router();
  rotas.post('/', criarLimitador(10), async (req, res) => {
    if (!req.is('application/json')) return res.status(415).json({ erro: 'Use conteúdo JSON.' });
    const d = validarFeedback(req.body);
    // Repetir o mesmo envio após falha de conexão não duplica o relato.
    await banco.execute(`INSERT INTO feedback (usuario_id, envio_id, tipo, area, mensagem)
      VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id`, [req.usuario.id, d.envio_id, d.tipo, d.area, d.mensagem]);
    res.status(201).json({ mensagem: 'Relato recebido. Obrigado por ajudar a melhorar o Dayvilo!' });
  });
  return rotas;
}
