# Dayvilo

Organizador pessoal web, começando pela rotina diária.

## Objetivo

Planejar o dia com uma lista flexível, horários opcionais e tarefas recorrentes. Primeiro para uso pessoal; depois, para outras pessoas.

## Tecnologias aprovadas

- React com JavaScript e Vite na interface.
- CSS próprio, seguindo a prévia aprovada.
- Node.js com Express no servidor.
- MySQL para persistência.
- Aplicação web responsiva, sem PWA.

## Organização

- `client/`: interface React.
- `server/`: API Express e conexão com MySQL.
- `docs/`: escopo e decisões.

## Desenvolvimento incremental

Cada mudança coerente recebe um commit. Os pushes enviam os commits para o GitHub, preservando o histórico. Credenciais e dados pessoais não pertencem ao repositório.

Consulte [o escopo aprovado](docs/escopo.md), [as etapas de desenvolvimento](docs/etapas.md) e [as instruções para rodar localmente](docs/desenvolvimento.md).

## Estado atual

Estrutura inicial React/Express e navegação visual aprovadas. Cadastro de tarefas, persistência no MySQL e autenticação ainda serão implementados. O repositório público não significa que a aplicação já esteja publicada.
