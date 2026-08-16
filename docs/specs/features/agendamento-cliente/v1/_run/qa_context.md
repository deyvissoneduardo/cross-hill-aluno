# QA Context — Agendamento do cliente sem conta / v1

## Stack
- Next.js App Router 16.3, React 19.2.8, TypeScript strict, Tailwind CSS 4.
- Testes novos: Vitest + Testing Library + user-event + jsdom, MSW para fronteira HTTP e Playwright para E2E.
- Firestore fica server-side em `lib/firebase/*`; Client Components e repositories não acessam credenciais.

## Componentes e Camadas
- `lib/firebase/admin.ts`: inicialização server-only com `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- `lib/firebase/agendamentoStore.ts`: porta/adapter com fake transacional determinístico em testes.
- `app/api/public/**/route.ts`: BFF público mínimo.
- `app/agendamento/repositories/*.ts`: clients `fetch` tipados.
- `app/agendamento/state/*`: provider/reducer local.
- `components/ui/*`: componentes Tailwind com linguagem Material Design 3.
- `app/agendamento/components/*`: etapas do fluxo.
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`: integração da rota pública.

## CA → CT
- CA-01: CT-001
- CA-02: CT-002, CT-004
- CA-03: CT-003, CT-004, CT-017
- CA-04: CT-005, CT-006, CT-017
- CA-05: CT-007, CT-008, CT-017
- CA-06: CT-009, CT-010, CT-017
- CA-07: CT-011, CT-026
- CA-08: CT-012
- CA-09: CT-013, CT-025
- CA-10: CT-014
- CA-11: CT-015, CT-016, CT-017
- CA-12: CT-011, CT-017, CT-018, CT-024
- CA-13: CT-019
- CA-14: CT-020
- CA-15: CT-006, CT-011, CT-021, CT-024, CT-026
- CA-16: CT-022, CT-023
- CA-17: CT-017, CT-019, CT-020

## Regras Críticas
- Solicitação de Agendamento nasce `AGUARDANDO_CONFIRMACAO`.
- Pendentes concorrentes no mesmo slot são permitidos para telefones diferentes.
- Mesmo telefone não pode ter duas solicitações ativas no mesmo dia.
- Slot confirmado bloqueia novas solicitações.
- Endpoint público POST tem antiabuso por IP + telefone e erro genérico.
- Nenhuma resposta pública expõe dados, contadores ou detalhes de terceiros.
