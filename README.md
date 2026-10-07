# Dayvilo

Aplicação web de organização pessoal, com foco em uma rotina flexível e uma interface simples para celular e computador.

A área de rotina reúne três visões: **Hoje**, **Semana** e **Histórico**. A visão semanal organiza as tarefas de segunda a domingo, permite navegar entre semanas e adicionar, editar ou concluir tarefas de cada dia. O Histórico consulta as tarefas pela data planejada, com filtros de situação e períodos de até 366 dias. Mostra o estado atual das tarefas; alterações de data e exclusões também afetam essa consulta. No cadastro, tarefas podem se repetir diariamente ou nos dias da semana escolhidos, com data final e período de até 366 dias. As ocorrências são criadas de uma vez e as novas repetições ficam vinculadas a uma série. Cada ocorrência pendente pode ser concluída, editada ou pulada individualmente. Para editar uma pulada, restaure-a; para editar uma concluída, desfaça a conclusão. A exclusão individual está disponível em qualquer situação. Editar próximas e Encerrar repetição seguem as regras abaixo. Repetições anteriores à criação dos vínculos continuam independentes. Na tela Hoje, pendências de datas anteriores aparecem separadamente e podem ser concluídas, reagendadas para hoje ou puladas. Pular preserva a tarefa no Histórico, pode ser desfeito com Restaurar e retira a ocorrência do total usado no progresso. Em Hoje e Semana, as puladas ficam em seções recolhidas inicialmente; ao pular uma tarefa da lista, a seção do dia abre e mostra o card movido. Pendentes, concluídas e puladas têm selos com texto e ícone, com cores distintas, também no Histórico. O design privilegia clareza e navegação entre as áreas da vida pessoal.

## Ações das tarefas

Ações individuais afetam somente a ocorrência escolhida, mesmo quando ela pertence a uma repetição.

| Opção | Efeito |
| --- | --- |
| Concluir / desfazer conclusão | Alterna entre pendente e concluída. Para concluir uma pulada, restaure primeiro. |
| Editar esta tarefa | Altera somente a pendente escolhida, incluindo sua data. |
| Pular esta tarefa | Mantém o registro como pulada e permite restaurar. Não pula outras repetições. |
| Restaurar | Volta a pulada para pendente, mantendo os dados atuais dela. |
| Trazer para hoje | Reagenda somente a pendência anterior escolhida. |
| Excluir | Apaga somente a ocorrência escolhida, inclusive do Histórico, após confirmação. Não pode ser restaurada. |
| Editar próximas | Disponível numa pendente vinculada a uma série. Atualiza título, observação, horários e prioridade das pendentes e das puladas futuras abrangidas. As puladas continuam puladas. |
| Encerrar repetição | Disponível numa pendente vinculada a uma série. Exclui as pendentes e puladas futuras abrangidas, após confirmação. As excluídas não podem ser restauradas. |

Nas duas ações de série, o início é a data da ocorrência selecionada ou hoje, o que vier depois. Concluídas, datas anteriores a esse início e puladas de hoje ou do passado são preservadas. Por exemplo, selecionando uma pendente de 23/10 antes dessa data, a ação abrange 23/10 em diante; selecionando uma pendência passada, começa hoje. Não existe opção de pular todas as próximas.

O Histórico consulta o estado atual das tarefas, não um registro imutável de alterações. Reagendar muda onde a ocorrência aparece; excluir também a retira do Histórico.

### Término de uma repetição

Em **Editar próximas**, a data de término pode ser aumentada ou reduzida. Prolongar cria ocorrências pendentes somente após o término anterior, seguindo os dias da série; não recria exclusões dentro do período antigo. Encurtar exclui definitivamente pendentes e puladas futuras após a nova data, com confirmação no formulário. Concluídas, passado e puladas de hoje continuam preservados. O término não pode anteceder o início das alterações e o período futuro fica limitado a 366 dias.

Novas séries guardam sua regra. Séries antigas não tinham esse dado: ao prolongar, confirme todos os dias ou os dias da semana que deseja usar para as novas ocorrências. O término mostrado inicialmente nessas séries é o último dia ainda registrado; não se tenta adivinhar a regra a partir das tarefas restantes.

A tela **Hoje** também permite navegar com **Dia anterior** e **Próximo dia**, mantendo o seletor de data e **Voltar para hoje**.

## Horários das tarefas

O horário inicial e o final são opcionais. Para informar o final, preencha também o início; os dois horários devem ser diferentes. Um final anterior ao início representa o dia seguinte e recebe essa indicação no card. As tarefas continuam agrupadas pela data de início planejada. Horários sobrepostos são permitidos.

Os horários são mantidos na edição, nas repetições, no Histórico e no CSV. Tarefas existentes continuam sem horário final até que ele seja informado.

## Selecionar tarefas

Em **Hoje** ou em um bloco diário da **Semana**, use o controle de seleção junto à ordenação ou o ícone ao lado de Tarefa no dia. Marque pelos círculos ou use **Todas**. A seleção abrange somente aquele dia, sem incluir pendências anteriores ou outras repetições.

Pendentes podem ser concluídas ou puladas; puladas podem ser restauradas; concluídas podem voltar para pendentes. Ao misturar situações, apenas a exclusão fica disponível. Excluir pede confirmação e não pode ser desfeito. O ícone **X** sai da seleção sem alterar tarefas. Os ícones de ação mostram seus nomes ao passar o mouse e possuem rótulos para leitores de tela. Se a lista mudou em outra aba, recarregue e selecione novamente; a operação não é aplicada parcialmente.

Em Editar próximas, **Alterações a partir de** mostra o início efetivo da edição, sem um campo de data bloqueado.

## Organizar tarefas

Em Hoje e Semana, selecione **Minha ordem** e segure a alça de seis pontos à esquerda de uma tarefa para arrastá-la dentro do mesmo grupo (Pendentes, Puladas ou Concluídas) e dia. Uma linha indica a posição de destino; soltar salva a sequência. Escape cancela o arraste. Pelo teclado, coloque o foco na alça e use as setas para cima ou para baixo.

A ordenação escolhida vale para Pendentes, Puladas e Concluídas, dentro de cada dia, em Hoje e Semana. Em Minha ordem, cada grupo pode ser reorganizado por arraste ou teclado, sem alterar a situação das tarefas.

A sequência fica salva no banco. Também é possível visualizar por horário ou ordem de criação sem apagar a organização manual. Novas tarefas e tarefas transferidas de outra data entram depois das posições já definidas. Pendências anteriores e tarefas na visão Histórico não são arrastadas. Se a lista tiver mudado em outra aba, recarregue antes de tentar novamente.

## Consultar histórico

Use **7 dias**, **30 dias** ou **Personalizado**. Os atalhos incluem hoje. Em Personalizado, preencha De/Até e aplique; para um dia específico, informe a mesma data nos dois campos. Os quatro totais resumem todo o período; o filtro de situação altera apenas a lista e o CSV.

### Layout no PC e no celular

- Hoje e Semana usam setas e um calendário compacto. Escolher uma data atualiza a lista; Hoje/Semana atual retorna ao período atual.
- Seleção e ordenação ficam junto à navegação. A seleção abre uma faixa com quantidade, Todas e ações por ícones.
- No PC, a edição fica no lápis. No celular, fica no menu de três pontos. Excluir e as demais ações ficam nesse menu, conforme a situação da tarefa.
- A semana agrupa cada dia em um bloco de cor própria, com resumo e listas por situação.
- O arraste continua disponível em Minha ordem nas três listas. Formulários, regras de repetição e confirmações permanecem iguais.

Os componentes `NavegacaoDatas.jsx` e `FiltroPeriodo.jsx` concentram os controles de período. `planejamento.css` reúne os ajustes responsivos da rotina.

## Exportar histórico

Em **Histórico**, consulte um período, selecione a situação e clique em **Exportar CSV**. O arquivo contém apenas as tarefas correspondentes à consulta e ao filtro, com data planejada, título, horários inicial e final, indicação de término no dia seguinte, situação, prioridade, observação e indicação de série vinculada. Não inclui tarefas futuras ou sem data que não aparecem nessa consulta. O botão fica desabilitado quando não há resultados.

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

O usuário da conexão precisa de permissões de leitura/escrita, `CREATE`, `REFERENCES` e `ALTER` nessa base. As migrações são arquivos SQL numerados em `server/migrations`. Execute-as em ordem pelo comando: ele registra as aplicadas em `migracoes_aplicadas` e não as repete. Cada arquivo contém uma única instrução SQL.

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

No modo local, a API fica restrita ao próprio computador e os cookies funcionam por HTTP. O modo de produção exige configuração explícita de HTTPS, proxy e TLS do banco, conforme a seção abaixo.

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


## Executar em produção

A interface compilada e a API são servidas pelo mesmo processo Node, no mesmo endereço. Não é necessário executar o Vite em produção.

- Build na raiz: `npm ci --include=dev && npm run build`.
- Inicialização na raiz: `npm start`.
- Health check: `/api/health` (disponibilidade do processo; não consulta o banco).
- Node.js: versão 24. O servidor deve receber tráfego por um proxy com HTTPS.

Configure as variáveis no painel da hospedagem, preservando senhas e chaves fora do Git:

| Variável | Uso |
| --- | --- |
| NODE_ENV | production |
| HOST | 0.0.0.0; aceita conexões encaminhadas pela hospedagem |
| PORT | Porta fornecida pela hospedagem |
| URL_APLICACAO | URL HTTPS completa, na raiz, sem parâmetros; usada também nos e-mails. No Render, pode ser omitida para usar RENDER_EXTERNAL_URL automaticamente |
| PROXY_SALTOS | 1 somente quando há exatamente um proxy confiável entre o cliente e o Node; padrão 0 |
| CADASTRO_ABERTO | false para impedir novos cadastros; padrão em produção |
| MYSQL_HOST / PORT / USER / PASSWORD / DATABASE | Dados privados fornecidos pelo serviço MySQL |
| MYSQL_SSL | true; obrigatório em produção |
| MYSQL_SSL_CA | Conteúdo PEM do certificado CA fornecido pelo banco, quando necessário |
| MYSQL_SSL_CA_FILE | Alternativa à variável anterior: caminho absoluto de arquivo privado com a CA |
| EMAIL_MODO | resend; entrega local não é aceita em produção |
| RESEND_API_KEY / EMAIL_REMETENTE | Configuração privada do envio de e-mail |
| RESEND_DESTINATARIO_TESTE | Obrigatório quando o remetente usa resend.dev |

Não configure as duas opções de CA simultaneamente. A conexão verifica o certificado e a identidade do servidor; use o hostname fornecido pelo banco. Certificados emitidos por autoridades já reconhecidas pelo Node podem dispensar uma CA adicional. Não desative a verificação de certificados para contornar falhas de conexão.

O proxy deve encaminhar Host corretamente e sobrescrever os headers de encaminhamento de protocolo/IP. Com PROXY_SALTOS=1, a porta do Node não pode ter uma rota de acesso público que contorne esse proxy. O HTTPS termina na hospedagem; o Node pode receber HTTP do proxy confiável. Revise essa configuração ao trocar de provedor. Referências: [Express e proxies](https://expressjs.com/en/guide/behind-proxies/), [serviços web do Render](https://render.com/docs/web-services) e [TLS no mysql2](https://sidorares.github.io/node-mysql2/docs/documentation/ssl).

Em produção, a aplicação exige a origem configurada, usa cookies Secure/HttpOnly/SameSite=Strict e aplica cabeçalhos de proteção do navegador. Os limites de tentativas são mantidos na memória de uma instância e reiniciam com o processo; múltiplas instâncias exigem um armazenamento compartilhado desses limites.

Com cadastro fechado, a interface oculta Criar conta e a API também recusa tentativas diretas. Contas já existentes continuam acessíveis. Portanto, restaure os dados da conta no banco de destino antes do primeiro uso com essa opção. O fechamento dos cadastros não bloqueia contas já existentes.

Prepare o banco com backup/restauração e migrações antes de iniciar o servidor. Migrações não são executadas automaticamente pelo build ou pelo início da aplicação. Nunca faça o build depender de uma migração sobre seus dados pessoais. Depois de transferir o banco, confirme o envio dos links com a URL pública e faça um teste de restauração do backup.

## Backup local no Windows

Para os dados atuais do site, use o **backup online** abaixo. O banco local e o Aiven são independentes.

Com MySQL 8 e PowerShell, execute na raiz do projeto:

```powershell
./server/scripts/backup-local.ps1
```

O script exporta apenas o banco local chamado dayvilo, configurado em server/.env, para a pasta irmã dayvilo-backups. Para outro caminho do cliente MySQL, use o parâmetro -Mysqldump. A exportação usa snapshot consistente para tabelas InnoDB; não execute alterações de estrutura durante o backup.

O arquivo final .sql e seu SHA-256 só são produzidos após sucesso. Arquivos .partial indicam exportação incompleta. O backup contém dados privados e deve ficar fora do GitHub. Guarde uma cópia separada e teste a restauração em um banco vazio antes de depender desse backup. O script não exporta contas administrativas do servidor MySQL; exporta as tabelas da aplicação.

## Backup online e teste de recuperação no Windows

Com Node 24 e os executáveis do MySQL 8 instalados:

```powershell
npm run db:backup:online
npm run db:backup:verificar -- "C:/caminho/para/dayvilo-online-....sql"
```

O primeiro comando lê somente `server/.env.aiven`, conecta ao Aiven com TLS e verificação do servidor e exporta as tabelas InnoDB. O Aiven deve estar Running. Não execute mudanças de estrutura/migrações durante a cópia. O script não modifica a origem. Usa snapshot transacional, conforme a [documentação do mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html).

Os arquivos ficam em `../dayvilo-backups`, fora do Git: SQL, SHA-256 e, após verificação, relatório `.verificado.json`. O nome usa horário UTC. São privados e contêm dados de conta, tarefas e autenticação. A pasta herda as permissões do usuário Windows; não é um backup criptografado.

A verificação aceita somente backups confiáveis gerados pelo projeto. Confere o hash, inicia um MySQL descartável sem TCP (memória compartilhada local), restaura em um banco novo e compara tabelas e dados reexportados. Não acessa Aiven nem o banco local do projeto. Ao terminar, encerra o processo temporário e remove seus dados. Não testa uma recuperação completa da aplicação nem garante compatibilidade com todas as versões futuras do MySQL.

Se os executáveis estiverem em outro local, configure `MYSQLDUMP_PATH` para exportar e `MYSQL_BIN` (pasta dos executáveis) para verificar. Não publique `.env.aiven`. Interrupções abruptas podem deixar pastas `.conexao-*` ou `.restauracao-*` privadas; não as compartilhe.

Rotina inicial sugerida: backup após mudanças importantes na rotina e antes de migrações; enquanto houver uso diário, fazer uma cópia por dia. Ainda é **manual**, sem agendamento. Guarde também uma cópia em armazenamento privado separado deste computador. Para recuperar em produção, restaure primeiro em banco vazio, valide a aplicação e só então planeje a troca; nunca rode este SQL diretamente sobre o banco em uso.
