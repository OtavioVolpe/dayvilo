import { ErroConta } from './autenticacao.js';

let operacoesSenha = 0;
export async function limitarOperacaoSenha(executar) {
  if (operacoesSenha >= 2) throw new ErroConta(503, 'Servidor ocupado. Tente novamente em alguns segundos.');
  operacoesSenha++;
  try { return await executar(); } finally { operacoesSenha--; }
}

