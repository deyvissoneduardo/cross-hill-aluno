# TASK PLAN – Plano de Execução das Tasks

## 1. Identificação
- **Feature/Projeto**: Agendamento do cliente sem conta
- **Responsável (Tech Lead)**: usuário
- **Data**: 2026-08-11
- **Status**: Rascunho
- **TECH_SPEC**: `docs/specs/features/agendamento-cliente/v1/tech_spec.md`
- **PRD**: `docs/prds/features/agendamento-cliente/v1/prd.md`

---

## 2. Objetivo do Task Plan
Executar a frente pública de solicitação de agendamento sem conta, com BFF público em Next.js, Firestore server-side, fluxo mobile-first acessível, privacidade de terceiros e testes automatizados por camada. Todas as tasks originalmente marcadas com risco alto foram quebradas em três ou mais tasks `low`/`medium`.

---

## 3. Macro-Fases
- **Fase 1 – Fundação técnica e contratos**
  - Objetivo: preparar testes, contratos públicos, validações e store transacional testável.
  - Tasks: T1, T2, T3, T4
- **Fase 2 – Dados públicos e BFF**
  - Objetivo: implementar contratos HTTP públicos, escrita pública segura e clients `fetch` tipados.
  - Tasks: T5, T6, T7, T8, T9
- **Fase 3 – Fluxo de UI**
  - Objetivo: implementar componentes visuais, estado local e etapas do fluxo.
  - Tasks: T10, T11, T12, T13
- **Fase 4 – Integração final e validação E2E**
  - Objetivo: integrar a rota `/`, layout global, tokens e testes E2E.
  - Tasks: T14

---

## 4. Lista de Tasks

| ID | Nome da Task | Arquivo | Fase | Dependências | Pode Rodar em Paralelo? (derivado) | Risk | Status |
|----|--------------|---------|------|--------------|------------------------------------|------|--------|
| T1 | Configuração da suíte de testes web | [T1](tasks/T1.md) | 1 | — | Não | medium | Concluído |
| T2 | Contratos públicos de agendamento | [T2](tasks/T2.md) | 1 | T1 | Não | low | Concluído |
| T3 | Validação do cliente e Firebase Admin server-only | [T3](tasks/T3.md) | 1 | T1, T2 | Não | medium | Concluído |
| T4 | Store Firestore transacional e fake determinístico | [T4](tasks/T4.md) | 1 | T1, T2, T3 | Não | medium | Concluído |
| T5 | BFF público de leitura | [T5](tasks/T5.md) | 2 | T1, T2, T4 | Não | medium | Concluído |
| T6 | Contrato de erros públicos e antiabuso do POST | [T6](tasks/T6.md) | 2 | T1, T2, T3, T4 | Não | medium | Em Progresso |
| T7 | POST público de agendamento: validação e caminho feliz | [T7](tasks/T7.md) | 2 | T1, T2, T3, T4, T6 | Não | medium | Bloqueado (dependência T6) |
| T8 | POST público de agendamento: concorrência e duplicidade | [T8](tasks/T8.md) | 2 | T1, T2, T3, T4, T6, T7 | Não | medium | Bloqueado (dependência T4, T6, T7) |
| T9 | Repositories client-side tipados | [T9](tasks/T9.md) | 2 | T1, T2, T5, T7, T8 | Não | low | Bloqueado (dependência T5, T7, T8) |
| T10 | Componentes UI globais Material Design 3 com Tailwind | [T10](tasks/T10.md) | 3 | T1, T2 | Não | medium | Concluído |
| T11 | Estado local e etapa de identificação | [T11](tasks/T11.md) | 3 | T1, T2, T3, T9, T10 | Não | low | Bloqueado (dependência T9) |
| T12 | Etapa de escolha de profissional, dia e horário | [T12](tasks/T12.md) | 3 | T9, T10, T11 | Não | medium | Bloqueado (dependência T9, T11) |
| T13 | Revisão, envio e sucesso aguardando confirmação | [T13](tasks/T13.md) | 3 | T9, T10, T11, T12 | Não | medium | Bloqueado (dependência T9, T11, T12) |
| T14 | Integração da rota pública e validação E2E | [T14](tasks/T14.md) | 4 | T10, T11, T12, T13 | Não | medium | Bloqueado (dependência T11, T12, T13) |

### 4.1 Ordem de Execução

```text
T1 -> T2 -> T3 -> T4
T4 -> T5
T4 -> T6 -> T7 -> T8
T5 + T7 + T8 -> T9
T1 + T2 -> T10
T3 + T9 + T10 -> T11
T9 + T10 + T11 -> T12
T9 + T10 + T11 + T12 -> T13
T10 + T11 + T12 + T13 -> T14
```

---

## 5. Rastreabilidade: User Stories → Tasks

| User Story (PRD) | Definição Técnica (SPEC) | Tasks Relacionadas | Status |
|------------------|--------------------------|--------------------|--------|
| US-01 | Formulário inicial com validação local de nome/telefone. | T1, T3, T10, T11, T14 | Coberta |
| US-02 | Repository de profissionais + cards selecionáveis. | T1, T2, T4, T5, T9, T10, T12, T14 | Coberta |
| US-03 | Consulta de dias liberados por profissional. | T1, T2, T4, T5, T9, T10, T12, T14 | Coberta |
| US-04 | Consulta de horários elegíveis e seleção por chip. | T1, T2, T4, T5, T7, T8, T9, T10, T12, T14 | Coberta |
| US-05 | Estado completo do reducer renderizado em `SummaryList`. | T10, T11, T13, T14 | Coberta |
| US-06 | Submit + tela de sucesso com configuração/fallback. | T4, T5, T6, T7, T8, T9, T10, T13, T14 | Coberta |
| US-07 | BFF aceita múltiplas solicitações aguardando e retorna estado público. | T4, T7, T8, T14 | Coberta |
| US-08 | DTOs públicos e mapping sem dados de terceiros. | T2, T4, T5, T7, T8, T9, T12, T13, T14 | Coberta |
| US-09 | Validação de duplicidade diária no BFF e erro de domínio na UI. | T3, T4, T6, T8, T9, T13 | Coberta |

---

## 6. Dependências Gerais
- O projeto ainda não possui suíte de testes; T1 precisa ser executada antes das tasks com testes.
- Credenciais reais Firebase não entram no repositório. T3 usa variáveis server-only e fakes em testes.
- A antiga task high de fundação foi quebrada em T1, T2 e T3.
- A antiga task high de POST público foi quebrada em T6, T7 e T8.
- Tasks do BFF de escrita não rodam em paralelo porque T7 depende dos contratos de erro/antiabuso de T6 e T8 depende do handler base de T7.
- Tasks de UI referenciam `design.md` como contrato visual.
- `docs/specs/features/agendamento-cliente/v1/_run/test-cases.json` é atualizado com distribuição `task_id` por CT.

---

## 7. Critérios de Conclusão da Feature
A feature será considerada concluída quando:
- [ ] Todas as 14 tasks estiverem completas.
- [ ] Não existir task com risco alto neste plano.
- [ ] Testes unitários, integração e E2E definidos nas tasks estiverem implementados.
- [ ] `next build`, lint e suites configuradas executarem sem falhas.
- [ ] Todos os critérios do PRD CA-01 a CA-17 estiverem cobertos.
- [ ] Nenhuma resposta pública expuser dados ou quantidade de terceiros.
- [ ] A UI funcionar em 320px, com foco visível e reduced motion respeitado.
- [ ] O fluxo final não indicar confirmação definitiva.

---

## 8. Riscos & Mitigações
- Endpoint público de escrita sofrer abuso → mitigado em T6/T7/T8 com antiabuso genérico, handler base e regras isoladas.
- Firestore vazar para client bundle → mitigado em T3/T9 com server-only e testes de import boundary.
- Concorrência depender de timing real → mitigado em T4 com fake transacional determinístico.
- Fragmentação de handlers e contratos → mitigado separando contratos T2, store T4, leitura T5 e escrita T6/T7/T8.
- UI mobile quebrar só no fim → mitigado em T10 por contratos de componentes e em T14 por E2E 320px.

---

## 9. Checklist Final
- [x] Task Plan completo
- [x] Tasks mapeadas
- [x] Dependências validadas
- [x] Rastreabilidade User Stories → Tasks preenchida
- [x] Paralelismo derivado pelo DAG, símbolos e paths
- [x] Tasks de risco alto quebradas em 3+ tasks `low`/`medium`
- [x] Pronto para revisão do usuário
