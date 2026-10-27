# Publicação separada — sem ativação automática

Preparação em 26/10/2026. O código não muda DNS nem publica: o Render continua usando `npm run build` e `npm start`. Não contratar plano pago, Workers, banco ou outro domínio para esta etapa.

## Destinos

- `dayvilo.com.br`: apresentação e política estáticas no Cloudflare Pages Free.
- `app.dayvilo.com.br`: interface instalada e API no mesmo serviço Render atual; banco preservado. O servidor gratuito ainda pode dormir.
- Mesma propriedade GA4 (`G-XTJH73N306`), sem medição até aceitar. Preferências locais independentes por endereço; não prometer um funil completo de pessoas que recusaram ou bloquearam a medição. Eventos `open_app` e `start_signup` não significam login/cadastro concluído. Os cookies padrão do Google podem reconhecer o navegador entre subdomínios, mas não transferem autorização.

## Preparar Cloudflare Pages (Git)

1. Criar conta com dayviloapp@gmail.com e escolher Free. Em Workers & Pages, criar **Pages** conectado somente ao repositório Dayvilo; não escolher um Worker pago.
2. Branch de produção: a branch efetivamente usada no projeto. Diretório raiz: raiz do repositório. Comando: `npm run build:publico`. Diretório de saída: `client/dist-publico`.
3. Variáveis públicas de build: `NODE_VERSION=24`, `PUBLIC_ANALYTICS_ID=G-XTJH73N306`, `PUBLIC_CADASTRO_ABERTO=true` (manter igual à configuração real de cadastro do servidor), `PUBLIC_PRODUCTION_BRANCH` igual à branch de produção. Não copiar credenciais do Render/Aiven/Resend para o Pages.
4. Pré-visualizações de outras branches desativam Analytics e indexação. Conferir a apresentação no domínio temporário antes de mudar o DNS. O canonical aponta sempre para dayvilo.com.br.

## Ordem de ativação e DNS

1. Registrar uma cópia dos registros DNS atuais (inclusive MX, TXT/SPF, DKIM, DMARC, CAA e verificações). Identificar onde o domínio é administrado. Não apagar registros de e-mail.
2. Adicionar domínio à zona Cloudflare Free; comparar os registros importados com os originais. Para o domínio raiz no Pages, a documentação exige usar os nameservers da Cloudflare. Não alterar nameservers antes de conferir a cópia completa e DNSSEC, se existente.
3. No Render, adicionar `app.dayvilo.com.br` como domínio personalizado e criar o CNAME exato que o painel indicar, inicialmente DNS-only. Aguardar certificado. Não inferir o destino a partir de nomes de deploy.
4. Em janela curta de mudança, mudar `URL_APLICACAO` do Render para `https://app.dayvilo.com.br/` e publicar. O middleware aceita somente esse Host/Origin: o endereço antigo deixa de servir o app após essa mudança. Não ampliar CORS nem compartilhar cookie de sessão entre domínios.
5. Confirmar `/api/health`, entrar, criar/editar uma tarefa de teste, sair e testar recuperação no novo endereço. Conferir novos e-mails apontando para app.dayvilo.com.br. Confirmar cadastro aberto/fechado.
6. Associar `dayvilo.com.br` ao projeto Pages em Custom domains e aplicar os registros indicados. Acompanhar propagação e HTTPS. Essa mudança deve ocorrer junto do passo 4 para reduzir a indisponibilidade; não é uma migração sem interrupção garantida.
7. Conferir raiz, `/robots.txt`, `/sitemap.xml`, `/privacidade`, uma URL inexistente (404), botões e fragmentos legados. A apresentação não faz chamadas à API. Links antigos de confirmação/recuperação mantêm o token no fragmento e são encaminhados ao app antes da medição; sua validade original não é estendida.
8. Search Console: preservar a meta de verificação existente, testar URL publicada e só então validar a correção. Não há garantia de indexação imediata. Não remover a propriedade atual.

## Login, instalação e Analytics

Sessões e armazenamento local não migram entre origens. Será necessário entrar novamente. Preferências da conta armazenadas no banco permanecem; tema e preferências locais podem precisar ser escolhidos de novo.

A apresentação não oferece instalação própria. O manifesto do app permanece no Render. Um atalho antigo aberto em modo standalone encaminha ao novo app; conforme o navegador, pode abrir fora da janela instalada. Recomendar remover o atalho antigo e instalar novamente a partir de app.dayvilo.com.br. Conferir em celular e desktop antes de comunicar a troca.

No GA4, manter medição otimizada e publicidade conforme a política atual. Testar com recusado: nenhuma requisição ao Google; aceito: page_view e cliques; revogado: novas medições interrompidas. Verificar eventos no tempo real por hostname, sem tokens, e-mails, conteúdo pessoal nem parâmetros livres. Testar separadamente em ambos os endereços.

## Reversão

Guardar a configuração anterior do Render e DNS. Se o novo app não passar nos testes, restaurar `URL_APLICACAO=https://dayvilo.com.br/` e o apontamento anterior da raiz ao Render. Manter os dados do banco; não executar migrações ou restaurações. Não excluir o serviço original, os registros de e-mail ou o domínio durante a migração.

## Referências

- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/pages/platform/limits/
- https://render.com/docs/free

Pendências: criar/acessar conta Cloudflare, identificar provedor DNS, publicar, configurar domínio/certificados/Render e validar online. A preparação local não confirma nenhuma dessas etapas externas.
