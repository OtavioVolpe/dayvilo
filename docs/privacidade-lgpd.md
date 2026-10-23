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

## Referências oficiais

- [LGPD — texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares)
- [ANPD — segurança e modelo de registro de operações](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte)
- [ANPD — agentes de pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)

Consultar versões vigentes ao tomar decisões. Nenhuma pendência listada aqui foi resolvida apenas pela criação deste documento.
