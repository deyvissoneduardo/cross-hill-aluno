# Relatório do Run — agendamento-cliente/v1

> Relatório para revisão humana. Telemetria de pipeline (base_sha, retries, paralelismo, rule mining) vive em `_run/workflow-report.md`.

## 1. Resumo do Run

Status: 5/14 tasks concluídas · 0 bloqueadas · 9 aguardando desbloqueio (T5, T6 já liberadas)

| Task | Nome | Modelo | Arquivos | QA | Tech Review |
|------|------|--------|----------|-----|-------------|
| T1 | Configuração da suíte de testes web | sonnet | 4 criados, 2 mod | ✅ APROVADO | ✅ APROVADO_COM_OBSERVACOES |
| T2 | Contratos públicos de agendamento | sonnet | 2 criados, 0 mod | ✅ APROVADO | ✅ APROVADO_COM_OBSERVACOES |
| T3 | Validação do cliente e Firebase Admin server-only | sonnet→opus[xhigh] | 4 criados, 2 mod | ⚠️ APROVADO_COM_OBSERVACOES (após 3 tentativas + 1 correção extra autorizada) | ⚠️ APROVADO_COM_OBSERVACOES (após 3 tentativas + 1 correção extra autorizada) |
| T10 | Componentes UI globais Material Design 3 com Tailwind | opus (execução em 2 sessões) | 13 criados, 0 mod | ⚠️ APROVADO_COM_OBSERVACOES | ⚠️ APROVADO_COM_OBSERVACOES |
| T4 | Store Firestore transacional e fake determinístico | sonnet→opus[xhigh] | 2 criados, 0 mod | ⚠️ APROVADO_COM_OBSERVACOES (após 2 rejeições + 2 correções) | ⚠️ APROVADO_COM_OBSERVACOES (após 2 rejeições + 2 correções) |

## 2. Débitos Técnicos Não Resolvidos

> Anotados pela política débito-controlado (severidade baixa não bloqueia). Resolva tudo de uma vez com `/agent-spec-debt-resolution docs/specs/features/agendamento-cliente/v1/`.

### D1 · BAIXO · best_practices · T1 · Tech Review
- **Onde:** `.gitignore` (raiz do projeto)
- **Problema:** Artefatos gerados pelo Playwright não estão no `.gitignore`.
- **Impacto:** `playwright-report/` (e potencialmente `test-results/`/`blob-report/`) ficam sujeitos a serem commitados por acidente em um `git add -A` futuro.
- **O que fazer:** Adicionar `/playwright-report/` e `/test-results/` ao `.gitignore` (e `/blob-report/` se o projeto passar a usar blob reporter em CI).

### D2 · BAIXO · code_quality · T2 · Tech Review
- **Onde:** `app/agendamento/types.ts`
- **Problema:** `SolicitacaoAgendamento` (model) e `SolicitacaoAgendamentoDTO` são duas interfaces distintas com exatamente os mesmos campos, enquanto os outros 4 pares Model/DTO do tech_spec foram colapsados em um único tipo.
- **Impacto:** Baixo risco funcional (TS é estrutural). Custo de manutenção: assimetria não documentada.
- **O que fazer:** Padronizar a estratégia — `export type SolicitacaoAgendamentoDTO = SolicitacaoAgendamento` ou declarar os outros 4 DTOs como aliases explícitos, documentando a decisão.

### D3 · BAIXO · tests · T3 · QA
- **Onde:** `lib/firebase/admin.test.ts:228`
- **Problema:** Branch de desescape de `\n` da `FIREBASE_PRIVATE_KEY` não é morta por nenhum teste (confirmado por mutação — trocar o `.replace` por no-op mantém a suíte verde).
- **Impacto:** A lógica está correta hoje; falta a rede de detecção de regressão. Uma regressão aqui falha alto e cedo (boot do Firebase Admin), não silenciosamente.
- **O que fazer:** Converter o teste de inicialização feliz em `it.each` com duas variantes da chave (PEM com quebras reais vs. `\n` escapado literal).

### D4 · BAIXO · tests · T3 · QA
- **Onde:** `lib/firebase/admin.test.ts:297`
- **Problema:** Scanner anti-import client-side de CT-028 cobre `app/` e `lib/`, mas não `components/` — onde vivem os Client Components reais do repo.
- **Impacto:** Não é falha de segurança (a defesa primária é `import 'server-only'`, imposta pelo build); é um ponto cego de defesa em profundidade.
- **O que fazer:** Adicionar `components/` à lista de árvores varridas pelo scanner e estender a guarda de cobertura com um arquivo âncora dessa pasta.

### D5 · BAIXO · error_handling · T3 · Tech Review
- **Onde:** `lib/firebase/admin.ts:71-75`
- **Problema:** `FirebaseAdminConfigError` só cobre variável ausente; PEM malformado (presente mas inválido) escapa como `FirebaseAppError` cru do SDK.
- **Impacto:** Baixo em produção (sem vazamento de segredo); custo de contrato — consumidor precisa conhecer duas famílias de erro para a mesma causa-raiz.
- **O que fazer:** Envolver `initializeApp`/`cert` em try/catch e re-lançar como `FirebaseAdminConfigError`, com teste de PEM inválido.

### D6 · BAIXO · scope_deviation · T3 · Tech Review
- **Onde:** `package.json` / `package-lock.json`
- **Problema:** Dependências `firebase-admin` e `server-only` adicionadas sem constarem em §5.2 da task (declarada N/A).
- **Impacto:** Nenhum risco de runtime; custo de auditabilidade — alteração de manifesto avaliada caso a caso pelos gates em vez de conferência declarativa.
- **O que fazer:** Ajuste de processo — tasks que introduzem dependência de runtime devem listar `package.json`/lockfile em §5.2.

### D7 · BAIXO · project_pattern · T3 · Tech Review
- **Onde:** `lib/firebase/admin.test.ts:1`
- **Problema:** Teste co-locado ao lado do fonte, enquanto 6 de 7 suítes do repositório usam diretório `__tests__/`.
- **Impacto:** Descoberta de testes por convenção fica inconsistente.
- **O que fazer:** Mover para `lib/firebase/__tests__/admin.test.ts`, ou registrar a convenção de co-location em rule.

### D8 · BAIXO · code_quality · T3 · Tech Review
- **Onde:** `app/agendamento/validation/cliente.ts:39,50`, `lib/firebase/admin.test.ts:52,58`
- **Problema:** Identificadores alternam pt-BR/inglês sem critério, inclusive no mesmo arquivo.
- **Impacto:** Legibilidade e previsibilidade de busca por nome.
- **O que fazer:** Padronizar (recomendado: pt-BR integral, coerente com o domínio).

### D9 · BAIXO · code_quality · T10 · QA
- **Onde:** `components/ui/__tests__/buttons.test.tsx:33` (e replicado em `selection.test.tsx:56`, `feedback.test.tsx:25`)
- **Problema:** `beforeEach(() => cleanup())` duplicado idêntico em 3 arquivos de teste.
- **Impacto:** Padrão correto, só duplicação — débito trivial de manutenibilidade.
- **O que fazer:** Centralizar `cleanup()` em `vitest.setup.ts` para todos os testes que usam Testing Library.

### D10 · BAIXO · testability · T10 · Tech Review
- **Onde:** `components/ui/FormField.tsx`
- **Problema:** Componente com lógica condicional real (`aria-describedby` combinado, `aria-invalid`) sem cobertura de teste própria.
- **Impacto:** Risco baixo e mitigado — T14 prevê validação E2E de acessibilidade no fluxo real que usará `FormField`.
- **O que fazer:** Adicionar teste cobrindo `FormField` com hint+error simultâneos.

### D11 · BAIXO · code_quality · T10 · Tech Review
- **Onde:** `components/ui/PrimaryButton.tsx`, `components/ui/SecondaryButton.tsx`
- **Problema:** Duplicação estrutural quase integral entre os dois componentes.
- **Impacto:** Nenhum agora (2 instâncias); pode compor com uma 3ª variante futura de botão.
- **O que fazer:** Se surgir uma 3ª variante em T11-T14, extrair `BaseButton` interno compartilhado.

### D12 · BAIXO · code_quality · T10 · Tech Review
- **Onde:** `components/ui/SelectionCard.tsx`, `components/ui/TimeChip.tsx`
- **Problema:** Padrão de toggle acessível (`aria-pressed` + marcador oculto) reimplementado nos dois componentes.
- **Impacto:** Nenhum agora; risco de divergência se editado em só um lugar no futuro.
- **O que fazer:** Se surgir um 3º controle de seleção do tipo toggle, extrair hook `useToggleSelection`.

### D13 · BAIXO · testability · T4 · QA + Tech Review
- **Onde:** `lib/firebase/agendamentoStore.ts` (JSDoc de `FirestoreAgendamentoStore`)
- **Problema:** Nenhum teste atravessa a fronteira real do Firestore — toda a suíte exercita apenas `FakeAgendamentoStore`. Formalizado em nota técnica (não é lacuna implícita).
- **Impacto:** Um bug introduzido só na implementação Firestore real (operador de query trocado, campo invertido, status trocado) passaria despercebido. Mitigado por documentação explícita de riscos concretos; projeto não tem infraestrutura de emulador Firestore hoje.
- **O que fazer:** Quando o projeto configurar emulador Firestore, adicionar testes de integração espelhando CT-014/CT-025/CT-026 + cenário `SLOT_INDISPONIVEL` contra `FirestoreAgendamentoStore` real, então remover a nota técnica.

### D14 · BAIXO · testability · T4 · QA + Tech Review
- **Onde:** `lib/firebase/agendamentoStore.test.ts:137` (fake) vs. `lib/firebase/agendamentoStore.ts:351` (real)
- **Problema:** Predicado de rejeição por profissional divergente entre fake e real — o real rejeita quando `nome` está ausente/vazio; o fake só rejeita quando o registro não existe.
- **Impacto:** Baixo e confinado a documento Firestore malformado (campo obrigatório ausente); não afeta nenhum caminho hoje exercitado.
- **O que fazer:** Alinhar os predicados — fake passa a rejeitar `!profissional?.nome`, com seed `{ ...PROFISSIONAL_SEED, nome: '' }`.

### D15 · BAIXO · best_practices · T4 · Tech Review
- **Onde:** `lib/firebase/agendamentoStore.ts` (validação de elegibilidade transacional)
- **Problema:** A elegibilidade checa `disponibilidades.ativo`, mas não `profissionais.ativo` — um profissional desativado cujas disponibilidades futuras permaneçam ativas ainda aceitaria novas solicitações via chamada direta ao endpoint público.
- **Impacto:** Requer desalinhamento administrativo para se materializar; consequência é ruído no painel do admin, sem vazamento de dados nem escrita parcial. Não é requisito declarado no Aceite Técnico da T4.
- **O que fazer:** Incluir `profissionalDados?.ativo === true` na condição de elegibilidade (real e fake), com teste semeando profissional inativo + disponibilidade ativa.

## 3. Tasks Bloqueadas

✅ Nenhuma task bloqueada.

## 4. Notas para Revisão Humana

- **T3 foi desbloqueada nesta sessão**: havia esgotado as 3 tentativas normais e ficado `Bloqueado` (2 rejeições QA + 1 rejeição Tech Review) numa sessão anterior. O usuário havia autorizado, antes desta sessão, 1 correção EXTRA restrita aos 2 achados bloqueantes do Tech Review (falta de `import 'server-only'` + resolução implícita do app default via `existingApps[0]`). Ao retomar, confirmei que a correção já estava aplicada no código e a revalidei nos dois gates — ambos aprovaram com observações (débito baixo, D3-D8). Não houve necessidade de um novo ciclo de correção.
- **T10 foi retomada de execução parcial**: os 10 componentes existiam de uma sessão anterior (Status "Em Progresso"), mas faltavam os 3 arquivos de teste declarados. O usuário optou por completar a execução em vez de reexecutar do zero. Nenhum componente precisou de ajuste — todos já expunham a semântica acessível exigida pelos testes escritos nesta sessão.
- T3 e T10 rodaram em pipelines paralelos (paths disjuntos, sem símbolo em comum) — o QA de T3 observou e descartou corretamente 5 falhas transitórias em arquivos de T10 causadas pela escrita concorrente do executor de T10 na mesma árvore de trabalho; não afetaram o veredito de T3.
- T1 foi retomada de uma sessão anterior interrompida — o usuário optou por "Retomar nos gates" em vez de reexecutar do zero.
- O executor resolvido para todo o run é o fallback `__default__` (general-purpose) com a persona de `.claude/agents/agent-react-specialist.md` injetada — decidido numa sessão anterior e mantido para consistência.
- T10 usa tokens do `design-system.md` que ainda não existem em `app/globals.css` — isso é esperado: T14 é explicitamente responsável por popular os tokens dark-first; não é uma falha de T10.
- `vitest.setup.ts` foi criado fora da lista declarada em §5.1 da T1 (necessário para os matchers do `@testing-library/jest-dom`) — avaliado como craft legítimo, não desvio de escopo.
- **T4 passou por 2 ciclos de correção dentro do limite normal de 3 tentativas** (sem precisar de concessão extra como T3): 1ª rejeição do QA (nenhum teste exercitava a implementação Firestore real, só o fake) corrigida com nota técnica formal documentando o débito; 2ª rejeição do Tech Review (validação de elegibilidade do horário ausente — regra de negócio real e explícita na task/tech_spec, não estilo) corrigida adicionando a leitura de disponibilidade dentro da transação, nas duas implementações da porta. Ambas as correções foram genuínas — a segunda, inclusive, expôs e corrigiu de quebra um bug real de ordenação em `listarDiasLiberados` do fake, via TDD.
- T4 rodou em paralelo com o Gate 2 de T10 (paths disjuntos, sem símbolo em comum) sem qualquer interferência entre os dois pipelines.
