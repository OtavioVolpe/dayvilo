# Auditoria de segurança — 09/11/2026

## Resultado

Foram identificadas dependências com avisos públicos de segurança e atualizadas localmente. O `npm audit` passou de 9 pacotes sinalizados para zero. Esses nove alertas incluem propagação pela árvore de dependências; não representam nove invasões ou nove falhas exploráveis remotamente.

Não foi possível acessar ou alterar dados de outra conta nos cenários testados. A tentativa de XSS armazenado permaneceu texto no navegador. Isso não garante ausência de vulnerabilidades: a conclusão se limita ao código e aos testes descritos abaixo.

**As correções precisam de commit, push e deploy para chegar à produção.** Não houve publicação, alteração de esquema ou migração no banco real nesta auditoria.

## Escopo e método

- Código local a partir do commit `91ed8f1`, incluindo autenticação, sessão, autorização, validação de entradas, consultas SQL, recuperação de senha e cabeçalhos.
- Testes de integração em MySQL descartável, restrito ao loopback, com contas e dados fictícios. A instância foi encerrada após os testes.
- Teste de navegador local sobre a aplicação compilada.
- Dez requisições GET públicas, cinco por domínio: `dayvilo.com.br` e `app.dayvilo.com.br`. Caminhos: `/`, `/api/contas/sessao`, `/api/tarefas`, `/.env` e `/.git/config`.
- Auditoria de dependências e busca heurística por credenciais em 285 arquivos de texto rastreados.

Não houve acesso ao banco de produção, tentativa de força bruta remota, carga/DDoS, escrita remota ou utilização de dados reais para ataques.

## Dependências corrigidas

| Componente | Antes | Depois | Avaliação |
| --- | --- | --- | --- |
| Express | 5.2.1 | 5.3.0 | Atualização do servidor e da árvore de dependências |
| body-parser | 2.3.0 | 2.4.0 | Aviso de alta gravidade: corpo comprimido malformado pode provocar exceção não tratada e indisponibilidade |
| qs | 6.16.0 | 6.17.1 | Aviso de negação de serviço em stringify; não foi demonstrado caminho explorável no app |
| Vite | 8.3.0 | 8.3.7 | Correções de segurança da ferramenta de desenvolvimento/build |
| concurrently | 10.0.5 | 10.0.7 | Atualização da ferramenta de desenvolvimento e dependências |
| shell-quote | 1.9.0 | 1.12.0 | Aviso crítico de injeção de comandos sob condições específicas; não demonstrado como ataque remoto ao site |
| source-map-js | 1.2.1 | 1.2.2 | Aviso de negação de serviço ao processar mapas de código; dependência de desenvolvimento |

O parser JSON do servidor é executado antes da autenticação, tornando a correção do body-parser prioritária. A reprodução local feita antes da atualização retornou HTTP 400 e manteve o processo vivo: **não reproduziu a queda**. O achado é a versão vulnerável instalada e a exposição do parser, não uma invasão comprovada. [Aviso oficial do body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828).

Os avisos de shell-quote e source-map-js dizem respeito a condições específicas nas ferramentas; não demonstram roubo de dados em produção. [Aviso do shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), [aviso do source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## Verificações concluídas

- **118 testes passaram**, sem falhas ou testes ignorados, após as atualizações.
- Novo teste `server/test/seguranca.integration.js`: sessão ausente/forjada, acesso entre contas, tentativa de atribuir proprietário pela entrada, SQL injection, CSRF ausente/incorreto, origem externa, JSON inválido, limite do corpo, corpo comprimido inválido e revogação de sessão.
- A conta A não conseguiu consultar, editar ou excluir livro e lançamento financeiro da conta B; os dados da conta B foram preservados.
- Uma entrada com sintaxe SQL foi armazenada literalmente; entradas inválidas de identificador foram rejeitadas.
- Logout invalidou a sessão anterior sem invalidar a sessão da outra conta.
- XSS no título e na observação de tarefa permaneceu texto na Rotina e no formulário; nenhum código do conteúdo foi executado.
- Builds da aplicação e do site público passaram. Permanece aviso de tamanho de chunk, que não é evidência de falha de segurança.
- Em produção, `/api/tarefas` no domínio do app respondeu 401 sem login; `/.env` e `/.git/config` responderam 404 nos dois domínios. O endpoint público de sessão respondeu 200 no app, como esperado para consultar estado anônimo.
- CSP presente nas respostas públicas observadas. A inspeção de código também encontrou cookies HttpOnly, proteção CSRF, hashing de senha com scrypt, sessões opacas com hash no banco e consultas parametrizadas.
- Nenhum padrão procurado de chave privada, token GitHub, chave AWS ou token Resend foi encontrado nos arquivos rastreados analisados. Essa busca não cobre todo tipo de segredo nem o histórico completo do Git.

## Limites e próximos reforços

1. Publicar as atualizações e confirmar o novo deploy. A árvore local corrigida não altera automaticamente o serviço em execução.
2. O limitador de autenticação usa memória do processo e IP: reinícios zeram o estado e múltiplas instâncias não compartilham contadores. Avaliar armazenamento compartilhado e limitação por conta além de IP. Não foi demonstrado bypass remoto nesta auditoria.
3. Avaliar quotas e limites de volume para operações autenticadas. Não foram feitos testes de carga ou exaustão de recursos.
4. Revisar separadamente as configurações reais de Cloudflare, Render e Aiven: permissões, 2FA, escopo dos tokens, rede, cadeia de proxies, logs e alertas. Os painéis e a infraestrutura não foram auditados aqui.
5. A revisão não substitui monitoramento contínuo, atualização de dependências, backups verificados ou investigação de incidentes. Não comprova que nunca houve comprometimento.

## Evidências locais

Arquivos na pasta `C:/Users/Otávio/Documents/Codex/2026-09-20/gpt-x20/outputs/`:

- `auditoria-dependencias-final.json`: zero avisos no npm audit ao final.
- `auditoria-seguranca-testes-final.log`: resultado dos 118 testes.
- `auditoria-xss.log` e `auditoria-xss.json`: teste de navegador.
- `auditoria-corpo-antes.log`: tentativa de reprodução anterior à atualização.
- `auditoria-http-publico.json`: verificações GET públicas.
- `auditoria-segredos.json`: resultado da busca heurística.

Essas evidências não devem ser confundidas com um teste completo de todas as combinações de entradas e configurações possíveis.
