// Erro previsto cujo status e mensagem podem ser apresentados pela API.
export class ErroAplicacao extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}
