# Pré-Refinamento — Brainstorm de Produto

> Artefato intermediário anterior ao PRD / INTENT / TaskCard, produto de um brainstorm em Tree of Thought: divergir os rumos possíveis, podar com o usuário e convergir.
>
> Legenda:
> - Linhas sem marcação = FATO.
> - `[HIPÓTESE]` = inferência da skill que precisa ser validada.
> - `[DÚVIDA]` = ponto em aberto, detalhado na seção 13.
> - `[fora do escopo do projeto]` = rumo que extrapola o que este projeto se propõe a ser.

---

## 1. Metadados

- **Nome da Ideia / Feature**: Agendamento do cliente sem conta
- **Fonte da ideia**: `aluno.md`
- **Autor**: usuário
- **Data**: 2026-08-11
- **Versão**: v1
- **Status**: Pronto para próxima etapa
- **Relacionados**: nenhum PRD/spec existente encontrado

---

## 2. Ideia Resumida (uma frase)

Criar a frente mobile-first do cliente para solicitar um horário com nome e telefone, sem conta ou login, escolhendo profissional, data e horário disponíveis e finalizando com sucesso configurável.

---

## 3. Esqueleto do Tema (Fase 1 — ramos da árvore)

| # | Ramo | Status (Fase 1) |
|---|------|-----------------|
| A | Fluxo mínimo sem conta | explorar |
| B | Disponibilidade e confirmação administrativa | explorar |
| C | Experiência mobile-first escura | explorar |
| D | Configuração pública de sucesso | explorar |
| E | Privacidade e limites do cliente | explorar |

---

## 4. Árvore de Rumos (Fase 2 — Tree of Thought)

### Ramo A — Fluxo mínimo sem conta

**Direções candidatas:**

- **A1 — Fluxo linear estrito**: o cliente informa nome e telefone, escolhe profissional/data/horário, revisa e solicita o agendamento.
  - _Exemplo:_ nome e telefone na primeira tela; seleção de agenda na segunda; sucesso após confirmação da solicitação.
  - _Viabilidade:_ totalmente alinhado ao briefing e ao app greenfield.
- **A2 — Fluxo com retomada local**: preservar dados temporários no navegador se a pessoa recarregar.
  - _Exemplo:_ após refresh, nome e telefone continuam preenchidos até finalizar.
  - _Viabilidade:_ útil, mas amplia expectativa de persistência sem ser essencial.
- **A3 — Consulta de agendamento existente**: cliente informa telefone para ver solicitação anterior.
  - _Exemplo:_ "Você já solicitou horário para 15/08".
  - _Viabilidade:_ pode colidir com privacidade e foge do objetivo único inicial.

**Direção escolhida**: A1 — decidido pelo usuário.
**Podadas / adiadas**: A2 adiada por não ser essencial à v1; A3 podada por ampliar escopo e risco de privacidade.

### Ramo B — Disponibilidade e confirmação administrativa

**Direções candidatas:**

- **B1 — Bloqueio estrito de horário no cliente**: cada horário aceita uma única solicitação ativa.
  - _Exemplo:_ se João solicitar 09:00, Maria não consegue solicitar 09:00.
  - _Viabilidade:_ estava no briefing original, mas foi substituída pela decisão do usuário nesta conversa.
- **B2 — Solicitação concorrente com triagem administrativa**: mais de um cliente pode solicitar o mesmo horário; todos entram como `AGUARDANDO_CONFIRMACAO`, e o administrador confirma apenas um.
  - _Exemplo:_ João e Maria solicitam 09:00; o administrador confirma João e rejeita ou remarca Maria manualmente.
  - _Viabilidade:_ requer que a experiência do cliente comunique claramente que a solicitação não garante confirmação.
- **B3 — Lista de espera para horários ocupados**: permitir interesse em horário indisponível.
  - _Exemplo:_ cliente pede aviso caso 09:00 volte a ficar livre.
  - _Viabilidade:_ `[fora do escopo do projeto]` para a frente cliente simples.

**Direção escolhida**: B2 — decidido pelo usuário; o administrador confirma apenas uma solicitação e trata as demais manualmente.
**Podadas / adiadas**: B1 podada por conflito com a decisão mais recente; B3 podada por criar produto adjacente de lista de espera.

### Ramo C — Experiência mobile-first escura

**Direções candidatas:**

- **C1 — Interface utilitária compacta**: poucas telas, hierarquia clara, áreas de toque grandes e foco em concluir rápido.
  - _Exemplo:_ formulário curto, calendário simples e chips de horário grandes.
  - _Viabilidade:_ alinhado ao uso com uma mão e ao escopo simples.
- **C2 — Experiência guiada com microcopy**: mais mensagens, dicas e explicações durante o fluxo.
  - _Exemplo:_ texto explicando que só dias liberados aparecem ativos.
  - _Viabilidade:_ pode ajudar em estados vazios e erros, mas pode deixar o fluxo menos direto.
- **C3 — Visual institucional/marketing**: primeira tela com banner, imagens e apresentação da academia.
  - _Exemplo:_ hero promocional antes do formulário.
  - _Viabilidade:_ `[fora do escopo do projeto]` porque o objetivo é agendamento direto.

**Direção escolhida**: C1 — decidido pelo usuário.
**Podadas / adiadas**: C2 limitada a mensagens de erro/vazio quando necessário; C3 podada por sair do fluxo objetivo.

### Ramo D — Configuração pública de sucesso

**Direções candidatas:**

- **D1 — Textos configuráveis na tela de sucesso**: título, descrição, regras, dicas e avisos vêm da configuração pública.
  - _Exemplo:_ "Agendamento solicitado!" e avisos de confirmação administrativa carregados da configuração.
  - _Viabilidade:_ explicitamente pedido e contido.
- **D2 — Tema visual configurável na experiência toda**: cores públicas alimentam o tema do app.
  - _Exemplo:_ cor primária do administrador aparece nos botões e seleção.
  - _Viabilidade:_ estava no briefing original, mas não foi selecionado pelo usuário para a convergência da v1.
- **D3 — CMS público amplo**: administrador configura textos de todas as telas.
  - _Exemplo:_ labels, títulos e textos do calendário editáveis.
  - _Viabilidade:_ amplia escopo e não é necessário para o fluxo mínimo.

**Direção escolhida**: D1 — decidido pelo usuário.
**Podadas / adiadas**: D2 adiada por não ter sido escolhida na convergência; D3 podada por ampliar escopo de conteúdo.

### Ramo E — Privacidade e limites do cliente

**Direções candidatas:**

- **E1 — Cliente enxerga apenas disponibilidade agregada**: mostrar disponível/indisponível, sem dados de outros clientes.
  - _Exemplo:_ 09:00 aparece solicitável ou indisponível sem nome, telefone ou motivo pessoal.
  - _Viabilidade:_ obrigatório pelo briefing.
- **E2 — Cliente com acesso mínimo de ação**: solicitar agendamento, sem cancelar, alterar ou confirmar.
  - _Exemplo:_ sucesso informa que o administrador ainda precisa confirmar.
  - _Viabilidade:_ alinhado ao objetivo simples, mas não foi escolhido explicitamente como ramo separado.
- **E3 — Autogerenciamento pelo cliente**: cancelar ou remarcar pelo telefone.
  - _Exemplo:_ link "alterar meu horário".
  - _Viabilidade:_ fora do escopo inicial; adiciona regras de identidade sem login.

**Direção escolhida**: E1 — decidido pelo usuário.
**Podadas / adiadas**: E2 absorvida como consequência do fluxo sem conta e da confirmação administrativa; E3 podada por ampliar escopo.

---

## 5. Problema

- **Qual é a dor real hoje?** O cliente precisa solicitar um horário sem passar por cadastro, login ou processo longo.
- **Como o problema aparece no dia a dia?** Uma pessoa quer escolher profissional, data e horário liberados e concluir a solicitação rapidamente pelo celular.
- **Quem sente o impacto?** Cliente final, que precisa de um fluxo simples; administrador, que precisa receber solicitações para confirmar manualmente.
- **Por que resolver agora?** O projeto está greenfield e precisa estabelecer a jornada principal antes de expandir regras administrativas.

---

## 6. Objetivo Principal

- **Qual é o resultado esperado ao final?** Permitir que o cliente solicite um agendamento em poucos passos, com status inicial de aguardando confirmação.
- **Qual mudança de comportamento/estado deve acontecer?** O cliente sai de "quero um horário" para "solicitação enviada ao administrador", sem criar conta.

---

## 7. Público / Usuário Envolvido

- **Persona primária**: cliente final sem conta.
- **Persona secundária**: administrador que confirma apenas uma solicitação por horário e rejeita ou remarca as demais manualmente.
- **Contexto de uso**: mobile-first, em celular, com fluxo curto e tema escuro.

---

## 8. Escopo Inicial (resultado da convergência)

Direções escolhidas na árvore de rumos que entram na primeira versão:

- [ ] A1 — fluxo linear estrito sem conta.
- [ ] B2 — solicitação concorrente com triagem administrativa.
- [ ] C1 — interface utilitária compacta, mobile-first e escura.
- [ ] D1 — textos configuráveis na tela de sucesso.
- [ ] E1 — cliente enxerga apenas disponibilidade agregada, sem dados de terceiros.

> Ponto de partida para o PRD/INTENT/TaskCard — não é definitivo.

---

## 9. Fora do Escopo (podado / adiado)

- A2 — retomada local dos dados temporários; adiada por não ser essencial à v1.
- A3 — consulta de agendamento existente; podada por ampliar escopo e risco de privacidade.
- B1 — bloqueio estrito de uma única solicitação ativa por horário; podada por conflito com a decisão mais recente do usuário.
- B3 — lista de espera; `[fora do escopo do projeto]`.
- C2 — microcopy extensiva; limitada a estados necessários de erro/vazio.
- C3 — visual institucional/marketing; `[fora do escopo do projeto]`.
- D2 — tema visual configurável na experiência toda; adiado.
- D3 — CMS público amplo; podado por ampliar escopo.
- E3 — cancelamento/remarcação pelo cliente; podado por exigir regras de identidade sem login.

---

## 10. Ancoramento no Projeto (guarda de escopo)

- **O que o projeto É** (CLAUDE.md / README): projeto Next.js inicial; `README.md` é o padrão do create-next-app; `CLAUDE.md` aponta para `AGENTS.md`; `AGENTS.md` exige atenção à versão local do Next.
- **PRDs / specs existentes consultados** (`/docs/specs/**/*.md` + `/docs/prds/**/*.md`):
  - nenhum arquivo encontrado em `docs/specs` ou `docs/prds`; não há sobreposição detectada.
- **Capacidades reutilizáveis** (apenas para viabilidade):
  - **Persistência**: não há camada implementada ainda; `firebase` não está instalado no `package.json`.
  - **Autenticação / autorização**: não há autenticação implementada; isso é coerente com a decisão de não ter login de cliente.
  - **Outros módulos internos**: `app/page.tsx`, `app/layout.tsx` e `app/globals.css` ainda são base do template Next.
- **Conflitos / sobreposições detectados**: conflito interno com `aluno.md` na regra de mesmo horário; a decisão mais recente do usuário permite múltiplas solicitações concorrentes e reserva a confirmação de apenas uma para o administrador.

---

## 11. Premissas e Decisões já tomadas

**Premissas** — suposições assumidas para que a ideia faça sentido:

- `[HIPÓTESE]` O administrador já terá ou terá em paralelo uma área para visualizar solicitações concorrentes, confirmar uma e rejeitar/remarcar as demais manualmente.
- `[HIPÓTESE]` A v1 pode abrir mão de cores configuráveis em toda a aplicação, mantendo apenas textos configuráveis no sucesso, porque o usuário escolheu D1 e não D2.
- `[HIPÓTESE]` O cliente deve entender que "solicitar" não significa confirmação definitiva.

**Decisões já tomadas (fora de negociação)**:

- O cliente não possui conta, login ou cadastro.
- O cliente informa apenas nome e telefone.
- O fluxo escolhido é A1.
- Para o mesmo horário, pode haver mais de uma solicitação em `AGUARDANDO_CONFIRMACAO`.
- O administrador confirma apenas uma solicitação por horário e rejeita/remarca as demais manualmente.
- A experiência escolhida é C1.
- Os textos da tela de sucesso escolhidos são D1.
- A privacidade escolhida é E1.

---

## 12. Riscos e Pontos de Atenção

- **Risco de produto / aceitação**: cliente acreditar que a solicitação já está confirmada. Mitigação: linguagem explícita de "aguardando confirmação" no resumo e sucesso.
- **Risco de escopo**: a triagem manual pode puxar funcionalidades administrativas não presentes nesta frente. Mitigação: registrar administração como dependência/adjacência, não como escopo da frente cliente.
- **Risco técnico ou operacional**: múltiplas solicitações no mesmo horário exigem clareza sobre como o administrador escolhe uma. Mitigação: levar a regra para PRD/Tech Spec antes de implementação.
- **Risco de privacidade / segurança / compliance**: disponibilidade não pode expor nome, telefone ou quantidade de interessados por horário. Mitigação: cliente vê apenas informação agregada.

---

## 13. Dúvidas em Aberto

Perguntas objetivas a responder antes da próxima etapa:

1. `[DÚVIDA]` A v1 deve manter a regra "mesmo telefone não pode solicitar dois horários no mesmo dia" mesmo permitindo múltiplas pessoas no mesmo horário?
2. `[DÚVIDA]` Se um cliente solicitar um horário já solicitado por outros, a interface deve avisar que existe concorrência ou manter apenas a mensagem genérica de aguardando confirmação?
3. `[DÚVIDA]` As cores configuráveis do briefing original ficam realmente fora da v1 ou devem voltar como requisito obrigatório?

---

## 14. Síntese do Brainstorm

- **Absorvido no escopo inicial (seção 8)**: A1, B2, C1, D1, E1.
- **Descartado com justificativa**: A3, B3, C3, D3 e E3 por ampliarem o produto além do fluxo simples; B1 por conflito com a decisão mais recente.
- **Adiado para v2/v3**: A2 e D2.
- **Provocações que mudaram o rumo**: o usuário substituiu a regra original de bloqueio estrito de horário por triagem administrativa manual, mantendo confirmação de apenas uma solicitação.

---

## 15. Recomendação de Framework

### 15.1 Complexidade Observada

| Dimensão | Valor detectado | Confirmação |
|---|---|---|
| Amplitude — # rumos/US que sobreviveram | 4+ | confirmado |
| Personas | múltiplas personas | inferido |
| Novidade | greenfield | inferido |
| Decisão arquitetural transversal nova? | sim — política de concorrência/triagem altera regra central de agendamento | inferido |

### 15.2 Framework Recomendado

**Escolhido**: `SDD`

**Justificativa**: Amplitude 4+ e novidade greenfield justificam PRD e Tech Spec formais antes de implementação. A mudança na política de concorrência também afeta o contrato do produto entre cliente e administrador, então precisa ficar rastreável antes de virar tarefa.

### 15.3 Alternativas Consideradas

**Por que NÃO miniSpec**: miniSpec seria leve demais para um fluxo greenfield com múltiplos ramos de produto, persona secundária administrativa e regra central divergindo do briefing original.

**Por que NÃO TaskCard**: TaskCard é subdimensionado porque não é ajuste pontual; a feature define a jornada principal do produto e regras de disponibilidade/privacidade que precisam de validação de produto.

### 15.4 Próximo Passo

```bash
/agent-spec-adr-create "política de solicitações concorrentes de agendamento"
/agent-spec-sdd-generate-prd "agendamento do cliente sem conta"
```

### 15.5 Quando Reconsiderar a Recomendação

- **Upgrade** se durante o PRD emergirem remarcação pelo cliente, lista de espera, comunicação automática ou área administrativa dentro do mesmo escopo.
- **Upgrade** se as cores configuráveis voltarem como requisito obrigatório em toda a experiência e exigirem design system formal.
- **Upgrade** se houver novas personas além de cliente e administrador.
- **Downgrade** se o escopo for reduzido para uma única tela estática de solicitação sem disponibilidade dinâmica.
- **Downgrade** se a regra de concorrência for removida e a feature virar apenas formulário + sucesso.

---

## 16. Checklist Final

- [x] Ideia resumida em uma frase clara
- [x] **Esqueleto (seção 3)** com 3-5 ramos, validado com o usuário na Fase 1
- [x] **Árvore de rumos (seção 4)**: cada ramo com direções candidatas + exemplo concreto + viabilidade + direção escolhida/podada
- [x] Rumos fora do escopo do projeto marcados como `[fora do escopo do projeto]`
- [x] Problema, público, escopo inicial e fora de escopo delimitados
- [x] **Ancoramento (seção 10)** preenchido com PRDs/capacidades concretos
- [x] Toda inferência marcada `[HIPÓTESE]`; dúvidas listadas como perguntas objetivas
- [x] **Síntese (seção 14)** registra absorvido / descartado / adiado
- [x] **Complexidade (15.1)** preenchida
- [x] **Framework recomendado (15.2)** justificado com 2 dimensões decisivas
- [x] **Alternativas (15.3)** explicam por que NÃO o vizinho mais próximo
- [x] **Comando exato (15.4)** escrito
- [x] **Gatilhos (15.5)** de reclassificação listados
- [x] Pronto para alimentar PRD / INTENT / TaskCard
