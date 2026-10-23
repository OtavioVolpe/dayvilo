# Orientações permanentes do Dayvilo

## Privacidade por padrão

Por solicitação de Otávio, considerar privacidade e LGPD em toda funcionalidade, integração, correção ou mudança de infraestrutura. Consultar `docs/privacidade-lgpd.md` e o comportamento real do código antes de alterar o tratamento de dados.

- Identificar novos dados, finalidade, necessidade, fundamento aplicável, acesso, destinatários e prazo de conservação. Não coletar dados extras por conveniência.
- Conferir isolamento entre contas, autorização no servidor, proteção de credenciais, logs sem dados pessoais desnecessários e consequências para acesso, correção e exclusão.
- Ao criar tabelas ou relações, integrar e testar a exclusão de conta, inclusive rollback e preservação de outras contas. Não deixar registros pessoais órfãos.
- Para cookies, Analytics, anúncios, afiliados, login social, notificações e fornecedores, revisar transparência, necessidade de consentimento, revogação e eventual transferência internacional antes da ativação. Consentimento não é obrigatório para todo tratamento nem pode ser presumido pelo uso do site.
- Não enviar dados sensíveis, identificadores pessoais, textos livres ou tokens a ferramentas de medição. Avaliar separadamente dados que possam revelar saúde e tratamento envolvendo crianças/adolescentes; um aviso na política não resolve esses requisitos.
- Quando mudar o tratamento, atualizar a política pública (`client/public/privacidade.html`), versão/data, avisos e preferências pertinentes na mesma entrega. Não alterar a política em mudanças puramente visuais sem efeito sobre dados.
- Manter `docs/privacidade-lgpd.md` coerente com implementação e evidências. Distinguir concluído, pendente e dependente de decisão operacional/jurídica. Não inventar prazos de retenção, contratos, consentimentos ou garantias.
- Consultar fontes oficiais atuais para conclusões legais. Não afirmar conformidade integral ou certificação sem avaliação suficiente; sinalizar dúvidas concretas para decisão do responsável e eventual revisão jurídica.
- Ao finalizar trabalho com impacto em dados, explicar brevemente o impacto, as medidas implementadas e pendências relevantes. Não exigir nova autorização para revisões e correções já abrangidas pelo pedido.

O usuário prefere mudanças em etapas para fazer os commits manualmente. Não fazer commit/push automaticamente.

## Migrações autorizadas

Otávio autorizou executar as migrações necessárias às funcionalidades solicitadas, inclusive no banco online. Antes de aplicar: revisar o SQL e o destino, criar backup com `server/scripts/backup-online.js` e validar SHA-256 e restauração com `server/scripts/verificar-backup.js` usando o caminho exato do novo SQL. Usar as credenciais privadas locais sem exibi-las e o migrador do projeto. Nunca restaurar o backup no Aiven ou no banco de desenvolvimento, nem excluir backups anteriores. Se backup, validação ou conexão falharem, não aplicar a migração; informar o impedimento. Mudanças destrutivas fora do escopo solicitado continuam exigindo avaliação específica. Ao finalizar, informar o resultado e lembrar de copiar os arquivos do backup para o Drive privado.
