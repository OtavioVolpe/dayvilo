# Dayvilo

Aplicação web de organização pessoal, com foco em uma rotina flexível e uma interface simples para celular e computador.

A área de rotina reúne três visões: **Hoje**, **Semana** e **Histórico**. A visão semanal organiza as tarefas de segunda a domingo, permite navegar entre semanas e adicionar, editar ou concluir tarefas de cada dia. O Histórico consulta as tarefas pela data planejada, com filtros de situação e períodos de até 366 dias. Mostra o estado atual das tarefas; alterações de data e exclusões também afetam essa consulta. No cadastro, tarefas podem se repetir diariamente ou nos dias da semana escolhidos, com data final e período de até 366 dias. As ocorrências são criadas de uma vez e as novas repetições ficam vinculadas a uma série. Cada ocorrência pode ser concluída, editada ou excluída individualmente. Editar próximas altera título, horário, observação e prioridade das pendentes a partir da data da ocorrência selecionada ou de hoje, o que vier depois. Encerrar repetição exclui esse mesmo conjunto de pendentes após confirmação; essas ocorrências não podem ser restauradas. Datas anteriores, concluídas e puladas são preservadas. Repetições anteriores à criação dos vínculos continuam independentes. Na tela Hoje, pendências de datas anteriores aparecem separadamente e podem ser concluídas, reagendadas para hoje ou puladas. Pular preserva a tarefa no Histórico, pode ser desfeito com Restaurar e retira a ocorrência do total usado no progresso. Em Hoje e Semana, as puladas ficam em seções recolhidas inicialmente; ao pular uma tarefa da lista, a seção do dia abre e mostra o card movido. Pendentes, concluídas e puladas têm selos com texto e ícone, com cores distintas, também no Histórico. O design privilegia clareza e navegação entre as áreas da vida pessoal.

## Organizar tarefas

Em Hoje e Semana, selecione **Minha ordem** e segure a alça de seis pontos à esquerda de uma tarefa pendente para arrastá-la dentro do mesmo dia. Uma linha indica a posição de destino; soltar salva a sequência. Escape cancela o arraste. Pelo teclado, coloque o foco na alça e use as setas para cima ou para baixo.

A sequência fica salva no banco. Também é possível visualizar por horário ou ordem de criação sem apagar a organização manual. Novas tarefas e tarefas transferidas de outra data entram depois das posições já definidas. Concluídas, puladas e pendências anteriores não são arrastadas. Se a lista tiver mudado em outra aba, recarregue antes de tentar novamente.

## Exportar histórico

Em **Histórico**, consulte um período, selecione a situação e clique em **Exportar CSV**. O arquivo contém apenas as tarefas correspondentes à consulta e ao filtro, com data planejada, título, horário, situação, prioridade, observação e indicação de série vinculada. Não inclui tarefas futuras ou sem data que não aparecem nessa consulta. O botão fica desabilitado quando não há resultados.

O CSV usa UTF-8 com BOM, ponto e vírgula como separador e datas no formato AAAA-MM-DD. Pode ser aberto em uma planilha; se necessário, escolha UTF-8 e ponto e vírgula na importação. Textos que poderiam ser interpretados como fórmulas recebem um apóstrofo inicial. A exportação não altera os dados e não substitui um backup completo do banco.

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

As senhas são protegidas com scrypt e sal individual. A sessão dura até sete dias e usa um cookie HttpOnly/SameSite=Strict; sair invalida a sessão no servidor. Alterações exigem proteção contra CSRF. Cadastro e entrada têm limite de tentativas. O e-mail é usado como identificador; a confirmação de e-mail e a recuperação de senha aceitam entrega local ou envio pelo Resend.

Para trazer uma rotina criada com o antigo perfil local, mantenha `USUARIO_LOCAL_ID` no `server/.env` e execute, **antes de cadastrar sua conta**:

```sh
npm run conta:codigo
```

No cadastro, marque **Trazer minha rotina anterior** e cole o código no campo de vinculação. Ele vale por 30 minutos, pode ser usado uma vez e não deve ser compartilhado. Um novo código invalida o anterior. A vinculação preserva as tarefas, as séries, os estados de conclusão e o fuso do perfil. Contas novas não precisam desse código nem de `db:perfil`.

A API permanece restrita ao próprio computador. Os cookies locais funcionam por HTTP; publicação exige configurar HTTPS, cookies Secure e as origens de acesso. Este comando de inicialização não aceita execução em produção.

### Confirmação de e-mail

Novos cadastros tentam enviar automaticamente um link de confirmação. Para contas existentes ou para reenviar, entre na rotina e selecione **Enviar link de confirmação**. O link vale por 30 minutos e exige clicar em **Confirmar meu e-mail** na página aberta. Abrir a página não consome o link.

O reenvio exige intervalo mínimo de um minuto e substitui o link anterior. Depois da confirmação, o aviso desaparece da rotina. Senha, sessões, tarefas e histórico são preservados. A confirmação é informativa nesta versão e não bloqueia o uso da rotina. Se o envio falhar durante o cadastro, a conta continua criada e permite solicitar outro link.

A tabela `confirmacoes_email` registra a confirmação e guarda somente o resumo do token temporário. Os links de confirmação e de recuperação de senha são independentes. Em modo local, use `npm run emails:listar` para localizar a mensagem; em modo Resend, consulte a caixa de e-mail.

### Recuperação de senha

O modo padrão é local. Para enviar pela internet, configure o Resend conforme a seção abaixo.

#### Mensagens locais

Na tela de entrada, selecione **Esqueci minha senha** e informe o e-mail cadastrado. As mensagens de teste são salvas em `server/.emails/`, pasta ignorada pelo Git. Nada é enviado à caixa de e-mail.

```sh
npm run emails:listar
```

Abra o arquivo mais recente no editor e copie o link para o navegador. Ele vale por 30 minutos, só pode ser usado uma vez e permite definir uma senha de 15 a 128 caracteres. Um novo pedido, após o intervalo mínimo de um minuto, substitui o link anterior. Há limite de cinco pedidos por IP a cada 15 minutos. Após a troca, todas as sessões da conta são invalidadas; tarefas e histórico permanecem intactos. Entre novamente com a nova senha.

`URL_APLICACAO` define o endereço usado nos links; o padrão é `http://127.0.0.1:5173/`. Se alterar a porta da interface, ajuste essa variável. Mensagens locais contêm links privados: não as publique ou compartilhe.

#### Envio pelo Resend

Crie uma conta no [Resend](https://resend.com) e uma chave de API com permissão de envio. No arquivo privado `server/.env`, adicione:

```dotenv
EMAIL_MODO=resend
RESEND_API_KEY=sua_chave_aqui
EMAIL_REMETENTE="Dayvilo <onboarding@resend.dev>"
RESEND_DESTINATARIO_TESTE=seu_email_cadastrado_no_resend
```

Reinicie a API após alterar o arquivo. Com o remetente de teste, use no Dayvilo o mesmo e-mail da conta Resend. O destinatário configurado é uma restrição: links de outras contas nunca são redirecionados para ele. Para enviar a outros usuários, verifique um domínio próprio no Resend, altere o remetente e remova essa restrição quando estiver pronto.

O servidor usa a API HTTPS do Resend, com limite de cinco segundos por envio e sem repetição automática. Uma falha não gera arquivo local como alternativa e reverte a alteração do link no banco. Em falhas de rede, o serviço externo pode ter aceitado uma mensagem sem confirmar a resposta; nesse caso, o link recebido pode ser inválido e será necessário solicitar outro. A resposta pública é genérica; o terminal registra somente um código de erro, sem chave ou link. Não coloque a chave em arquivos do cliente ou no GitHub.

O link continua apontando para `URL_APLICACAO`: durante o desenvolvimento, abra-o no computador onde o Dayvilo está rodando. Enviar e-mail não publica o site na internet. Para voltar aos arquivos locais, use `EMAIL_MODO=local` e reinicie a API.

### Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia a interface e a API localmente. |
| `npm run build` | Compila a interface em `client/dist`. |
| `npm start` | Inicia somente a API. |
| `npm run db:check` | Verifica a conexão com MySQL. |
| `npm run db:migrate` | Aplica as migrações pendentes à base configurada. |
| `npm run emails:listar` | Lista os arquivos das cinco mensagens locais mais recentes. |
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

