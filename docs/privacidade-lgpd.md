# Privacidade e LGPD no Dayvilo

Revisão inicial: 22/10/2026. Documento de acompanhamento, não certificação de conformidade nem inventário completo das operações.

Responsável informado: Otávio Volpe Leal (pessoa física). Contato: dayviloapp@gmail.com. Manter esses dados atualizados quando mudar a responsabilidade pelo projeto.

## Base implementada

- Política pública de privacidade e cookies, com acesso no cadastro, apresentação, Minha conta e preferências de medição.
- Analytics condicionado à escolha opcional do navegador, com recusa e revogação; eventos limitados, sem conteúdo pessoal das áreas. Configurações externas do GA4 precisam continuar coerentes com o código e a política.
- Correção de perfil, troca de senha e e-mail; exclusão da conta com senha, confirmação explícita, sessão e CSRF, em transação. Exclusão no banco ativo e revogação de sessões/tokens verificadas com dados sintéticos em instância descartável.
- Canal de atendimento para direitos. Existência do canal não demonstra, por si só, processo operacional de resposta ou cumprimento de prazos.

## Pendências para avaliação e implementação por etapas

1. **Inventário e bases legais:** documentar operações, categorias, finalidade, fundamento, responsáveis, fornecedores, destino e conservação. Avaliar especialmente treino, alimentação e textos livres que possam revelar saúde. Não presumir que execução de contrato cubra dados sensíveis ou que um aviso para evitar dados clínicos resolva o tratamento efetivo.
2. **Retenção e backups:** definir e implementar prazos proporcionais para dados, tokens expirados, feedbacks, logs e cópias. Hoje os backups não têm expiração automática. Definir procedimento para que uma restauração não reative contas/dados excluídos; qualquer registro mínimo necessário para isso também exige finalidade, acesso restrito e retenção definida. Não apagar backups existentes sem decisão explícita do responsável.
3. **Fornecedores e transferências:** conferir configurações e condições de Render, Aiven, Resend, Google e eventuais locais de cópia; registrar regiões reais, contratos e mecanismo de transferência aplicável. Não presumir garantias apenas porque o fornecedor tem política de privacidade.
4. **Direitos dos titulares:** definir fluxo de recebimento, verificação proporcional de identidade, resposta, cópia de dados, exclusões fora do banco ativo e registro mínimo do atendimento. Conferir prazos aplicáveis em fonte oficial; não exigir senha ou documentos desnecessários por e-mail.
5. **Segurança e incidentes:** revisar acessos administrativos, autenticação dos serviços, segredos, logs, atualizações e testes de restauração. Documentar detecção, contenção, avaliação, registro e eventual comunicação de incidentes conforme requisitos vigentes.
6. **Público e governança:** definir público etário, avaliar regras para menores e enquadramento do projeto nas normas da ANPD, incluindo eventual dispensa de encarregado. Não presumir dispensa geral por ser pessoa física ou projeto pequeno.
7. **Medição:** confirmar retenção real da propriedade GA4 e demais opções externas, documentar as escolhas e refletir prazos na política; não confundir validade do cookie com retenção no Google.

Prioridade sugerida: inventário e dados potencialmente sensíveis, retenção/exclusão em backups, depois fornecedores, atendimento e incidentes. Ajustar a prioridade se a avaliação identificar risco mais urgente. Revisão jurídica especializada é indicada para validar fundamentos, transferências e requisitos específicos; textos e controles técnicos isolados não asseguram conformidade integral.

## Revisão a cada entrega

Registrar apenas o que mudou: dados/finalidade; necessidade; fundamento e escolha do usuário; destinatários; retenção; controles de acesso; impacto em exclusão/exportação; política/avisos alterados; testes e pendências. Se não houve mudança no tratamento, basta indicar isso quando relevante. Não apresentar funcionalidades planejadas como implementadas.

## Acompanhamento de entregas

### Preparação de hospedagem pública separada — 26/10/2026

- Build estático independente para Cloudflare Pages; ainda depende de conta, DNS e ativação externa. Render/API/Aiven mantidos. Nenhum dado da conta ou segredo é copiado para o pacote público. Cloudflare passa a tratar requisições técnicas da apresentação quando ativado; registrar configurações e condições reais do fornecedor antes da publicação, sem pressupor certificação ou região brasileira.
- Política versão 6 inclui o fornecedor e explica escolhas independentes por origem. Não houve nova tabela ou mudança em retenção/exclusão da conta. O cookie de sessão continua restrito ao host do aplicativo. Usuários precisarão autenticar novamente no subdomínio; preferências locais não migram.
- Analytics compartilhado na mesma propriedade, condicionado ao consentimento em cada endereço. Novo evento fixo `open_app`; `start_signup` já existente. Sem parâmetros livres, tokens ou conteúdo pessoal. Redirecionamentos de links antigos mantêm tokens somente no fragmento antes de montar o painel de medição. Pré-visualizações não ativam Analytics.
- Plano operacional e verificações em `docs/publicacao-separada.md`. Medição, DNS, certificados, migração dos atalhos instalados e indexação precisam ser conferidos após a ativação; não estão comprovados apenas pelo build local.

### Entrega de 23/10/2026 — meta semanal opcional

- Uma meta ativa por conta: tipo, título e frequência de 1 a 7 dias. Metas automáticas consultam datas planejadas de tarefas concluídas da semana; a personalizada guarda até sete marcações manuais. Finalidade: acompanhar o compromisso escolhido pelo usuário, dentro da funcionalidade de organização solicitada.
- Configuração e marcações ficam no banco, isoladas pelo usuário da sessão, com CSRF nas alterações. Não há novos cookies, fornecedores ou eventos de Analytics; título, tipo e marcações não são enviados à medição.
- Configuração mantida até alteração, remoção da meta ou exclusão da conta. Não há histórico separado de conquistas; a semana manual anterior é substituída na primeira marcação da nova semana. Editar a meta limpa marcações manuais. Remover a meta preserva as tarefas das áreas. Backups seguem as pendências gerais acima.
- Política pública atualizada para versão 3. Nome personalizado pode conter dados sensíveis, como outros campos livres; aviso para evitar dados clínicos não substitui a avaliação das bases e demais pendências já registradas.
- Verificação em MySQL descartável: autenticação, CSRF, isolamento, contagem por dias, virada semanal, marcações concorrentes, remoção e exclusão de conta com rollback e preservação de outra conta. Exportação completa por solicitação deve incluir `metas_semanais`; o CSV de tarefas continua limitado ao histórico de tarefas.

### Reorganização de Metas — 23/10/2026

A configuração e as marcações existentes passaram para a seção Metas; a Rotina exibe um resumo. A seção pode ser escolhida como atalho na preferência já existente por conta. Nenhuma nova tabela, categoria de dado ou regra de retenção. O acesso à área usa a medição de páginas já condicionada ao consentimento, com o nome fixo “Metas”, sem título pessoal ou progresso. A política pública permanece na versão 3, pois as finalidades e controles já descritos continuam os mesmos.

### Missões semanais e mensais — 23/10/2026

- Metas opcionais, até 12 por conta, com tipo, título, período, medida (dias ou conclusões), quantidade, origem e versão para impedir sobrescritas. A finalidade permanece acompanhar compromissos escolhidos pelo titular. Sem novos destinatários, cookies, eventos de medição ou envio de conteúdo pessoal ao Analytics.
- A tabela `metas` preserva a configuração enquanto a meta existir. Marcações manuais guardam somente o último período registrado e são substituídas na primeira marcação da nova semana/mês. Mudar tipo, período ou medida limpa as marcações; mudar só nome ou quantidade as mantém. Não há histórico separado de conquistas nem jardim nesta entrega.
- Migrações 031–032 criam a estrutura e copiam a meta anterior, mantendo sua medida em dias e as marcações existentes. A tabela antiga permanece para compatibilidade durante a publicação; a cópia da meta migrada é removida na primeira alteração/remoção pelo novo fluxo ou na exclusão da conta.
- Sessão, CSRF, vínculo de conta, validação, limite e versões aplicados no servidor. Exclusão de conta remove as duas tabelas por CASCADE. Política pública versão 4; exportação integral por solicitação deve considerar `metas` e eventuais dados legados.
- Verificação: 68 testes unitários; integração em MySQL descartável com ANSI_QUOTES (migração com dados anteriores, semana/mês, contagens e desfazer, isolamento, CSRF, conflitos, marcações, remoção, exclusão e rollback); build e teste visual mobile/desktop. Pendências gerais de dados sensíveis, backups e fornecedores continuam acima.

## Referências oficiais

- [LGPD — texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares)
- [ANPD — segurança e modelo de registro de operações](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte)
- [ANPD — agentes de pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)

Consultar versões vigentes ao tomar decisões. Nenhuma pendência listada aqui foi resolvida apenas pela criação deste documento.

### Meu jardim — 24/10/2026

Histórico mínimo em jardim_conquistas (conta, identificador da meta, início/fim do período, data do registro), para guardar plantas e impedir duplicação por edição/desfazer. Uma planta a cada cinco registros; coleção derivada do histórico. Sem títulos, conteúdo, novos destinatários, cookies ou eventos Analytics. Dados privados da conta; persistem após excluir uma meta e são removidos por CASCADE ao excluir a conta. Exportação integral por solicitação deve incluir essa tabela. Política versão 5. Backups e demais pendências gerais continuam aplicáveis. Registro ocorre ao abrir Rotina/Metas e alterar metas, considerando períodos atuais; não há recuperação automática de períodos antigos.

Validação desta entrega: 68 testes unitários e integração em MySQL descartável passaram (incluindo ANSI_QUOTES, concorrência, desfazer/refazer, períodos sobrepostos, virada semanal, isolamento, CSRF, exclusão e rollback). Build aprovado; jardim e animação conferidos no desktop e celular. Migração 033 aplicada no Aiven após SHA-256 e restauração validada do backup de 24/10/2026.

### Minha árvore — 24/10/2026

Troca visual da coleção por uma árvore única, derivada do total já existente. Sem migração, novos dados, cookies ou eventos. Histórico, isolamento e exclusão continuam iguais. Política mantém versão 5, com ajuste de nomenclatura para árvore. O desenho atinge a fase florida em 30 conquistas; contagem e ciclos permanecem cumulativos.

### Biblioteca visual — 25/10/2026

Redesenho local da Leitura: capas tipográficas derivadas de título/autor já cadastrados, destaque de um livro em andamento e filtro Todos. Sem upload, busca externa de capas, novos dados, eventos ou destinatários. Fluxos existentes de páginas, anotações, agendamento e exclusão preservados. Sem migração ou alteração da política pública. Validação em instância descartável com dados fictícios: progresso e agendamento salvos; layout desktop e mobile conferidos.
