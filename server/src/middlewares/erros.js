import { ErroAplicacao } from '../erros/aplicacao.js';
import { ErroValidacao } from '../validacoes/tarefas.js';

export function instalarTratamentoErros(aplicacao) {
  aplicacao.use((requisicao, resposta) => resposta.status(404).json({ erro: 'Recurso não encontrado.' }));
  aplicacao.use((erro, _requisicao, resposta, _proximo) => {
    const status = erro instanceof ErroAplicacao ? erro.status : erro.status === 400 ? 400 : erro.status === 413 ? 413 : 500;
    const mensagem = erro instanceof ErroValidacao || erro instanceof ErroAplicacao ? erro.message
      : status === 400 ? 'JSON inválido.' : status === 413 ? 'Conteúdo muito grande.'
        : 'Não foi possível acessar suas tarefas. Tente novamente.';
    if (status === 500) console.error(`Falha na API: ${erro.code || 'erro interno'}`);
    resposta.status(status).json({ erro: mensagem });
  });
}
