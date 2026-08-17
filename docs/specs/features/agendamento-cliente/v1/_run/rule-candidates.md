# Rule candidates — agendamento-cliente/v1

> Append-only. Cada tópico abaixo é um candidato a regra detectado durante um run.
> Consumido por `/agent-spec-mine-rule-candidates` (agrupa por tema) e `/agent-spec-curate-project-rules` (decide se vira regra).

## [pre_refinement_decision] Fluxo sem conta/login para o cliente

**Regra que isto sugere:** a frente de agendamento do cliente nunca exige conta, login ou cadastro — qualquer task futura que proponha autenticação de cliente contraria a decisão de produto já tomada.

**O que ela faria (simples):** sem essa regra, um executor futuro poderia "melhorar" o fluxo adicionando cadastro; com ela, fica registrado que isso já foi decidido e rejeitado deliberadamente.

- Evidência: "O cliente não possui conta, login ou cadastro." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [pre_refinement_decision] Dados mínimos do cliente (nome + telefone)

**Regra que isto sugere:** o contrato público de agendamento coleta apenas nome e telefone do cliente — nenhum outro campo pessoal.

**O que ela faria (simples):** evita que uma task futura amplie o formulário com e-mail, CPF ou endereço sem decisão explícita de produto.

- Evidência: "O cliente informa apenas nome e telefone." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [pre_refinement_decision] Fluxo de produto A1 fixado

**Regra que isto sugere:** a jornada do cliente segue a variante A1 (já escolhida) — outras variantes de fluxo (A2, A3, ...) não são retrabalhadas nesta feature.

**O que ela faria (simples):** impede que uma task de UI reabra a discussão sobre a ordem/etapas do fluxo já decidida no discovery.

- Evidência: "O fluxo escolhido é A1." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [pre_refinement_decision] Múltiplas solicitações concorrentes por horário são permitidas

**Regra que isto sugere:** o domínio permite mais de uma `Solicitação de Agendamento` em `AGUARDANDO_CONFIRMACAO` para o mesmo horário — o backend nunca deve tratar isso como conflito/erro de duplicidade entre clientes diferentes.

**O que ela faria (simples):** evita que uma task de validação implemente por engano uma trava de "um horário, uma solicitação", o que quebraria a regra de negócio central da concorrência do agendamento.

- Evidência: "Para o mesmo horário, pode haver mais de uma solicitação em AGUARDANDO_CONFIRMACAO." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [pre_refinement_decision] Triagem manual do administrador (fora de escopo do cliente)

**Regra que isto sugere:** a confirmação/rejeição de solicitações concorrentes é feita manualmente pelo administrador, fora desta frente — a frente cliente nunca implementa lógica automática de priorização entre solicitações concorrentes.

**O que ela faria (simples):** evita escopo criativo (auto-seleção de qual solicitação "ganha" o horário) dentro das tasks do cliente.

- Evidência: "O administrador confirma apenas uma solicitação por horário e rejeita/remarca as demais manualmente." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [pre_refinement_decision] Experiência de UX fixada em C1

**Regra que isto sugere:** a experiência de interação (C1) já foi escolhida no discovery — tasks de UI implementam essa variante, não reabrem a escolha entre C1/C2/etc.

**O que ela faria (simples):** dá ao executor de UI a certeza de que não precisa (nem deve) redecidir esse ponto.

- Evidência: "A experiência escolhida é C1." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [pre_refinement_decision] Textos da tela de sucesso fixados em D1 (sem cores configuráveis)

**Regra que isto sugere:** a tela de sucesso usa os textos da variante D1; a v1 não implementa cores configuráveis em toda a aplicação, apenas textos configuráveis no sucesso.

**O que ela faria (simples):** evita que uma task de UI implemente um sistema de theming/cores configuráveis não pedido para esta versão.

- Evidência: "Os textos da tela de sucesso escolhidos são D1." + hipótese "a v1 pode abrir mão de cores configuráveis... porque o usuário escolheu D1 e não D2" — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [pre_refinement_decision] Privacidade de terceiros fixada em E1

**Regra que isto sugere:** as respostas públicas (leitura de disponibilidade) seguem a política de privacidade E1 — nunca expõem nome, telefone ou quantidade de outras solicitações/clientes.

**O que ela faria (simples):** é o guard-rail que a Camada de segurança dos gates (QA/Tech Review) deve cobrar em qualquer endpoint público novo desta feature — vazamento de dado de terceiro é bloqueante, não débito.

- Evidência: "A privacidade escolhida é E1." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-12T22:03:39Z

---

## [repeated_fixture] Builder de credencial Firebase fake em teste

**Regra que isto sugere:** credencial Firebase de teste sempre vem de um builder que gera a chave em runtime, nunca de PEM literal no arquivo de teste.

**O que ela faria (simples):** a mesma fábrica de chave fake foi consumida por dois pontos de teste distintos no primeiro arquivo que toca Firebase; como as próximas tasks da feature vão precisar da mesma credencial, uma regra apontando o builder evita que alguém cole um PEM literal (que dispara scanner de segredo) ou duplique a geração com parâmetros divergentes.

- Evidência: helper `gerarChavePrivadaFake()` definido em `lib/firebase/admin.test.ts:51` e consumido em dois pontos de teste (`lib/firebase/admin.test.ts:70`, `lib/firebase/admin.test.ts:213`) — T3
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-12T00:00:00Z

---

## [scope_deviation] Dependências novas na seção de arquivos

**Regra que isto sugere:** declaração obrigatória de novas dependências de runtime em §5.2 da task, com faixa de versão e destino (dependencies vs devDependencies).

**O que ela faria (simples):** a T3 não podia ser implementada sem instalar `firebase-admin`, mas §5.2 dizia "N/A" — o executor teve que alterar `package.json` fora do escopo declarado e os dois gates gastaram análise decidindo se aquilo era desvio ou craft necessário. A regra faz a spec declarar a dependência antes, transformando entrada de código de terceiro em produção em decisão revisada e não em efeito colateral.

- Evidência: `package.json:15` recebeu `"firebase-admin": "^14.2.0"` enquanto T3 §5.2 declara "N/A"; discutido nas 3 rodadas de gates — T3
- Sinal: `scope_deviation` · Origem: `staff-review` · 2026-08-12T00:00:00Z

---

## [convention_drift] Localização de arquivos de teste

**Regra que isto sugere:** padrão único de placement de teste no repositório (diretório `__tests__/` adjacente ao fonte), válido também fora de `app/`.

**O que ela faria (simples):** testes de T1/T2 e a árvore do tech_spec ficam em `__tests__/`, mas T3 co-locou `lib/firebase/admin.test.ts` ao lado do fonte, porque nenhuma rule nem o tech_spec normatizam placement fora de `app/agendamento/**`. Com duas convenções vivas e nenhuma escrita, cada task em `lib/` decide sozinha.

- Evidência: `__tests__/cliente.test.ts` em app/ vs `admin.test.ts` co-locado em lib/; sweep em .claude/rules/* não encontrou menção a placement de teste — T3
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-12T00:00:00Z

---

## [convention_drift] Idioma de identificadores de código

**Regra que isto sugere:** identificadores de código-fonte (constantes, funções, helpers de teste) em pt-BR, alinhados ao domínio.

**O que ela faria (simples):** a rule de acentuação pt-BR cobre só os documentos gerados (specs, ADRs, glossário), então cada agente escolhe o idioma dos nomes de variável por conta própria — a mesma task T3 produziu `NOME_MIN_LENGTH` ao lado de `PADRAO_CONTEUDO_ABUSIVO` e `clearFirebaseEnv` ao lado de `limparRegistryDoFirebaseAdmin`, no mesmo arquivo. Uma regra explícita elimina a escolha e torna a busca por nome previsível.

- Evidência: constantes e helpers alternando pt-BR e inglês no mesmo arquivo — `app/agendamento/validation/cliente.ts:39,50`, `lib/firebase/admin.test.ts:52,58` — T3
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-13T00:00:00Z

---

## [repeated_fixture] Cleanup manual do Testing Library

**Regra que isto sugere:** centralizar `afterEach(cleanup)` em `vitest.setup.ts` em vez de repetir `beforeEach(() => cleanup())` em cada arquivo de teste de componente.

**O que ela faria (simples):** a suíte roda com `globals: false`, então o auto-cleanup do Testing Library não se registra sozinho; o mesmo bloco de cleanup foi copiado idêntico em 3 arquivos de teste da mesma task. Uma regra apontando a centralização evita reescrever o mesmo boilerplate em cada novo arquivo de teste de componente futuro.

- Evidência: `beforeEach(() => cleanup())` idêntico em `components/ui/__tests__/buttons.test.tsx:33`, `selection.test.tsx:56`, `feedback.test.tsx:25` — T10
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-13T00:00:00Z

---

## [repeated_fixture] Fixtures de profissional e DTO base de agendamento

**Regra que isto sugere:** centralizar `PROFISSIONAL_SEED` e `DTO_BASE` (ou builder equivalente) como fixture compartilhada padrão para testes da porta de agendamento.

**O que ela faria (simples):** a mesma seed de profissional e o mesmo DTO base são reutilizados em praticamente todos os testes do arquivo; se novos arquivos de teste da feature precisarem do mesmo profissional/DTO, uma regra apontando para um builder compartilhado evita duplicação e drift entre arquivos.

- Evidência: `PROFISSIONAL_SEED`/`DTO_BASE` reutilizados em 6 pontos de `lib/firebase/agendamentoStore.test.ts` — T4
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-13T00:00:00Z

---

## [repeated_assertion_shape] Asserção de ausência de escrita parcial via contagem

**Regra que isto sugere:** padronizar um helper `expectNoPartialWrite(store, expectedCount)` para o assert `expect(store.contarAgendamentos()).toBe(N)` repetido após cada tentativa de criação que deveria falhar.

**O que ela faria (simples):** o mesmo formato de asserção aparece em 4 pontos distintos para provar "nenhuma escrita parcial"; um helper nomeado tornaria a intenção (invariante de atomicidade) explícita no código de teste em vez de repetir a chamada crua toda vez.

- Evidência: `expect(store.contarAgendamentos()).toBe(N)` repetido em 4 testes de `lib/firebase/agendamentoStore.test.ts` — T4
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-13T00:00:00Z

---

## [repeated_fixture] Helper de contexto de rota dinâmica duplicado

**Regra que isto sugere:** extrair a função `contexto(profissionalId)` (constrói `{ params: Promise.resolve({ profissionalId }) }`) para um helper de teste compartilhado em vez de redeclará-la em cada arquivo de rota dinâmica.

**O que ela faria (simples):** a mesma função foi copiada idêntica em dois arquivos de teste de rotas dinâmicas; um helper compartilhado evita drift quando a assinatura de `params` do Next mudar de novo.

- Evidência: função `contexto(profissionalId: string)` idêntica em `app/api/public/profissionais/[profissionalId]/dias/route.test.ts:20` e `.../horarios/route.test.ts:20` — T5
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-13T00:00:00Z

---

## [repeated_assertion_shape] Asserção de erro público duplicada em 5+ testes

**Regra que isto sugere:** extrair um helper `expectErroPublico(response, status, codigo, error)` para os testes de Route Handlers públicos de agendamento.

**O que ela faria (simples):** hoje o par `expect(response.status).toBe(N); expect(body).toEqual({ error, codigo })` se repete quase idêntico em 5 testes do mesmo arquivo (payload inválido, JSON malformado, limite antiabuso, SlotIndisponivelError, TelefoneDuplicadoNoDiaError, erro genérico); um helper compartilhado reduziria repetição e padronizaria a asserção para os próximos Route Handlers públicos da feature (T8 em diante).

- Evidência: `expect(response.status).toBe(X); expect(body).toEqual({ error, codigo })` repetido em `app/api/public/agendamentos/route.success.test.ts:126,142,156,170,185,199` — `T7 / POST público de agendamento`
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-16T00:00:00Z

---

## [convention_drift] Nomenclatura de arquivo de teste de Route Handler

**Regra que isto sugere:** Route Handlers de `app/api/**` devem ter seus testes em `route.test.ts` (sem sufixos temáticos como `.success.`), cobrindo caminho feliz e caminhos de erro no mesmo arquivo.

**O que ela faria (simples):** T4/T5/T6 estabeleceram consistentemente `route.test.ts` como nome de arquivo de teste de handler, mas essa convenção nunca foi escrita em `.claude/rules/*`; sem regra explícita, T7 introduziu `route.success.test.ts`, quebrando o padrão e criando um nome que nem reflete o conteúdo real do arquivo (cobre também 12 casos de erro).

- Evidência: `app/api/public/agendamentos/route.success.test.ts` versus `app/api/public/profissionais/route.test.ts`, `app/api/public/configuracao/sucesso/route.test.ts`, `app/api/public/profissionais/[profissionalId]/dias/route.test.ts` — `T7 / Route Handler POST público de agendamento`
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-16T00:00:00Z

---

## [repeated_fixture] Boilerplate de setup MSW por arquivo

**Regra que isto sugere:** centralizar o setup padrão de MSW (`setupServer` + `beforeAll/afterEach/afterAll`) num helper compartilhado de teste da feature.

**O que ela faria (simples):** os dois arquivos de teste de T9 repetem exatamente o mesmo bloco de 5 linhas de setup/teardown do MSW; um helper único evita drift quando um novo arquivo de teste da feature precisar do mesmo padrão.

- Evidência: `setupServer()+beforeAll/afterEach/afterAll` idênticos em `app/agendamento/repositories/__tests__/profissionais.integration.test.ts:24` e `agendamentos.integration.test.ts:21` — `T9 / repositories client-side do BFF de agendamento`
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-16T00:00:00Z

---

## [repeated_assertion_shape] Asserção de erro tipado em ResultadoRepository

**Regra que isto sugere:** extrair um matcher/helper `expectErro(resultado, tipo, mensagem)` para o shape `{ ok: false, erro: { tipo, mensagem } }`.

**O que ela faria (simples):** o mesmo formato de asserção se repete 5 vezes em `agendamentos.integration.test.ts` variando só tipo/mensagem; um helper reduziria ruído sem perder a precisão da asserção literal exigida pela task.

- Evidência: `expect(resultado).toEqual({ ok: false, erro: { tipo, mensagem } })` em `app/agendamento/repositories/__tests__/agendamentos.integration.test.ts:98,116,134,152,170` — `T9 / agendamentosRepository.criar`
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-16T00:00:00Z

---

## [repeated_assertion_shape] Padrão de asserção para erro 500 genérico

**Regra que isto sugere:** extrair um helper compartilhado (ex.: `expectGenericServerError(response, body)`) para o padrão "status 500 + corpo só com chave `error` + sem detalhe do erro original" repetido nos handlers públicos.

**O que ela faria (simples):** o mesmo bloco de 3 asserções foi copiado em 3 arquivos de teste diferentes; um helper único documentaria essa política de segurança (nunca vazar stack trace) como convenção reutilizável para novos endpoints públicos.

- Evidência: bloco de asserção de erro 500 repetido em `app/api/public/profissionais/route.test.ts:53`, `.../dias/route.test.ts:68`, `.../horarios/route.test.ts:90` — T5
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-13T00:00:00Z
