# Dayvilo

Aplicação web de organização pessoal, com foco em uma rotina flexível e uma interface simples para celular e computador.

A área de rotina reúne três visões: **Hoje**, **Semana** e **Histórico**. A visão semanal organiza as tarefas de segunda a domingo, permite navegar entre semanas e adicionar, editar ou concluir tarefas de cada dia. O Histórico consulta as tarefas pela data planejada, com filtros de situação e períodos de até 366 dias. Mostra o estado atual das tarefas; alterações de data e exclusões também afetam essa consulta. No cadastro, tarefas podem se repetir diariamente ou nos dias da semana escolhidos, com data final e período de até 366 dias. As ocorrências são criadas de uma vez e as novas repetições ficam vinculadas a uma série. Cada ocorrência pode ser concluída, editada ou excluída individualmente. Editar próximas altera título, horário, observação e prioridade das pendentes a partir da data da ocorrência selecionada ou de hoje, o que vier depois. Encerrar repetição exclui esse mesmo conjunto de pendentes após confirmação; essas ocorrências não podem ser restauradas. Datas anteriores, concluídas e puladas são preservadas. Repetições anteriores à criação dos vínculos continuam independentes. Na tela Hoje, pendências de datas anteriores aparecem separadamente e podem ser concluídas, reagendadas para hoje ou puladas. Pular preserva a tarefa no Histórico, pode ser desfeito com Restaurar e retira a ocorrência do total usado no progresso. Em Hoje e Semana, as puladas ficam em seções recolhidas inicialmente; ao pular uma tarefa da lista, a seção do dia abre e mostra o card movido. Pendentes, concluídas e puladas têm selos com texto e ícone, com cores distintas, também no Histórico. O design privilegia clareza e navegação entre as áreas da vida pessoal.

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

### Contas e acesso

Depois das migrações, inicie com `npm run dev` e abra a interface. Crie uma conta com nome, e-mail e senha; cada conta acessa apenas sua própria rotina. E-mails são tratados sem distinção entre maiúsculas e minúsculas. A senha aceita de 15 a 128 caracteres, incluindo espaços.

As senhas são protegidas com scrypt e sal individual. A sessão dura até sete dias e usa um cookie HttpOnly/SameSite=Strict; sair invalida a sessão no servidor. Alterações exigem proteção contra CSRF. Cadastro e entrada têm limite de tentativas. O e-mail é usado como identificador; não há envio de mensagens, verificação de e-mail ou recuperação de senha.

Para trazer uma rotina criada com o antigo perfil local, mantenha `USUARIO_LOCAL_ID` no `server/.env` e execute, **antes de cadastrar sua conta**:

```sh
npm run conta:codigo
```

No cadastro, marque **Trazer minha rotina anterior** e cole o código no campo de vinculação. Ele vale por 30 minutos, pode ser usado uma vez e não deve ser compartilhado. Um novo código invalida o anterior. A vinculação preserva as tarefas, as séries, os estados de conclusão e o fuso do perfil. Contas novas não precisam desse código nem de `db:perfil`.

A API permanece restrita ao próprio computador. Os cookies locais funcionam por HTTP; publicação exige configurar HTTPS, cookies Secure e as origens de acesso. Este comando de inicialização não aceita execução em produção.

### Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia a interface e a API localmente. |
| `npm run build` | Compila a interface em `client/dist`. |
| `npm start` | Inicia somente a API. |
| `npm run db:check` | Verifica a conexão com MySQL. |
| `npm run db:migrate` | Aplica as migrações pendentes à base configurada. |
| `npm run conta:codigo` | Gera um código para vincular a rotina local a uma conta no cadastro. |
| `npm run db:perfil` | Configura um perfil legado; desnecessário para contas novas. |
| `npm test` | Verifica migrações, validações e proteção das senhas. |
| `npm run test:integracao` | Testa contas, sessões e tarefas com MySQL; reverte os dados de teste. |

## Estrutura

```text
dayvilo/
├── client/     # Interface React
├── server/     # API Express e acesso ao MySQL
└── package.json
```

