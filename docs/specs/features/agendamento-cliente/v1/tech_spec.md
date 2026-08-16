# TECH_SPEC -- Especificação Técnica (Web)

## 1. Identificação
- **Feature/Projeto**: Agendamento do cliente sem conta
- **Variante**: web
- **Stack**: Next.js App Router + React + TypeScript + Firebase/Firestore, Server Component para a rota e Client Components para o fluxo interativo
- **Autor**: Codex
- **Data**: 2026-08-11
- **Versão**: v1
- **Status**: Revisão
- **PRD Relacionado**: `docs/prds/features/agendamento-cliente/v1/prd.md`
- **Design Relacionado**: `docs/specs/features/agendamento-cliente/v1/design.md`

---

## 2. Resumo Técnico da Solução

A solução substitui a página inicial do template por uma rota App Router pública de agendamento. A página permanece como Server Component e entrega um `AppointmentFlow` interativo em Client Components, com estado local via Context API + `useReducer`. O acesso a dados passa por Route Handlers internos usados como BFF público; esses handlers leem e gravam no Firebase/Firestore usando SDK server-side e a UI consome os contratos por repositórios tipados com `fetch` nativo. O design aprovado é a fonte de verdade visual, com implementação aderente a Material Design 3, e a Tech Spec define rotas, contratos, estado, validações, segurança, testes e arquivos envolvidos.

---

## 3. Arquitetura da Solução

### 3.1 Visão Geral

`app/page.tsx` renderiza a entrada pública do fluxo. O componente `AppointmentFlow` controla as etapas de identificação, escolha, revisão e sucesso. Componentes visuais puros recebem props e emitem eventos; hooks/reducer controlam transições, validações e chamadas aos repositórios. Repositórios tipados usam `fetch` contra Route Handlers internos em `/api/public/*`, mantendo Firestore e credenciais isolados do navegador.

### 3.2 Componentes / Páginas

| Componente / Página | Responsabilidade | Camada |
|---------------------|------------------|--------|
| `app/page.tsx` | Rota pública inicial, metadados e composição do fluxo. | UI / Server Component |
| `AppointmentFlow` | Orquestrar etapas, ações do usuário e renderização condicional. | Container / Client Component |
| `AppointmentProvider` + reducer | Guardar estado transitório do fluxo e validar transições. | State |
| `IdentificationStep` | Coletar nome e telefone. | UI |
| `ScheduleStep` | Selecionar profissional, dia e horário. | UI |
| `ReviewStep` | Exibir resumo e disparar solicitação final. | UI |
| `SuccessStep` | Exibir sucesso e textos públicos/fallback. | UI |
| Design system components | Shell, botões, campos, cards, chips, banners e skeletons implementados localmente com Tailwind e princípios Material Design 3. | UI |
| Repositories `profissionais`, `disponibilidade`, `agendamentos`, `configuracao` | Consumir BFF público e mapear DTOs para models. | Service / API Client |
| Route Handlers `/api/public/*` | Expor contratos públicos mínimos para a frente cliente. | API / BFF |
| Firebase/Firestore server-side | Persistir profissionais, disponibilidade, solicitações e configuração pública. | Data |

### 3.3 Camadas e Interações

UI → `AppointmentFlow` → `AppointmentProvider/useReducer` → repositories → Route Handlers BFF → Firebase/Firestore. Componentes não chamam `fetch` diretamente. O reducer não executa I/O; ele apenas representa estado, seleção, erros e transições. Repositórios validam status HTTP, normalizam DTOs e retornam erros de domínio tipados para a UI. Route Handlers encapsulam o SDK do Firebase e não expõem credenciais, paths internos de coleção ou dados administrativos ao navegador.

### 3.4 Visão em Árvore

```
app/
├── api/
│   └── public/
│       ├── agendamentos/
│       │   └── route.ts                         [N]
│       ├── configuracao/
│       │   └── sucesso/
│       │       └── route.ts                     [N]
│       └── profissionais/
│           ├── route.ts                         [N]
│           └── [profissionalId]/
│               ├── dias/
│               │   └── route.ts                 [N]
│               └── horarios/
│                   └── route.ts                 [N]
├── agendamento/
│   ├── __tests__/
│   │   ├── AppointmentFlow.disponibilidade.integration.test.tsx [N]
│   │   ├── AppointmentFlow.identificacao.test.tsx               [N]
│   │   ├── AppointmentFlow.revisao.test.tsx                     [N]
│   │   └── SuccessScreen.config.integration.test.tsx            [N]
│   ├── components/
│   │   ├── AppointmentFlow.tsx                  [N]
│   │   ├── IdentificationStep.tsx               [N]
│   │   ├── ReviewStep.tsx                       [N]
│   │   ├── ScheduleStep.tsx                     [N]
│   │   └── SuccessStep.tsx                      [N]
│   ├── repositories/
│   │   ├── __tests__/
│   │   │   ├── agendamentos.integration.test.ts [N]
│   │   │   └── profissionais.integration.test.ts[N]
│   │   ├── agendamentosRepository.ts            [N]
│   │   ├── configuracaoRepository.ts            [N]
│   │   ├── disponibilidadeRepository.ts         [N]
│   │   └── profissionaisRepository.ts           [N]
│   ├── state/
│   │   ├── __tests__/
│   │   │   └── appointmentFlow.test.ts          [N]
│   │   ├── AppointmentProvider.tsx              [N]
│   │   └── appointmentReducer.ts                [N]
│   ├── types.ts                                 [N]
│   └── validation/
│       ├── __tests__/
│       │   └── cliente.test.ts                  [N]
│       └── cliente.ts                           [N]
├── globals.css                                  [M]
├── layout.tsx                                   [M]
└── page.tsx                                     [M]
lib/
└── firebase/
    ├── admin.ts                                 [N]
    └── agendamentoStore.ts                      [N]
components/
└── ui/
    ├── AppShell.tsx                             [N]
    ├── FormField.tsx                            [N]
    ├── InlineBanner.tsx                         [N]
    ├── PrimaryButton.tsx                        [N]
    ├── SecondaryButton.tsx                      [N]
    ├── SelectionCard.tsx                        [N]
    ├── SkeletonBlock.tsx                        [N]
    ├── StepProgress.tsx                         [N]
    ├── SummaryList.tsx                          [N]
    └── TimeChip.tsx                             [N]
e2e/
├── agendamento-cliente.mobile.spec.ts           [N]
└── agendamento-cliente.spec.ts                  [N]
docs/
├── prds/features/agendamento-cliente/v1/prd.md  [R]
└── specs/
    ├── design-system.md                         [R]
    └── features/agendamento-cliente/v1/
        ├── design.md                            [R]
        └── tech_spec.md                         [N]
package.json                                     [M]
playwright.config.ts                             [N]
vitest.config.mts                                [N]
```

Legenda: `[N]` Novo &nbsp; `[M]` Modificado &nbsp; `[R]` Referência

### 3.5 Arquivos a Criar

| Arquivo | Descrição | Camada |
|---------|-----------|--------|
| `components/ui/*.tsx` | Componentes globais definidos no design system, implementados localmente com Tailwind e linguagem Material Design 3. | UI |
| `app/agendamento/components/*.tsx` | Etapas e container do fluxo. | UI / Container |
| `app/agendamento/state/*.ts(x)` | Provider, reducer e ações do fluxo. | State |
| `app/agendamento/repositories/*.ts` | Clientes de dados tipados com `fetch`. | API Client |
| `app/agendamento/validation/cliente.ts` | Normalização e validação de nome/telefone. | Validation |
| `app/agendamento/types.ts` | Tipos de domínio/DTOs da feature. | Model |
| `app/api/public/**/route.ts` | BFF público para dados mínimos do cliente. | API |
| `lib/firebase/admin.ts` | Inicialização server-side do Firebase Admin/SDK equivalente com variáveis `FIREBASE_*` server-only. | Infrastructure |
| `lib/firebase/agendamentoStore.ts` | Porta/adapter de acesso Firestore e transações de disponibilidade, duplicidade e criação de solicitação. | Data |
| `vitest.config.mts`, `playwright.config.ts` | Configuração de testes. | Testing |
| `app/agendamento/**/__tests__/*`, `e2e/*` | Testes unitários, integração e E2E. | Testing |

### 3.6 Arquivos a Modificar

| Arquivo | Modificação | Motivo |
|---------|-------------|--------|
| `app/page.tsx` | Remover template inicial e renderizar o fluxo. | Implementar a jornada principal. |
| `app/layout.tsx` | Ajustar `lang`, metadata e classes globais conforme produto. | Localização pt-BR e identidade da aplicação. |
| `app/globals.css` | Adicionar tokens CSS do design system e padrões base dark-first. | Cumprir design aprovado. |
| `package.json` | Adicionar dependências/scripts de teste e libs necessárias. | Executar suite proposta. |

### 3.7 Arquivos de Referência (somente leitura)

| Arquivo | Motivo da Consulta |
|---------|--------------------|
| `docs/prds/features/agendamento-cliente/v1/prd.md` | Fonte do O QUE/POR QUÊ e CAs. |
| `docs/specs/features/agendamento-cliente/v1/design.md` | Fonte do COMO visual. |
| `docs/specs/design-system.md` | Tokens e componentes globais. |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | Estado atual da aplicação. |
| `node_modules/next/dist/docs/01-app/**` | Regras locais do Next 16 App Router. |

---

## 4. Fluxos de Interface

### 4.1 Mapa de Telas / Rotas

| Rota | Tela / Página | Acesso | Descrição |
|------|---------------|--------|-----------|
| `/` | Identificação | Público | Ver `design.md` §4.1. |
| `/` | Escolha de Agendamento | Público, após identificação válida | Ver `design.md` §4.2. |
| `/` | Revisão | Público, após seleção completa | Ver `design.md` §4.3. |
| `/` | Sucesso | Público, após solicitação aceita | Ver `design.md` §4.4. |

### 4.2 Jornadas e Navegação

A navegação é interna ao `AppointmentFlow`, sem rotas separadas por etapa na v1. O estado da etapa não deve ser persistido em URL nem storage. Atualizar/recarregar a página reinicia o fluxo. A ação "Voltar" retorna para a etapa anterior preservando o estado em memória. A tela de sucesso não deve expor identificadores internos na URL.

---

## 5. Comportamento Visual e Estados da UI

Fonte de verdade dos estados visuais: `docs/specs/features/agendamento-cliente/v1/design.md` §5. Esta Tech Spec apenas conecta os estados visuais aos contratos técnicos de loading, erro, sucesso e vazio.

### 5.1 Estados por Tela / Componente

| Componente / Tela | Loading | Sucesso | Erro | Vazio |
|-------------------|---------|---------|------|-------|
| Identificação | Ver `design.md` §5. | Ver `design.md` §5. | Erros de validação emitidos por `cliente.ts`. | N/A |
| Escolha — profissionais | Ver `design.md` §5. | Dados de `profissionaisRepository`. | Erros de repository mapeados para `InlineBanner`. | Lista vazia do BFF. |
| Escolha — dias | Ver `design.md` §5. | Dados de `disponibilidadeRepository`. | Erros de repository mapeados para `InlineBanner`. | Lista vazia do BFF. |
| Escolha — horários | Ver `design.md` §5. | Dados de `disponibilidadeRepository`. | Erros de repository mapeados para `InlineBanner`. | Lista vazia do BFF. |
| Revisão | Ver `design.md` §5. | Estado completo do reducer. | Erro de envio/duplicidade. | N/A |
| Sucesso | Ver `design.md` §5. | Resultado aceito + configuração pública/fallback. | Falha de configuração não bloqueia sucesso. | Seções opcionais vazias ocultas. |

### 5.2 Transições e Feedback Visual

Seguir `design.md` §8. Tecnicamente, o botão de envio entra em estado `submitting`, desabilita repetição visual da ação e volta ao estado normal em falha recuperável.

---

## 6. Gestão de Estado

### 6.1 Solução Escolhida

Context API + `useReducer` local da feature. A decisão evita dependência nova para um fluxo curto e mantém o estado isolado ao domínio de agendamento.

### 6.2 Estrutura de Stores / Slices

| Store / Slice | Estado Gerenciado | Ações Principais |
|---------------|-------------------|------------------|
| `AppointmentProvider` | `step`, identificação, seleção, listas carregadas, loading, erros, resultado final. | `SET_IDENTIFICATION`, `SELECT_PROFESSIONAL`, `SET_DAYS`, `SELECT_DAY`, `SET_TIMES`, `SELECT_TIME`, `GO_REVIEW`, `SUBMIT_START`, `SUBMIT_SUCCESS`, `SUBMIT_ERROR`, `BACK`. |
| `appointmentReducer` | Transições puras e bloqueios de etapa incompleta. | Validar precondições de navegação e resetar dependências quando seleção pai muda. |

### 6.3 Persistência de Estado

Sem persistência em `localStorage`, `sessionStorage`, cookies ou URL na v1. O PRD e o pré-refinamento descartaram retomada local; o estado vive apenas em memória até a solicitação final.

---

## 7. Integração com APIs

### 7.1 Endpoints Consumidos

| Ação | Método | Rota | Payload Enviado | Resposta Esperada | Auth |
|------|--------|------|-----------------|-------------------|------|
| Listar profissionais ativos | GET | `/api/public/profissionais` | — | `ProfissionalPublicoDTO[]` | Nenhuma |
| Listar dias liberados | GET | `/api/public/profissionais/{profissionalId}/dias` | — | `DiaDisponivelDTO[]` | Nenhuma |
| Listar horários elegíveis | GET | `/api/public/profissionais/{profissionalId}/horarios?data=YYYY-MM-DD` | — | `HorarioDisponivelDTO[]` | Nenhuma |
| Criar solicitação de agendamento | POST | `/api/public/agendamentos` | `CriarSolicitacaoAgendamentoDTO` | `SolicitacaoAgendamentoDTO` ou erro de domínio | Nenhuma |
| Carregar textos de sucesso | GET | `/api/public/configuracao/sucesso` | — | `ConfiguracaoSucessoDTO` ou vazio | Nenhuma |

### 7.2 Contratos / DTOs de Resposta

| DTO | Campos principais | Origem |
|-----|-------------------|--------|
| `ProfissionalPublicoDTO` | `id`, `nome`, `cref` | Manual |
| `DiaDisponivelDTO` | `data` (`YYYY-MM-DD`), `label` | Manual |
| `HorarioDisponivelDTO` | `horario` (`HH:mm`) | Manual |
| `CriarSolicitacaoAgendamentoDTO` | `nomeCliente`, `telefoneNormalizado`, `telefoneExibicao`, `profissionalId`, `data`, `horario` | Manual |
| `SolicitacaoAgendamentoDTO` | `id`, `status`, `profissionalNome`, `data`, `horario` | Manual |
| `ConfiguracaoSucessoDTO` | `titulo`, `descricao`, `regras[]`, `dicas[]`, `avisos[]` | Manual |

### 7.3 Mapping para Models de Domínio

Repositories convertem DTOs para `Profissional`, `DiaDisponivel`, `HorarioDisponivel`, `SolicitacaoAgendamento` e `ConfiguracaoSucesso`. Respostas públicas não podem incluir dados de outros clientes; campos extras inesperados são ignorados no mapping.

### 7.4 Fonte de Dados Firestore

Route Handlers usam Firestore como fonte de dados server-side. A modelagem física pode ser refinada na implementação, mas deve suportar no mínimo:

| Coleção / Documento | Responsabilidade | Campos mínimos |
|---------------------|------------------|----------------|
| `profissionais/{profissionalId}` | Profissionais visíveis ao cliente. | `nome`, `cref`, `ativo` |
| `disponibilidades/{profissionalId}_{data}` | Dias e horários liberados por profissional. | `profissionalId`, `data`, `horarios[]`, `ativo` |
| `agendamentos/{solicitacaoId}` | Solicitações de Agendamento criadas pelo cliente. | `nomeCliente`, `telefoneExibicao`, `telefoneNormalizado`, `profissionalId`, `data`, `horario`, `status`, `criadoEm` |
| `configuracoes/sucessoPublico` | Textos públicos da tela de sucesso. | `titulo`, `descricao`, `regras[]`, `dicas[]`, `avisos[]` |

O BFF deve filtrar `profissionais.ativo == true`, retornar apenas dias liberados e horários liberados que não estejam confirmados. Horários com solicitações pendentes de terceiros continuam elegíveis na frente cliente, mas sem contador, nome, telefone ou qualquer detalhe dessas solicitações. Textos configuráveis vêm de `configuracoes/sucessoPublico`; ausência ou erro de leitura usa fallback seguro.

---

## 8. Sincronização de Dados

### 8.1 Estratégia de Cache HTTP

Sem biblioteca de cache na v1. Profissionais e textos de sucesso podem ser cacheados pelo BFF com headers apropriados; no cliente, cada mudança de profissional/dia dispara nova leitura. Horários são tratados como dinâmicos e devem ser reconsultados antes da revisão/envio quando necessário.

### 8.2 Tempo Real

Sem WebSocket, SSE ou polling contínuo na v1. A disponibilidade pode mudar, então o envio final depende da validação transacional no BFF. Em falha de elegibilidade/duplicidade, a UI mostra erro recuperável.

### 8.3 Concorrência e Consistência

O POST `/api/public/agendamentos` deve executar uma transação Firestore. Dentro da transação, o BFF valida se o horário continua elegível, valida se `telefoneNormalizado` não possui Solicitação de Agendamento ativa no mesmo dia e cria o documento da Solicitação de Agendamento com `status: "AGUARDANDO_CONFIRMACAO"`. A operação não deve depender de botão desabilitado, estado React, consulta anterior ou validação visual.

Para a política aprovada nesta feature, múltiplas solicitações de clientes diferentes podem ficar `AGUARDANDO_CONFIRMACAO` para o mesmo `profissionalId` + `data` + `horario`; portanto o POST público não bloqueia slot apenas por solicitação pendente de terceiro. O bloqueio transacional obrigatório no cliente é por duplicidade diária do mesmo `telefoneNormalizado` e por slot já `CONFIRMADO`. A confirmação administrativa de apenas uma solicitação por slot fica fora da v1 cliente, mas os dados gravados precisam permitir essa restrição no backend/admin.

### 8.4 Porta de Dados Testável

`lib/firebase/agendamentoStore.ts` deve separar a porta de domínio da implementação Firestore. Route Handlers dependem de funções como `listarProfissionaisAtivos`, `listarDiasLiberados`, `listarHorariosElegiveis`, `criarSolicitacaoAgendamento` e `carregarConfiguracaoSucesso`, sem acessar Firestore diretamente. A implementação real usa transação Firestore; testes rápidos usam fake transacional determinístico para validar concorrência, duplicidade diária, slot confirmado e antiabuso sem Firestore real nem corrida temporal frágil.

---

## 9. Gerenciamento de Erros

| Tipo de Erro | Origem | Tratamento UI | Fallback |
|--------------|--------|---------------|----------|
| Rede / Timeout | Repositories/BFF | `InlineBanner` no bloco afetado com "Tentar novamente". | Manter etapa atual. |
| Validação | `cliente.ts` e reducer | Erro inline no campo ou banner de seleção incompleta. | Bloquear avanço. |
| Duplicidade diária | POST agendamento | Banner na revisão: "Você já possui um agendamento para este dia." | Voltar para escolha. |
| Limite antiabuso | POST agendamento | Banner genérico: "Não foi possível concluir sua solicitação. Tente novamente mais tarde." | Permitir nova tentativa após a janela operacional. |
| Servidor (5xx) | BFF | Banner: "Não foi possível concluir sua solicitação. Tente novamente." | Permitir retry. |
| Configuração de sucesso ausente | BFF config | Não bloquear sucesso. | Usar fallback seguro. |

Captura global via boundaries do Next fica restrita a falhas inesperadas da rota; erros esperados devem ser modelados nos repositories.

---

## 10. Segurança

### 10.1 Storage de Tokens

N/A — cliente não tem autenticação, conta ou token. A frente não armazena credenciais.

### 10.1.1 Variáveis de Ambiente Server-only

`lib/firebase/admin.ts` deve ler exclusivamente variáveis server-only:

| Variável | Uso | Exposição permitida |
|----------|-----|---------------------|
| `FIREBASE_PROJECT_ID` | Identificar o projeto Firebase. | Somente server-side |
| `FIREBASE_CLIENT_EMAIL` | Autenticar SDK server-side. | Somente server-side |
| `FIREBASE_PRIVATE_KEY` | Autenticar SDK server-side. | Somente server-side |

Nenhuma variável `FIREBASE_*` deve ser prefixada com `NEXT_PUBLIC_`. Client Components, repositories de browser e payloads públicos nunca leem nem serializam credenciais Firebase.

### 10.2 XSS / CSRF / Headers

Textos configuráveis de sucesso são tratados como texto simples, nunca HTML. Route Handlers aceitam apenas métodos esperados e retornam dados públicos mínimos. Como não há sessão de cliente, CSRF não se aplica a identidade autenticada, mas o POST público deve validar payload, origem permitida quando aplicável e limites operacionais no BFF.

### 10.2.1 Antiabuso do Endpoint Público

O POST `/api/public/agendamentos` deve aplicar controle mínimo antiabuso antes da transação Firestore: limite por combinação de IP de origem e `telefoneNormalizado` em janela curta. A implementação pode usar coleção Firestore de controle operacional ou mecanismo equivalente server-side, desde que não exponha a regra ao cliente e não crie conta, login ou perfil. Ao exceder o limite, o BFF retorna erro genérico recuperável; a UI não deve informar contador, janela, suspeita de abuso ou detalhes técnicos.

### 10.3 Validação de Input

Validação cliente para UX e validação obrigatória no BFF. Usar funções puras locais para nome e telefone. O telefone é normalizado antes do envio. Nenhuma regra crítica deve depender apenas de estado visual. Regras de duplicidade, elegibilidade e status inicial devem ser validadas novamente na transação Firestore.

---

## 11. Performance

### 11.1 Métricas Alvo (Core Web Vitals)
- LCP: até 2,5s em conexão móvel razoável.
- INP: até 200ms nas interações de seleção e avanço.
- CLS: até 0,1; skeletons devem preservar dimensões.

### 11.2 Estratégias

Manter bundle pequeno com Client Components apenas no fluxo interativo. Não adicionar biblioteca de estado, i18n ou UI pesada. Usar skeletons estáveis conforme design. Evitar imagens/ilustrações. Route Handlers devem retornar payloads pequenos e públicos.

### 11.3 Bundle Size

Alvo: sem dependências runtime além das necessárias para dados/validação. Análise por build do Next se houver regressão perceptível; bundle analyzer não é dependência obrigatória da v1.

### 11.4 Biblioteca UI

Não adicionar biblioteca UI completa na v1. Material Design 3 é a linguagem visual obrigatória, não uma dependência obrigatória de componente. Os componentes em `components/ui/*.tsx` devem implementar localmente com Tailwind os princípios aplicáveis: tema dark, superfícies, estados selecionado/desabilitado/erro, foco visível, áreas de toque confortáveis e hierarquia clara.

---

## 12. Internacionalização (i18n)

### 12.1 Idiomas Suportados
- Default: pt-BR
- Adicionais: nenhum na v1

### 12.2 Solução

Sem biblioteca de i18n. Textos estáticos ficam em pt-BR no código; textos da tela de sucesso vêm da configuração pública com fallback pt-BR.

### 12.3 Considerações Regionais

Datas em exibição usam formato `dd/MM/yyyy`; payloads usam `YYYY-MM-DD`. Horários usam `HH:mm`. Telefone segue formato brasileiro na UI e normalizado para envio.

---

## 13. Acessibilidade (a11y)

### 13.1 Padrão Alvo

WCAG 2.1 AA.

### 13.2 Práticas Aplicadas

Labels explícitos em campos, botões com nomes acessíveis, seleção não dependente apenas de cor, foco visível, ordem de leitura linear, alvos de toque confortáveis e respeito a reduced motion conforme `design.md`.

### 13.3 Auditoria

ESLint com configuração Next já existente, testes com Testing Library por roles/labels e checagem E2E básica com Playwright/Lighthouse/axe quando a suíte for adicionada.

---

## 14. Feature Flags

### 14.1 Solução

Sem feature flags na v1.

### 14.2 Flags Envolvidas

| Flag | Propósito | Escopo | Default |
|------|-----------|--------|---------|
| N/A | N/A — jornada principal do produto. | N/A | N/A |

---

## 15. Mapeamento de User Stories para Definições Técnicas

| User Story (PRD) | Definição Técnica | Componentes / Páginas Envolvidos |
|------------------|-------------------|----------------------------------|
| US-01 | Formulário inicial com validação local de nome/telefone. | `IdentificationStep`, `cliente.ts`, `AppointmentFlow` |
| US-02 | Repository de profissionais + cards selecionáveis. | `profissionaisRepository`, `ScheduleStep`, `/api/public/profissionais` |
| US-03 | Consulta de dias liberados por profissional. | `disponibilidadeRepository`, `ScheduleStep`, `/dias` |
| US-04 | Consulta de horários elegíveis e seleção por chip. | `disponibilidadeRepository`, `TimeChip`, `/horarios` |
| US-05 | Estado completo do reducer renderizado em `SummaryList`. | `ReviewStep`, `appointmentReducer` |
| US-06 | Submit + tela de sucesso com configuração/fallback. | `agendamentosRepository`, `configuracaoRepository`, `SuccessStep` |
| US-07 | BFF aceita múltiplas solicitações aguardando e retorna estado público. | `/api/public/agendamentos`, `agendamentosRepository` |
| US-08 | DTOs públicos e mapping sem dados de terceiros. | Repositories, Route Handlers, `types.ts` |
| US-09 | Validação de duplicidade diária no BFF e erro de domínio na UI. | `/api/public/agendamentos`, `ReviewStep`, error mapping |

---

## 16. Dependências Externas

| Tipo | Nome | Versão | Motivo |
|------|------|--------|--------|
| Framework | `next` | 16.3.0 | App Router e Route Handlers. |
| Framework | `react`, `react-dom` | 19.2.8 | UI interativa. |
| Styling | `tailwindcss` | ^4 | Estilização já instalada. |
| UI / design language | Material Design 3 | N/A | Diretriz visual obrigatória para componentes, estados, toque, contraste e tema dark; implementada localmente com Tailwind, sem biblioteca UI pesada. |
| Dados | `firebase` / SDK server-side compatível | a definir na implementação | Firestore como fonte de dados e transações server-side nos Route Handlers. |
| Validação | N/A | N/A | Funções puras locais bastam na v1. |
| State | N/A | N/A | Context API + `useReducer`. |
| Teste unitário | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` | a definir na implementação | Testes de componentes/hooks. |
| Teste integração | `msw` | a definir na implementação | Mock na fronteira HTTP. |
| E2E | `@playwright/test` | a definir na implementação | Fluxo real e responsividade. |

---

## 17. Estratégia de Testes

> **Resumo**: 26 casos de teste | Unitários/Componentes: 8 | Integração: 14 | E2E: 4
> **Padrão**: Vitest + Testing Library para unidade/componentes, MSW para fronteira HTTP, Playwright para E2E.

### Rastreabilidade: Critérios de Aceite → Testes

| CA (PRD) | Descrição Resumida | Testes |
|----------|--------------------|--------|
| CA-01 | Primeira tela solicita somente nome/telefone. | CT-001 |
| CA-02 | Nome/telefone ausentes bloqueiam avanço. | CT-002, CT-004 |
| CA-03 | Identificação válida avança. | CT-003, CT-004, CT-017 |
| CA-04 | Somente profissionais ativos. | CT-005, CT-006, CT-017 |
| CA-05 | Somente dias liberados. | CT-007, CT-008, CT-017 |
| CA-06 | Somente horários elegíveis. | CT-009, CT-010, CT-017 |
| CA-07 | Duas solicitações no mesmo horário podem aguardar. | CT-011, CT-026 |
| CA-08 | Admin confirma apenas uma. | CT-012 |
| CA-09 | Mesmo telefone/dia bloqueado. | CT-013, CT-025 |
| CA-10 | Cancelado libera nova solicitação. | CT-014 |
| CA-11 | Revisão mostra resumo. | CT-015, CT-016, CT-017 |
| CA-12 | Solicitação de Agendamento nasce aguardando confirmação. | CT-011, CT-017, CT-018, CT-024 |
| CA-13 | Sucesso usa textos configurados. | CT-019 |
| CA-14 | Sucesso usa fallback seguro. | CT-020 |
| CA-15 | Não expõe dados de terceiros. | CT-006, CT-011, CT-021 |
| CA-16 | Fluxo utilizável em mobile. | CT-022, CT-023 |
| CA-17 | Cliente entende aguardando confirmação. | CT-017, CT-019, CT-020 |

### 17.1 Testes Unitários

#### Componente: `AppointmentFlow` (`app/agendamento/__tests__/AppointmentFlow.identificacao.test.tsx`)

Mock: nenhum

| CT | Teste | CA | Objetivo | Input | Expected | Mock | Setup (caminho legítimo) |
|----|-------|----|----------|-------|----------|------|--------------------------|
| CT-001 | renders_identification_without_account_fields | CA-01 | Primeira tela solicita somente nome e telefone. | estado inicial | campos Nome/Telefone e Continuar; sem senha/login | — | — |
| CT-002 | blocks_continue_without_required_fields | CA-02 | Campos obrigatórios ausentes bloqueiam avanço. | nome/telefone vazios | erros inline e etapa preservada | — | — |
| CT-003 | advances_with_valid_identification | CA-03 | Identificação válida avança para escolha. | nome e telefone válidos | heading de escolha visível | — | — |

#### Validação: `cliente.ts` (`app/agendamento/validation/__tests__/cliente.test.ts`)

| CT | Teste | CA | Objetivo | Input | Expected | Setup (caminho legítimo) |
|----|-------|----|----------|-------|----------|--------------------------|
| CT-004 | validates_and_normalizes_brazilian_phone | CA-02, CA-03 | Validar telefone normalizável e rejeitar inválidos. | tabela de telefones | válido normalizado; inválidos com erro | — |

#### Componente: `ReviewStep` (`app/agendamento/__tests__/AppointmentFlow.revisao.test.tsx`)

| CT | Teste | CA | Objetivo | Input | Expected | Mock | Setup (caminho legítimo) |
|----|-------|----|----------|-------|----------|------|--------------------------|
| CT-015 | renders_complete_review_summary | CA-11 | Revisão apresenta todos os dados antes do envio. | seleção completa | `SummaryList` completo e CTA final | — | percorrer o fluxo pela UI |

#### Store/Reducer: `appointmentReducer` (`app/agendamento/state/__tests__/appointmentFlow.test.ts`)

| CT | Teste | CA | Objetivo | Input | Expected | Mock | Setup (caminho legítimo) |
|----|-------|----|----------|-------|----------|------|--------------------------|
| CT-016 | blocks_review_with_incomplete_selection | CA-11 | Estado incompleto não transiciona para revisão. | sem horário | revisão bloqueada | — | chamada de reducer puro |

### 17.2 Testes de Integração

#### Repositories + BFF público (`app/agendamento/repositories/__tests__/*.integration.test.ts`)

Setup: MSW ou servidor HTTP local controlado; regras de store usam fake transacional determinístico de `agendamentoStore`.

| CT | Teste | CA | Objetivo | Fluxo | Validação | Setup (caminho legítimo) |
|----|-------|----|----------|-------|-----------|--------------------------|
| CT-005 | repository_filters_active_professionals | CA-04 | Retornar somente profissionais ativos. | HTTP → repository | inativo não aparece | boundary HTTP controlado |
| CT-011 | allows_two_pending_requests_same_slot | CA-07, CA-12, CA-15 | Aceitar solicitações concorrentes sem expor terceiros. | dois POSTs | ambos aguardando; sem dados privados | contrato público |
| CT-012 | public_contract_preserves_admin_single_confirmation_rule | CA-08 | Garantir que o contrato público grava dados suficientes para o admin confirmar só uma solicitação por slot. | criar duas solicitações no mesmo slot | ambas aguardando com mesmo slot e sem dados de terceiros na resposta | caminho público + store controlado |
| CT-013 | blocks_same_phone_same_day | CA-09 | Bloquear duplicidade diária ativa. | POST duplicado | erro de duplicidade | criar solicitação prévia pelo serviço |
| CT-014 | allows_after_cancelled_request | CA-10 | Cancelado não bloqueia nova solicitação. | solicitação cancelada + novo POST | novo aguardando | fixture/contrato controlado |
| CT-024 | public_post_rate_limit_is_generic | CA-12, CA-15 | Bloquear abuso básico sem revelar regra operacional. | exceder limite por IP + telefone | erro genérico; nenhum detalhe de limite | store/controlador antiabuso fake |
| CT-025 | store_transaction_blocks_same_phone_same_day | CA-09, CA-12 | Validar regra crítica no adapter transacional, sem depender da UI. | duas criações no mesmo dia com mesmo telefone | segunda criação rejeitada; nenhuma escrita parcial | fake transacional determinístico |
| CT-026 | store_transaction_allows_pending_same_slot_for_different_clients | CA-07, CA-15 | Validar concorrência aprovada para pendentes de terceiros. | duas criações no mesmo slot com telefones diferentes | ambas pendentes; respostas públicas sem dados de terceiros | fake transacional determinístico |

#### Fluxo com UI + API mockada (`app/agendamento/__tests__/AppointmentFlow.disponibilidade.integration.test.tsx`)

Setup: Testing Library + MSW

| CT | Teste | CA | Objetivo | Fluxo | Validação | Setup (caminho legítimo) |
|----|-------|----|----------|-------|-----------|--------------------------|
| CT-006 | empty_professionals_is_private | CA-04, CA-15 | Vazio sem detalhes administrativos. | identificação → profissionais=[] | mensagem genérica | boundary HTTP |
| CT-007 | shows_only_released_days | CA-05 | Mostrar somente dias liberados. | selecionar profissional | dias liberados selecionáveis | boundary HTTP |
| CT-008 | empty_days_blocks_progress | CA-05 | Dias vazios bloqueiam avanço. | profissional sem dias | mensagem contextual | boundary HTTP |
| CT-009 | shows_only_eligible_times | CA-06 | Mostrar somente horários elegíveis. | profissional + dia | chips liberados sem confirmado; pendentes de terceiros continuam elegíveis sem sinalização | boundary HTTP |
| CT-010 | empty_times_blocks_review | CA-06 | Horários vazios bloqueiam revisão. | dia sem horários | mensagem contextual | boundary HTTP |
| CT-018 | submit_failure_is_recoverable | CA-12 | Falha no envio não mostra sucesso. | revisão → POST 500 | banner e retry | boundary HTTP |

#### Sucesso com configuração (`app/agendamento/__tests__/SuccessScreen.config.integration.test.tsx`)

| CT | Teste | CA | Objetivo | Fluxo | Validação | Setup (caminho legítimo) |
|----|-------|----|----------|-------|-----------|--------------------------|
| CT-019 | success_uses_public_config | CA-13, CA-17 | Usar textos configurados mantendo aguardando confirmação. | submit aceito + config | textos configurados | boundary HTTP |
| CT-020 | success_uses_safe_fallback | CA-14, CA-17 | Fallback seguro quando config ausente. | submit aceito + config vazia | fallback seguro | boundary HTTP |

### 17.3 Testes End-to-End (E2E)

#### Fluxo: Cliente conclui solicitação (CT-017)
- **Framework**: Playwright
- **CA**: CA-03, CA-04, CA-05, CA-06, CA-11, CA-12, CA-17
- **Objetivo**: Validar o fluxo real até sucesso aguardando confirmação.
- **Pré-condições**: Aplicação rodando e dados públicos controlados.
- **Passos**: abrir `/`, preencher identificação, selecionar profissional/dia/horário, revisar, enviar.
- **Validações**: sucesso exibe "Agendamento solicitado!" e aguardando confirmação; não exibe linguagem definitiva.

#### Fluxo: Privacidade em slot concorrente (CT-021)
- **Framework**: Playwright
- **CA**: CA-15
- **Objetivo**: Garantir ausência de dados/quantidade de terceiros.
- **Pré-condições**: Provider controlado com concorrência interna no slot.
- **Passos**: percorrer fluxo para slot concorrente e inspecionar escolha, revisão e sucesso.
- **Validações**: nenhum nome, telefone ou contador de terceiros aparece.

#### Fluxo: Viewport mobile pequeno (CT-022)
- **Framework**: Playwright
- **CA**: CA-16
- **Objetivo**: Verificar usabilidade em 320px.
- **Pré-condições**: viewport 320x720.
- **Passos**: percorrer fluxo completo.
- **Validações**: sem overflow horizontal; controles visíveis e acionáveis; checagem a11y básica.

#### Fluxo: Reduced motion (CT-023)
- **Framework**: Playwright
- **CA**: CA-16
- **Objetivo**: Estados seguem perceptíveis sem depender de animação.
- **Pré-condições**: `prefers-reduced-motion: reduce`.
- **Passos**: gerar erro, selecionar opções e concluir fluxo.
- **Validações**: estados visíveis por texto/atributo/foco.

### 17.4 Cenários de Erro

| Cenário | CA | Objetivo | Trigger | UI Esperada |
|---------|----|----------|---------|-------------|
| Campos vazios | CA-02 | Bloquear avanço sem dados obrigatórios. | Continuar sem preencher | Erros inline |
| Telefone inválido | CA-02, CA-03 | Rejeitar telefone não normalizável. | Telefone curto | Erro de telefone |
| Profissionais/dias/horários vazios | CA-04, CA-05, CA-06 | Mostrar vazio contextual. | listas vazias | Mensagens do design |
| Duplicidade diária | CA-09 | Bloquear mesmo telefone no mesmo dia. | POST duplicado | "Você já possui um agendamento para este dia." |
| Falha no envio | CA-12 | Manter fluxo recuperável. | POST 500 | Banner + retry |
| Configuração ausente | CA-14 | Não bloquear sucesso. | config 404/vazia | fallback seguro |

Notas do QA: não cobrir consulta/cancelamento/remarcação, cores configuráveis e comunicação automática porque estão fora da v1. Persistência lossless dos casos em `_run/test-cases.json`. CT-024, CT-025 e CT-026 foram adicionados durante o challenge para cobrir antiabuso mínimo e regras transacionais da store.

---

## 18. Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Regra de concorrência entendida como bloqueio visual apenas | Média | Alto | Validar no BFF e testar via CT-011/CT-012. |
| Exposição de dados de terceiros em DTOs públicos | Média | Alto | DTOs mínimos e testes negativos de privacidade. |
| Integração Firestore mal isolada nos componentes | Média | Alto | Manter SDK Firebase apenas em Route Handlers/store server-side; UI acessa somente repositories via BFF. |
| Bundle crescer com libs desnecessárias | Baixa | Médio | Evitar libs de estado/i18n/UI na v1. |
| Falta de suíte de testes existente | Alta | Médio | Adicionar Vitest/MSW/Playwright como parte das tasks iniciais. |
| Divergência entre `aluno.md` e decisões refinadas sobre concorrência | Média | Alto | Tech Spec segue decisões aprovadas no PRD/pre-refinamento: pendentes concorrentes são permitidos; confirmação única é administrativa. |
| Endpoint público de escrita sofrer spam | Média | Alto | Aplicar limite antiabuso por IP + telefone no BFF antes da transação Firestore e retornar mensagem genérica. |
| Testes de concorrência dependerem de Firestore real ou timing | Média | Alto | Usar porta `agendamentoStore` com fake transacional determinístico para testes rápidos das regras críticas. |

---

## 19. Observações Técnicas

### ADRs Aplicáveis nesta Feature

Sem ADRs ativas no projeto.

### Candidatos a ADR

Nenhum candidato confirmado. A política de solicitações concorrentes foi avaliada anteriormente e não virou ADR porque o usuário indicou que não seria surpreendente sem contexto.

### Ajustes do Challenge

- Firestore canonizado como fonte de dados server-side dos Route Handlers públicos, alinhando a Tech Spec à stack obrigatória de `aluno.md`.
- Material Design 3 explicitado como diretriz obrigatória de implementação visual, sem alterar o `design.md` nesta sessão.
- Antiabuso mínimo canonizado no POST público por IP + telefone normalizado com erro genérico.
- Material Design 3 definido como linguagem visual implementada localmente com Tailwind, sem biblioteca UI pesada.
- Variáveis `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` fixadas como server-only.
- `agendamentoStore` definido como porta/adapter testável, com fake transacional determinístico para regras críticas.

### Termos de Domínio para Canonização Futura

Termos relevantes: `SolicitacaoAgendamento`, `Profissional`, `DiaDisponivel`, `HorarioDisponivel`, `ConfiguracaoSucesso`. `SolicitacaoAgendamento` foi canonizado no glossário global durante o challenge.

---

## 20. Checklist Final

- [x] Variante registrada (web) na seção 1
- [x] TECH_SPEC cobre todo o PRD (todas as US-XX mapeadas em 15)
- [x] Resumo técnico claro e objetivo (seção 2)
- [x] Arquitetura definida com componentes, páginas e camadas (seção 3)
- [x] Mapa de telas/rotas e jornadas descrito (seção 4)
- [x] Estados da UI por componente (seção 5)
- [x] Solução de gestão de estado e estrutura de stores (seção 6)
- [x] APIs consumidas, DTOs e mapping (seção 7)
- [x] Estratégia de cache/tempo real (seção 8)
- [x] Gerenciamento de erros mapeado (seção 9)
- [x] Segurança: tokens, XSS/CSRF, validação (seção 10)
- [x] Performance: métricas alvo e estratégias (seção 11)
- [x] i18n: idiomas, solução, considerações regionais (seção 12)
- [x] a11y: padrão WCAG e práticas (seção 13)
- [x] Feature flags listadas (seção 14)
- [x] Dependências externas listadas (seção 16)
- [x] Estratégia de testes via `agent-spec-qa-test-generator` integrada (seção 17, com rastreabilidade CA→CT)
- [x] Riscos técnicos identificados (seção 18)
- [x] Observações técnicas registradas (seção 19)
- [x] Arquivos envolvidos listados — árvore + criar/modificar/referência (seções 3.4-3.7)
- [x] Pronto para geração das TASKS
