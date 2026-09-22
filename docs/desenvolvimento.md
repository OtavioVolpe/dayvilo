# Desenvolvimento local

## Requisitos

- Node.js 24 ou superior, npm e MySQL 8.
- Executar os comandos na pasta do projeto.

## Instalar e iniciar

```sh
npm install
npm run dev
```

Interface: http://127.0.0.1:5173. API: http://127.0.0.1:3001/api/health.

Os servidores escutam somente no computador local. Autenticação e publicação serão implementadas em etapas posteriores.

## MySQL

Copiar `server/.env.example` para `server/.env` e preencher uma conta exclusiva para a base `dayvilo`. Não colocar senha em mensagens, no frontend ou no Git.

```sh
npm run db:check
```

O comando executa somente `SELECT 1`. Nesta entrega, nenhum banco, usuário ou tabela é criado automaticamente. A configuração da base e as migrações entram com a persistência de tarefas.

## Compilação

```sh
npm run build
```

A interface compilada é gerada em `client/dist` e não é versionada. `npm start` inicia apenas a API; ainda não é um comando de publicação do site completo.

## Estado desta entrega

Estrutura React, navegação da rotina, tema aprovado, API de verificação e configuração de conexão MySQL. As telas ainda não cadastram tarefas. A persistência será implementada na próxima etapa.

## Validação da entrega inicial

- Compilação de produção da interface concluída.
- API verificada por HTTP: `/api/health` retorna 200; rota desconhecida retorna 404.
- Conexão real ao MySQL ainda não validada: a conta e a base do projeto precisam ser configuradas.
- No ambiente restrito de automação no Windows, os scripts via `cmd` e a detecção de unidades de rede do Vite falharam. A compilação foi validada pela API JavaScript do Vite, carregando a mesma configuração diretamente e usando `resolve.preserveSymlinks: true` somente nessa execução. Os comandos npm convencionais permanecem no projeto para uso no terminal local.
