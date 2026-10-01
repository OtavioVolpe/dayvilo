import { criarServicoTarefas } from '../servicos/tarefas.js';
import { obterDataHoje } from '../validacoes/tarefas.js';

export function criarControladorTarefas(banco) {
  const tarefas = criarServicoTarefas(banco);
  return {
    perfil(requisicao, resposta) {
      resposta.json({ nome: requisicao.usuario.nome, fuso_horario: requisicao.usuario.fuso_horario, data_hoje: obterDataHoje(requisicao.usuario.fuso_horario) });
    },
    async atrasadas(requisicao, resposta) {
      const resultado = await tarefas.atrasadas(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async situacao(requisicao, resposta) {
      const resultado = await tarefas.situacao(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async reagendar(requisicao, resposta) {
      const resultado = await tarefas.reagendar(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async historico(requisicao, resposta) {
      const resultado = await tarefas.historico(requisicao.usuario, requisicao.query, requisicao.params.id);
      resposta.json(resultado);
    },
    async semana(requisicao, resposta) {
      const resultado = await tarefas.semana(requisicao.usuario, requisicao.query, requisicao.params.id);
      resposta.json(resultado);
    },
    async listar(requisicao, resposta) {
      const resultado = await tarefas.listar(requisicao.usuario, requisicao.query, requisicao.params.id);
      resposta.json(resultado);
    },
    async ordenar(requisicao, resposta) {
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      const resultado = await tarefas.ordenar(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async repetir(requisicao, resposta) {
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      const resultado = await tarefas.repetir(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.status(201).json(resultado);
    },
    async criar(requisicao, resposta) {
      if (!requisicao.is('application/json')) return resposta.status(415).json({ erro: 'Use conteúdo JSON.' });
      const resultado = await tarefas.criar(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.status(201).json(resultado);
    },
    async editarSerie(requisicao, resposta) {
      const resultado = await tarefas.editarSerie(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async encerrarSerie(requisicao, resposta) {
      const resultado = await tarefas.encerrarSerie(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async editar(requisicao, resposta) {
      const resultado = await tarefas.editar(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async excluir(requisicao, resposta) {
      const resultado = await tarefas.excluir(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
    async concluir(requisicao, resposta) {
      const resultado = await tarefas.concluir(requisicao.usuario, requisicao.body, requisicao.params.id);
      resposta.json(resultado);
    },
  };
}
