# Escopo aprovado

## Produto

Aplicação web para celular e computador. JavaScript, React, Vite, Node.js, Express e MySQL. Sem PWA e sem publicação pública nesta primeira etapa.

## Design

Manter a prévia aprovada: superfícies claras em tema claro, verde discreto, cantos arredondados, espaçamento confortável e adaptação ao tema escuro.

Menu principal: Rotina, Alimentação, Treino e Leitura. Apenas Rotina funciona no primeiro ciclo; demais áreas ficam identificadas como futuras. Financeiro permanece no planejamento futuro.

No topo do conteúdo da Rotina, um seletor arredondado e centralizado contém Hoje, Semana e Histórico. No celular, a navegação principal fica na parte inferior.

## Hoje

- Cadastrar, editar, concluir, desfazer conclusão e excluir tarefas.
- Título obrigatório; data, horário, prioridade e observação opcionais.
- Lista flexível por padrão; ordenação manual e por horário.
- Na ordenação por horário, atividades sem horário vêm depois.
- Resumo de conclusão e seção recolhível de concluídas.
- Pendências de dias anteriores separadas; remarcação explícita, sem transferência automática.
- Ações de prioridade e repetição disponíveis no formulário.

## Recorrência

- Sem repetição, todos os dias, segunda a sexta ou dias escolhidos.
- Concluir ou pular uma ocorrência afeta apenas aquela data.
- Separar regra de repetição e ocorrências diárias no banco.
- Na edição, distinguir esta ocorrência de esta e as próximas.
- Alterações futuras preservam o histórico passado.

## Semana

- Sete dias, navegação entre semanas e inclusão de tarefas por data.
- Área de tarefas sem data.
- No celular, dias apresentados verticalmente.

## Histórico

- Consulta por data das atividades concluídas, pendentes e puladas.
- Sem gráficos complexos no primeiro ciclo.

## Conta e dados

- Antes de disponibilizar na web: login, autorização e dados separados por usuário.
- Dados compartilhados entre dispositivos através do servidor e MySQL.
- Exportação de registros na versão inicial completa.
- Credenciais apenas em variáveis de ambiente; nunca no frontend ou no Git.

## Fora do primeiro ciclo

Alimentação, treino, biblioteca de livros, financeiro, notificações, integração com calendários, IA, calendário com blocos de duração, relatórios avançados e instalação como aplicativo.

## Critério de conclusão do primeiro ciclo

Planejar uma semana, acompanhar a rotina no celular, consultar dias anteriores e exportar os dados. A primeira entrega técnica é menor: criar e concluir uma tarefa salva no MySQL, localmente.
