# Relatório do Run — agendamento-cliente/v1

> Relatório para revisão humana. Telemetria de pipeline (base_sha, retries, paralelismo, rule mining) vive em `_run/workflow-report.md`.

## 1. Resumo do Run

Status: 14/14 tasks concluídas · 0 bloqueadas · 0 aguardando desbloqueio (feature concluída)

| Task | Nome | Modelo | Arquivos | QA | Tech Review |
|------|------|--------|----------|-----|-------------|
| T1 | Configuração da suíte de testes web | sonnet | 4 criados, 2 mod | ✅ APROVADO | ✅ APROVADO_COM_OBSERVACOES |
| T2 | Contratos públicos de agendamento | sonnet | 2 criados, 0 mod | ✅ APROVADO | ✅ APROVADO_COM_OBSERVACOES |
| T3 | Validação do cliente e Firebase Admin server-only | sonnet→opus[xhigh] | 4 criados, 2 mod | ⚠️ APROVADO_COM_OBSERVACOES (após 3 tentativas + 1 correção extra autorizada) | ⚠️ APROVADO_COM_OBSERVACOES (após 3 tentativas + 1 correção extra autorizada) |
| T10 | Componentes UI globais Material Design 3 com Tailwind | opus (execução em 2 sessões) | 13 criados, 0 mod | ⚠️ APROVADO_COM_OBSERVACOES | ⚠️ APROVADO_COM_OBSERVACOES |
| T4 | Store Firestore transacional e fake determinístico | sonnet→opus[xhigh] | 2 criados, 0 mod | ⚠️ APROVADO_COM_OBSERVACOES (após 2 rejeições + 2 correções) | ⚠️ APROVADO_COM_OBSERVACOES (após 2 rejeições + 2 correções) |
| T5 | BFF público de leitura | sonnet | 8 criados, 0 mod | ✅ APROVADO | ⚠️ APROVADO_COM_OBSERVACOES |
| T6 | Contrato de erros públicos e antiabuso do POST | sonnet→opus[xhigh] | 3 criados, 2 mod | ⚠️ APROVADO_COM_OBSERVACOES (revalidação após 1 rejeição QA + 1 rejeição Tech Review) | ⚠️ APROVADO_COM_OBSERVACOES (após 1 rejeição + 1 correção) |
| T7 | POST público de agendamento: validação e caminho feliz | sonnet→opus[xhigh] | 2 criados, 6 mod (4 fora do escopo declarado — causa-raiz em T3/T4/T6) | ✅ APROVADO (após 2 revalidações) | ⚠️ APROVADO_COM_OBSERVACOES (após 3 tentativas — 2 ALTO security + 1 MEDIO security) |
| T8 | POST público de agendamento: concorrência e duplicidade | sonnet | 1 criado, 0 mod | ✅ APROVADO | ✅ APROVADO |
| T9 | Repositories client-side tipados | sonnet | 6 criados, 1 mod | ⚠️ APROVADO_COM_OBSERVACOES | — (gates=[qa]) |
| T11 | Estado local e etapa de identificação | sonnet | 6 criados, 1 mod | ✅ APROVADO | ✅ APROVADO |
| T12 | Etapa de escolha de profissional, dia e horário | sonnet | 2 criados, 3 mod | ✅ APROVADO | ✅ APROVADO |
| T13 | Revisão, envio e sucesso aguardando confirmação | sonnet | 4 criados, 3 mod | ✅ APROVADO | ✅ APROVADO |
| T14 | Integração da rota pública e validação E2E | sonnet | 2 criados, 4 mod | ✅ APROVADO | ✅ APROVADO |

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

### D16 · BAIXO · code_quality · T5 · Tech Review
- **Onde:** `app/api/public/profissionais/**`, `app/api/public/configuracao/**` (bloco de erro 500 dos handlers de leitura)
- **Problema:** Bloco de tratamento de erro 500 duplicado de forma idêntica em 3 dos 4 Route Handlers.
- **Impacto:** Nenhum agora (4 rotas); duplicação vira custo de manutenção se surgir uma 5ª rota com o mesmo padrão.
- **O que fazer:** Extrair helper compartilhado (ex.: `respostaErroInterno()`) se/quando uma 5ª rota pública de leitura for criada.

### D17 · BAIXO · error_handling · T5 · Tech Review
- **Onde:** `app/api/public/configuracao/route.ts`
- **Problema:** Handler de configuração sem try/catch defensivo; a garantia de não-falha é apenas documentada em JSDoc, não encodificada pelo compilador.
- **Impacto:** Baixo — se uma dependência futura do handler passar a poder lançar, o erro não seria capturado no formato de contrato público.
- **O que fazer:** Adicionar try/catch simétrico aos demais handlers, convertendo o contrato documental em garantia de código.

### D18 · BAIXO · tests · T6 · QA
- **Onde:** `app/api/public/agendamentos/errors.ts:117`
- **Problema:** `mapearErroDominioAgendamento` (traduz `SlotIndisponivelError`/`TelefoneDuplicadoNoDiaError` de T4 para o contrato público) não tem teste unitário de acoplamento — só os erros já mapeados são testados isoladamente em `rateLimit.test.ts`.
- **Impacto:** Se a ordem dos `instanceof` for trocada ou um novo erro de domínio for adicionado sem atualizar o mapeamento, nada pega a regressão antes do Route Handler (T7/T8) chegar.
- **O que fazer:** Ao criar `errors.test.ts` em T7/T8, cobrir os 3 ramos: `SlotIndisponivelError` → `SLOT_INDISPONIVEL`, `TelefoneDuplicadoNoDiaError` → `TELEFONE_DUPLICADO_NO_DIA`, erro desconhecido → `ERRO_SERVIDOR`.

### D19 · BAIXO · performance · T6 · Tech Review
- **Onde:** `app/api/public/agendamentos/rateLimit.ts:107`
- **Problema:** O `Map` de contagem do limitador antiabuso cresce monotonicamente — nenhum caminho remove uma entrada quando sua janela expira, mesmo com o singleton de escopo de módulo fixado nesta task.
- **Impacto:** Desprezível em v1 (processo único, tráfego de uma academia); risco só materializa em deploy longevo exposto à internet — crescimento de heap sem teto, proporcional ao histórico de chamadores, não ao tráfego ativo. Chave composta IP+telefone é mandatada pelo tech_spec §10.2.1, não é desvio do executor.
- **O que fazer:** Podar a entrada (`tentativasPorChave.delete(chave)`) quando o array filtrado ficar vazio, ou migrar a contagem para storage compartilhado com TTL nativo (mitigação já prevista na nota técnica do arquivo para o problema de multi-instância).

### D20 · BAIXO · security · T7 · Tech Review
- **Onde:** `app/api/public/agendamentos/rateLimit.ts:35` (JSDoc — nota de risco residual)
- **Problema:** A nota de risco residual do limitador antiabuso documenta apenas a rota de escape por rotação simultânea de IP+telefone, mas omite que a dimensão "só por telefone" (introduzida para fechar essa rota) cria um orçamento compartilhado: quem conhece o telefone de um cliente real pode gastar o limite dele com requisições válidas, causando lockout temporário direcionado.
- **Impacto:** Baixo — dominado pelo que T4 já garante (uma única solicitação aceita bloqueia o telefone o dia inteiro via duplicidade diária, efeito pior que o lockout de 1 minuto do limitador). Custo é de fidelidade do registro para calibração futura.
- **O que fazer:** Acrescentar a explicação do tradeoff (orçamento compartilhado por telefone) à seção "Risco residual assumido" do JSDoc.

### D21 · BAIXO · performance · T7 · Tech Review
- **Onde:** `app/api/public/agendamentos/rateLimit.ts:41-56`
- **Problema:** A NOTA TÉCNICA do limitador não registra que `tentativasPorChave` nunca remove uma entrada quando sua janela expira — débito pré-existente de T6, agravado por esta task (2 chaves por tentativa em vez de 1).
- **Impacto:** Crescimento monotônico do Map até restart do processo; desprezível em deploy serverless, vazamento lento em processo Node de vida longa.
- **O que fazer:** Registrar o ponto na NOTA TÉCNICA e, opcionalmente, podar a entrada quando o array filtrado ficar vazio (mesma correção sugerida em D19).

### D22 · BAIXO · security · T7 · Tech Review
- **Onde:** `lib/firebase/agendamentoStore.ts:87-92` (`comoIdDeDocumento`) e `app/api/public/agendamentos/route.ts:111` (`FORMATO_PROFISSIONAL_ID`)
- **Problema:** O guard de ID de documento cobre 3 das 5 restrições reais do Firestore (vazio, `/`, comprimento) mas não rejeita `.`/`..` nem o padrão reservado `__.*__`, e mede o limite em caracteres UTF-16 em vez de bytes UTF-8.
- **Impacto:** Não explorável para leitura indevida (Firestore não normaliza `..` como path traversal); um chamador público pode provocar exceção do SDK que cai no catch-all — HTTP 500 genérico + log de erro a cada tentativa, em vez do 400 correto. Antiabuso já limita o volume.
- **O que fazer:** Estender `comoIdDeDocumento()` para rejeitar `.`, `..` e `/^__.*__$/`, e trocar `valor.length` por `Buffer.byteLength(valor, 'utf8')`. Opcionalmente espelhar em `FORMATO_PROFISSIONAL_ID` para responder 400 em vez de 500.

### D23 · BAIXO · error_handling · T7 · Tech Review
- **Onde:** `app/api/public/agendamentos/route.ts:255-259` (catch da transação)
- **Problema:** O catch da transação loga em nível de erro tanto falhas inesperadas quanto desfechos de domínio esperados (`SlotIndisponivelError`, `TelefoneDuplicadoNoDiaError`), diferente do catch do antiabuso (linha 235), que já discrimina.
- **Impacto:** Ruído de observabilidade num endpoint público anônimo — uso legítimo (pedir horário já confirmado) gera entrada de erro; alerta por taxa de erro pode disparar por tráfego normal. Sem impacto funcional.
- **O que fazer:** Aplicar a mesma discriminação do catch do antiabuso: `console.error` apenas quando `!(erro instanceof ErroDominioAgendamento)`.

### D24 · BAIXO · code_quality · T9 · QA
- **Onde:** `app/agendamento/repositories/profissionaisRepository.ts:22` (e replicado em `disponibilidadeRepository.ts`, `agendamentosRepository.ts`, `configuracaoRepository.ts`)
- **Problema:** Os helpers `urlPublica()` e `extrairMensagemDeErro()` estão duplicados verbatim nos 4 arquivos de repository.
- **Impacto:** Nenhum funcional (171 testes verdes); custo de manutenção — mudança num dos helpers exige lembrar de replicar nos outros 3.
- **O que fazer:** Extrair os dois helpers puros para um módulo interno compartilhado (ex.: `app/agendamento/repositories/_shared.ts`), sem recriar a camada de HTTP client genérica que foi deliberadamente evitada.

### D25 · BAIXO · tests · T9 · QA
- **Onde:** `app/agendamento/repositories/__tests__/profissionais.integration.test.ts:27`, `agendamentos.integration.test.ts` (equivalente)
- **Problema:** Cleanup do MSW (`server.resetHandlers()`) roda em `afterEach` em vez de `beforeEach` (AP-18).
- **Impacto:** Baixo risco prático (Vitest roda `afterEach` mesmo em falha de asserção), mas `beforeEach` é mais robusto a crash do teste anterior.
- **O que fazer:** Trocar `afterEach(() => server.resetHandlers())` por `beforeEach(() => server.resetHandlers())` nos dois arquivos.

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
- **T5 e T6 tiveram Gate 2 interrompido por limite de sessão da API** numa sessão anterior (QA de ambas já havia aprovado). Ao retomar (sessão seguinte), o Gate 2 de T5 rodou sem incidentes; o de T6 não chegou a rodar antes de uma segunda interrupção. Nesta sessão, retomado exatamente do ponto onde parou (usuário escolheu "Retomar nos gates", reaproveitando o código já commitado e o `base_sha` original) — nenhum trabalho foi refeito.
- **T6 exigiu 1 correção pós-Tech Review**: o achado (MEDIO/architecture) foi que a fábrica do limitador antiabuso não deixava explícito que precisa ser um singleton de escopo de módulo — se o futuro Route Handler (T7/T8) a instanciasse por requisição, o antiabuso ficaria silenciosamente inoperante. Corrigido exportando um singleton pronto com contrato documentado; revalidado nos dois gates sem novos problemas bloqueantes. D19 (Map sem remoção de entradas expiradas) é um efeito colateral de baixo risco dessa mesma correção, registrado como débito.
- D16/D17 (débito de T5) foram reconstruídos a partir do resumo textual da rodada de Tech Review de uma sessão anterior — o JSON completo daquele gate não sobreviveu entre sessões (por design: só o resumo mínimo é logado). Números de linha exatos não estavam disponíveis; a coluna "Onde" aponta o diretório/arquivo, não a linha.
- **T7 foi a task mais custosa do run até agora**: 3 tentativas (o limite máximo antes de bloquear), todas por achados de segurança genuínos do Tech Review — não por code-review estilístico. Rodada 1: antiabuso contornável trivialmente (header `x-forwarded-for` forjável pelo cliente) e campo persistido sem limite de tamanho. Rodada 2 (após corrigir os dois): o próprio Tech Review reconheceu explicitamente que um problema NOVO (MEDIO) já existia desde a rodada 1 e passou despercebido na sua primeira revisão — `profissionalId`/`data`/`horario` viravam path de documento Firestore sem sanitização. Rodada 3 corrigiu isso em duas camadas (gate no handler + defesa em profundidade na porta) e foi aprovada com 4 débitos BAIXO residuais (D20-D23), nenhum bloqueante.
- **Escopo cruzado em T7**: as correções de segurança exigiram tocar arquivos de T3 (`cliente.ts`), T4 (`agendamentoStore.ts`) e T6 (`rateLimit.ts`) — todas já concluídas — para resolver os problemas na causa-raiz em vez de superficialmente no Route Handler. Em todas as rodadas, QA e Tech Review avaliaram essas mudanças como craft necessário e cirúrgico (interfaces públicas preservadas, sem quebra de contrato para T8), não como desvio de escopo indevido.
- O executor identificou por conta própria, na correção final de T7, um segundo ponto de uso de `profissionalId` como ID de documento (`.doc(dto.profissionalId)` direto na transação) que o Tech Review não havia citado explicitamente — cobertura mais ampla que o mínimo pedido, confirmada pelo QA e pelo Tech Review na revalidação.
- **T8 fechou a Fase 2 (BFF) sem gerar nenhum código de produção novo**: o executor leu `route.ts` (T7) e `agendamentoStore.ts` (T4) e concluiu, corretamente, que ambos já satisfaziam os 4 critérios de aceite da task — a §5.2 já declarava as modificações como condicionais ("se necessários"). QA e Tech Review confirmaram essa alegação por leitura direta antes de aprovar, em vez de aceitá-la de bom grado; T8 se resumiu a um único arquivo de teste que prova formalmente o que já estava implementado. 1ª tentativa, sem rejeições, zero débito novo.
- **T9 corrigiu uma divergência entre a task e o contrato já implementado**: a §6.4 de T9 usava o rótulo `DUPLICIDADE_DIA` para o erro de duplicidade diária, mas T6/T7/T8 já haviam implementado e aprovado o código real como `TELEFONE_DUPLICADO_NO_DIA`. O executor tratou isso como decisão de sênior (não parou para perguntar) e usou o valor real do contrato — a alternativa seria inventar um mapeamento para um código que não existe no backend.
- **T9 é `gates: [qa]` — sem Tech Review por design** (tipo `service_simples`). O QA foi instruído a aplicar também um olhar arquitetural leve (duplicação entre os 4 repositories, risco de uso futuro fora de Client Component) precisamente porque não há uma 2ª camada de revisão depois dele nesta task.
- **T14 fechou a feature**: `/` agora renderiza `AppointmentFlow`, o layout global está em `pt-BR` com metadata de solicitação aguardando confirmação, os tokens dark-first foram aplicados em `app/globals.css` e os E2E cobrem conclusão, privacidade de terceiros, viewport 320px e reduced motion. QA e Tech Review aprovaram sem débitos novos; `npm test`, `npm run build`, `npx tsc --noEmit` e E2E T14 passaram.
