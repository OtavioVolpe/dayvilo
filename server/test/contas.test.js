import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoAutenticacao } from '../src/servicos/autenticacao.js';
import { protegerSenha, conferirSenha } from '../src/servicos/senhas.js';

test('senha usa sal exclusivo e permite conferir sem armazenar o texto original', async () => {
  const senha = 'Minha frase de teste com espaços';
  const primeira = await protegerSenha(senha); const segunda = await protegerSenha(senha);
  assert.notEqual(primeira, segunda);
  assert.equal(await conferirSenha(senha, primeira), true);
  assert.equal(await conferirSenha('Outra frase de teste com espaços', primeira), false);
  assert.equal(await conferirSenha(senha, 'formato-invalido'), false);
});

test('cadastro rejeita campos inválidos antes de gravar ou processar a senha', async () => {
  const servico = criarServicoAutenticacao({ execute() { throw new Error('Não deve acessar o banco.'); } });
  const base = { nome: 'Pessoa', email: 'pessoa@example.test', senha: 'Uma senha de teste bem longa' };
  for (const alteracao of [
    { nome: ' ' }, { nome: 'a'.repeat(101) }, { email: 'invalido' }, { senha: 'curta' },
    { senha: 'a'.repeat(129) }, { senha: {} }, { fuso_horario: 'Inexistente' },
    { codigo_vinculo: '' }, { codigo_vinculo: ['codigo'] }, { usuario_id: 1 },
  ]) await assert.rejects(servico.cadastrar({ ...base, ...alteracao }), erro => erro.status === 400);
});
