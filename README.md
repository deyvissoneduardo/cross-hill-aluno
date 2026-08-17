# Academia CrossHill — Aluno

> Área do cliente da Academia CrossHill para solicitar um horário de treino sem criar conta, login ou cadastro — direto pelo celular.

> ⚠️ Adicionar screenshot ou GIF de demonstração do fluxo (ex.: `public/demo.png`).

## Sobre

Este projeto é a frente voltada ao aluno/cliente de um sistema de agendamento simples. O cliente não possui conta, senha ou perfil: informa apenas nome e telefone, escolhe um profissional ativo, um dia liberado pelo administrador e um horário disponível, revisa os dados e confirma. O agendamento nasce sempre como `AGUARDANDO_CONFIRMACAO` — a confirmação definitiva é manual, feita pelo administrador fora desta frente.

A disponibilidade e as regras de conflito (mesmo horário, mesmo telefone no mesmo dia) são resolvidas com transação atômica no Firestore, garantindo que dois clientes não reservem o mesmo horário mesmo em acesso simultâneo.

## Features

- Fluxo linear em 3 telas: identificação (nome + telefone) → escolha de profissional/data/horário → confirmação.
- Exibe apenas profissionais ativos, dias liberados pelo administrador e horários realmente disponíveis.
- Bloqueia duplicidade: mesmo telefone não agenda duas vezes no mesmo dia; dois clientes não reservam o mesmo horário.
- Revalida a disponibilidade em transação Firestore no momento da confirmação (proteção contra concorrência).
- Tela de sucesso com textos, regras e avisos carregados de configuração administrativa no Firebase.
- Interface mobile-first, dark theme, seguindo Material Design 3.

## Pré-requisitos

- Node.js >= 20.9.0
- Projeto Firebase com Firestore e uma conta de serviço (Admin SDK)

## Como rodar

```bash
npm ci
cp .env.example .env.local
# preencher .env.local com as credenciais da conta de serviço Firebase
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Configuração

Variáveis de ambiente (ver `.env.example`):

| Variável | Default | Descrição |
|----------|---------|-----------|
| `FIREBASE_PROJECT_ID` | — | ID do projeto Firebase. |
| `FIREBASE_CLIENT_EMAIL` | — | E-mail da conta de serviço do Firebase Admin SDK. |
| `FIREBASE_PRIVATE_KEY` | — | Chave privada PEM da conta de serviço, com quebras de linha escapadas como `\n`. |
| `PORT` | `3000` | Porta usada pelo servidor de dev e pelo Playwright. |

Essas credenciais são usadas apenas no servidor (`server-only`) — nunca prefixe variáveis Firebase com `NEXT_PUBLIC_` neste projeto.

## Build / Deploy

```bash
npm run build
npm run start
```

## Testes

```bash
npm run test       # testes unitários/integração (Vitest)
npm run test:watch # modo watch
npm run test:e2e   # end-to-end (Playwright)
```

## Contribuindo

Rode `npm run lint` e `npm run test` antes de abrir um PR. Não há `CONTRIBUTING.md` neste repositório ainda.

## Licença

Repositório privado, sem arquivo `LICENSE` definido.
