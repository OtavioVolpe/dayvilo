# Dayvilo

Aplicação web de organização pessoal, com foco em uma rotina flexível e uma interface simples para celular e computador.

A área de rotina reúne três visões: **Hoje**, **Semana** e **Histórico**. O design privilegia clareza e navegação entre as áreas da vida pessoal.

## Tecnologias

- **Interface:** React, JavaScript, Vite, CSS e Lucide.
- **Servidor:** Node.js e Express.
- **Banco de dados:** MySQL, com o driver mysql2.

## Executar localmente

Requisitos: Node.js 24 ou superior, npm e MySQL 8.0.16 ou superior.

```sh
git clone https://github.com/OtavioVolpe/dayvilo.git
cd dayvilo
npm install
npm run dev
```

- Interface: http://127.0.0.1:5173
- API: http://127.0.0.1:3001/api/health

### MySQL

Copie `server/.env.example` para `server/.env` e preencha os dados de conexão de uma base MySQL existente. Use uma conta da aplicação com acesso apenas a essa base.

```sh
npm run db:check
```

O comando verifica a conexão com `SELECT 1`; não cria bancos nem tabelas. O arquivo `.env` não é versionado.

Para criar as tabelas na base configurada, execute:

```sh
npm run db:migrate
```

O usuário da conexão precisa de permissões de leitura/escrita, `CREATE` e `REFERENCES` nessa base. As migrações são arquivos SQL numerados em `server/migrations`. Execute-as em ordem pelo comando: ele registra as aplicadas em `migracoes_aplicadas` e não as repete. Cada arquivo contém uma única instrução SQL.

Não edite uma migração já aplicada; adicione outro arquivo numerado para mudanças de estrutura. Se uma execução falhar, inspecione o banco antes de corrigir o registro marcado como `iniciada`: comandos de estrutura no MySQL podem ser confirmados mesmo quando uma etapa posterior falha.

As tabelas `usuarios` e `tarefas` guardam os dados da aplicação. A conta MySQL usada na conexão é independente dos registros de `usuarios`.

### Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia a interface e a API localmente. |
| `npm run build` | Compila a interface em `client/dist`. |
| `npm start` | Inicia somente a API. |
| `npm run db:check` | Verifica a conexão com MySQL. |
| `npm run db:migrate` | Aplica as migrações pendentes à base configurada. |
| `npm test` | Verifica as proteções do controle de migrações. |

## Estrutura

```text
dayvilo/
├── client/     # Interface React
├── server/     # API Express e acesso ao MySQL
└── package.json
```
