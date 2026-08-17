<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CLAUDE.md

## Visão do Projeto
Frente do cliente/aluno de um sistema de agendamento para a Academia CrossHill. Sem conta, login ou cadastro — o cliente informa só nome e telefone. Escopo real é o v1 descrito em `docs/prds/features/agendamento-cliente/v1/prd.md`; `aluno.md` é a spec de produto original e diverge da arquitetura implementada (ver "Onde coisas novas vão").

## Stack
- Next.js 16.3.0 (App Router) + React 19.2.8 + TypeScript strict + Tailwind v4
- Firebase Admin SDK (Firestore) — acesso sempre server-only, nunca SDK client
- Estado local de fluxo: reducer + Context (`useAppointmentFlow`) — NÃO usar Redux/Zustand
- Testes: Vitest (unit/integration) + Playwright (e2e)
- Gerenciador de pacotes: npm (não há `.nvmrc`/`engines` declarado)

## Como rodar
- Install: `npm ci`
- Dev: `npm run dev`
- Lint: `npm run lint` (só presets padrão `eslint-config-next` — sem regra customizada)
- Typecheck: `npx tsc --noEmit` (não há script dedicado; `noEmit: true` no tsconfig)
- Testes: `npm run test` / `npm run test:watch`
- E2E: `npm run test:e2e`
- Build/Start: `npm run build` / `npm run start`

## Regras de comportamento (não negocie)
1. **Incerteza → leia o arquivo ou rode `grep`. Nunca chute.** Se não achou (função, campo, API, arquivo), diga que não achou.
2. **Menor delta possível.** Resolva só o pedido. Oportunidade de melhoria fora do escopo → reporte separado, não execute sem pedir.
3. **Não toque em código fora do escopo sem autorização explícita.** Viu algo errado → sinalize, não conserte por conta própria.
4. **"Funciona" só com evidência.** Ao afirmar que algo funciona, mostre o output do comando/teste. Não rodou → diga "não rodei".
5. **Ações destrutivas exigem confirmação prévia.** Migração de schema, delete em massa, mudança de CI/auth → confirme antes de executar.

## Convenções
- Componentes de UI e state NUNCA importam Firebase nem chamam `fetch` direto — sempre via repository (client) ou `AgendamentoStore` (server).
- Todo módulo server-only começa com `import 'server-only'` como primeira linha (força erro de build se importado do client).
- Validação de nome/telefone (`app/agendamento/validation/cliente.ts`) roda na UI só para UX — o servidor SEMPRE revalida os mesmos campos e nunca confia em valor calculado enviado pelo client (ex.: `telefoneNormalizado` do payload).
- Escrita de agendamento é sempre `runTransaction` do Firestore, revalidando elegibilidade do horário, slot já `CONFIRMADO` e duplicidade diária de telefone antes de qualquer `transaction.set`.
- Todo agendamento nasce `AGUARDANDO_CONFIRMACAO`; nunca criar já `CONFIRMADO`. `CANCELADO` não conta para a regra de duplicidade diária.
- Erros de domínio nunca vazam mensagem/stack interno ao cliente público — sempre mapear para o contrato estável via `mapearErroDominioAgendamento`.
- Repository é um arquivo por recurso, exportando objeto singleton (`xRepository = {...}`) — decisão deliberada contra um HTTP client genérico compartilhado (ver comentário em `disponibilidadeRepository.ts`).

## Onde coisas novas vão
- Componente de UI genérico/reutilizável → `components/ui/*.tsx`.
- Tela/step do fluxo de agendamento → `app/agendamento/components/*.tsx` (um arquivo por step).
- Nova chamada de rede do cliente → `app/agendamento/repositories/*.ts`, nunca `fetch` direto no componente.
- Nova rota pública → `app/api/public/<recurso>/route.ts` (dinâmica: `[param]/<subrecurso>/route.ts`), com `errors.ts`/`rateLimit.ts` colocados junto quando necessário.
- Regra de negócio que toca Firestore → `lib/firebase/agendamentoStore.ts` (a porta `AgendamentoStore`); nunca SDK Firestore direto em route handler.
- Tipos/DTOs da feature → `app/agendamento/types.ts`.
- **Não siga `aluno.md` como estrutura de pastas** (sugere `src/features/...`, `src/repositories`, etc.) — é doc de especificação de produto, não reflete a árvore real (`app/agendamento/*`, sem `src/`).

## Testing & Quality Bar
- Testes colocados por camada: `__tests__/` dentro da pasta testada; route handler usa `route.test.ts`/`route.rules.test.ts` como arquivo irmão.
- Teste de módulo server-only mocka `vi.mock('server-only', () => ({}))` como primeira linha.
- Não há emulador Firestore configurado — testes cobrem só o fake in-memory de `AgendamentoStore`; a implementação Firestore real não é exercitada por teste automatizado. Não afirme cobertura que essa lacuna contradiz.
- Regra de negócio crítica nova → adicionar teste com ID rastreável no padrão `CT-0XX` (já usado em ~30 casos existentes).

<!-- Itere este arquivo: erro que estava neste contrato → fortaleça a regra existente;
     erro que NÃO estava → adicione uma regra nova. O arquivo cresce com o uso, não de uma vez. -->
