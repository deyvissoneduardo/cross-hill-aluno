# PRD -- Product Requirements Document (O QUE / POR QUÊ)

## 1. Metadados
- **Nome da Feature/Projeto**: Agendamento do cliente sem conta
- **Responsável/Autor**: usuário
- **Data**: 2026-08-11
- **Versão**: v1
- **Status**: Revisão
- **Relacionados**: `docs/specs/features/agendamento-cliente/v1/pre-refinement.md`, `aluno.md`

---

## 2. Contexto & Motivação
- **Qual problema ou dor existe hoje?** O cliente precisa solicitar um horário sem criar conta, fazer login ou passar por um cadastro completo.
- **Como funciona atualmente?** O projeto ainda não possui uma jornada de agendamento para o cliente final.
- **Por que isso precisa ser resolvido agora?** Esta é a jornada principal do produto e precisa estabelecer as regras de solicitação antes de evoluir para áreas administrativas ou fluxos complementares.
- **Quem sofre o impacto do problema?** Cliente final, que precisa de uma solicitação rápida pelo celular; administrador, que precisa receber solicitações claras para confirmar manualmente.

---

## 3. Objetivo da Feature
- **O que se deseja alcançar?** Permitir que uma pessoa solicite um horário informando apenas nome e telefone, escolhendo profissional, dia e horário elegíveis.
- **Qual mudança de comportamento esta feature deve gerar?** O cliente sai de uma intenção informal de agendar para uma solicitação registrada e aguardando confirmação administrativa.
- **Qual o resultado final esperado do ponto de vista do usuário?** O cliente entende que o horário foi solicitado, mas ainda não está definitivamente confirmado.

---

## 4. Escopo
### 4.1 O que está incluído (dentro do O QUE)
- [ ] Identificação do cliente apenas com nome e telefone.
- [ ] Fluxo linear de solicitação sem conta, senha, login ou perfil.
- [ ] Exibição de profissionais ativos disponíveis para escolha.
- [ ] Exibição apenas de dias previamente liberados para agendamento.
- [ ] Exibição de horários elegíveis para solicitação conforme profissional e dia escolhidos.
- [ ] Permissão para múltiplos clientes solicitarem o mesmo horário enquanto aguardam confirmação.
- [ ] Regra de que apenas uma solicitação por horário será confirmada pelo administrador.
- [ ] Bloqueio de mais de uma solicitação do mesmo telefone no mesmo dia, exceto quando a solicitação anterior estiver cancelada.
- [ ] Revisão dos dados antes da solicitação final.
- [ ] Tela de sucesso com linguagem de aguardando confirmação.
- [ ] Textos públicos configuráveis na tela de sucesso, com fallback seguro quando não houver configuração.
- [ ] Experiência mobile-first, escura, simples e acessível.
- [ ] Proteção de privacidade para não expor dados de outros clientes.

### 4.2 O que está explicitamente fora do escopo
- [ ] Cadastro, login, senha, perfil, recuperação de senha ou login social.
- [ ] Consulta de agendamento existente pelo cliente.
- [ ] Cancelamento ou remarcação pelo cliente.
- [ ] Lista de espera.
- [ ] Comunicação automática para clientes não confirmados.
- [ ] Área administrativa.
- [ ] Textos configuráveis em todas as telas.
- [ ] Cores configuráveis na v1.
- [ ] Página institucional, marketing ou apresentação da academia.
- [ ] Exposição de quantidade, nome, telefone ou detalhes de outros clientes interessados no mesmo horário.

---

## 5. Usuários & Personas
- **Quem é o usuário principal?** Cliente final sem conta, usando principalmente celular.
- **Qual é seu objetivo ao usar essa feature?** Solicitar um horário com o menor número possível de etapas e sem credenciais.
- **Quais dores/dificuldades essa feature resolve pra ele?** Remove cadastro, reduz fricção, evita confusão sobre disponibilidade e deixa claro que a confirmação depende do administrador.

### 5.1 Histórias de Usuário (User Stories)
- **US-01**: Como cliente final, quero informar meu nome e telefone para iniciar uma solicitação sem criar conta.
- **US-02**: Como cliente final, quero escolher um profissional ativo para solicitar um horário com a pessoa desejada.
- **US-03**: Como cliente final, quero escolher apenas dias liberados para não tentar agendar em datas indisponíveis.
- **US-04**: Como cliente final, quero escolher um horário elegível para enviar minha solicitação ao administrador.
- **US-05**: Como cliente final, quero revisar os dados antes de confirmar para evitar enviar uma solicitação incorreta.
- **US-06**: Como cliente final, quero receber uma mensagem de sucesso que deixe claro que o agendamento aguarda confirmação.
- **US-07**: Como administrador, quero que mais de um cliente possa solicitar o mesmo horário para eu confirmar apenas uma solicitação e tratar as demais manualmente.
- **US-08**: Como cliente final, quero que meus dados e os dados de outras pessoas permaneçam privados durante o fluxo.
- **US-09**: Como cliente final, quero ser impedido de solicitar dois horários no mesmo dia com o mesmo telefone para evitar duplicidade.

---

## 6. Regras de Negócio (alto nível)
- **RN-01** -- O cliente não deve ter conta, login, senha ou perfil.
- **RN-02** -- Nome e telefone são obrigatórios para iniciar a solicitação.
- **RN-03** -- O telefone identifica o cliente para regras de duplicidade diária.
- **RN-04** -- Apenas profissionais ativos podem aparecer para o cliente.
- **RN-05** -- Apenas dias previamente liberados podem ser selecionados.
- **RN-06** -- Horários devem ser apresentados conforme profissional e dia escolhidos.
- **RN-07** -- Um horário pode receber múltiplas solicitações enquanto estiver aguardando confirmação administrativa.
- **RN-08** -- O administrador pode confirmar apenas uma solicitação por profissional, dia e horário.
- **RN-09** -- Solicitações não confirmadas pelo administrador devem ser rejeitadas ou remarcadas manualmente fora da frente do cliente.
- **RN-10** -- O mesmo telefone não pode ter duas solicitações ativas no mesmo dia.
- **RN-11** -- Solicitações canceladas não contam para a regra de duplicidade diária.
- **RN-12** -- Todo novo agendamento solicitado pelo cliente nasce aguardando confirmação.
- **RN-13** -- A experiência não deve revelar dados ou quantidade de outros clientes.
- **RN-14** -- A tela de sucesso deve usar textos públicos configuráveis quando existirem; quando não existirem, deve apresentar textos seguros que não indiquem confirmação definitiva.

---

## 7. Fluxo Comportamental (não técnico)
### 7.1 Fluxo Principal
1. O cliente acessa a jornada de agendamento.
2. O sistema solicita nome e telefone.
3. O cliente informa nome e telefone e continua.
4. O sistema apresenta profissionais ativos.
5. O cliente escolhe um profissional.
6. O sistema apresenta dias liberados para esse profissional.
7. O cliente escolhe um dia liberado.
8. O sistema apresenta horários elegíveis para solicitação.
9. O cliente escolhe um horário.
10. O sistema apresenta um resumo com nome, profissional, data e horário.
11. O cliente confirma o envio da solicitação.
12. O sistema registra a solicitação como aguardando confirmação.
13. O sistema apresenta uma tela de sucesso com textos públicos e linguagem de aguardando confirmação.

### 7.2 Fluxos Alternativos
- Se nome ou telefone estiverem ausentes ou inválidos, o sistema deve orientar o cliente a corrigir antes de avançar.
- Se não houver profissionais ativos, o sistema deve informar indisponibilidade sem expor detalhes administrativos.
- Se não houver dias liberados, o sistema deve informar que não há datas disponíveis.
- Se não houver horários elegíveis para o dia escolhido, o sistema deve informar que não há horários disponíveis.
- Se o mesmo telefone já tiver solicitação ativa no mesmo dia, o sistema deve bloquear a nova solicitação e informar que já existe agendamento para aquele dia.
- Se houver outras solicitações aguardando para o mesmo horário, o sistema deve manter a mensagem genérica de aguardando confirmação, sem revelar concorrência.
- Se a solicitação não puder ser concluída, o sistema deve apresentar mensagem amigável e permitir nova tentativa.

---

## 8. Critérios de Aceite (O QUE deve acontecer)
- [ ] **CA-01**: DADO que o cliente acessa o fluxo QUANDO a primeira tela é apresentada ENTÃO o sistema solicita apenas nome e telefone.
- [ ] **CA-02**: DADO que nome ou telefone estão ausentes QUANDO o cliente tenta continuar ENTÃO o sistema bloqueia o avanço e orienta a correção.
- [ ] **CA-03**: DADO que o cliente informa nome e telefone válidos QUANDO continua ENTÃO o sistema permite avançar para a escolha de agendamento.
- [ ] **CA-04**: DADO que existem profissionais ativos QUANDO o cliente chega à etapa de escolha ENTÃO somente profissionais ativos são apresentados.
- [ ] **CA-05**: DADO que existem dias liberados QUANDO o cliente escolhe um profissional ENTÃO apenas esses dias podem ser selecionados.
- [ ] **CA-06**: DADO que o cliente escolhe profissional e dia QUANDO horários são apresentados ENTÃO apenas horários elegíveis para solicitação aparecem como selecionáveis.
- [ ] **CA-07**: DADO que dois clientes escolhem o mesmo profissional, dia e horário QUANDO ambos enviam solicitação ENTÃO ambas podem ficar aguardando confirmação administrativa.
- [ ] **CA-08**: DADO que há múltiplas solicitações para o mesmo profissional, dia e horário QUANDO o administrador avaliar essas solicitações ENTÃO apenas uma poderá ser confirmada.
- [ ] **CA-09**: DADO que o mesmo telefone já possui solicitação ativa em um dia QUANDO tenta solicitar outro horário nesse mesmo dia ENTÃO o sistema bloqueia a nova solicitação.
- [ ] **CA-10**: DADO que a solicitação anterior do telefone naquele dia está cancelada QUANDO o cliente solicita novo horário ENTÃO o sistema permite a solicitação.
- [ ] **CA-11**: DADO que o cliente escolheu nome, telefone, profissional, dia e horário QUANDO chega à revisão ENTÃO o sistema apresenta o resumo antes do envio final.
- [ ] **CA-12**: DADO que o cliente confirma o envio QUANDO a solicitação é aceita ENTÃO o agendamento nasce aguardando confirmação, sem indicar confirmação definitiva.
- [ ] **CA-13**: DADO que a tela de sucesso é apresentada QUANDO existem textos públicos configurados ENTÃO o sistema apresenta esses textos.
- [ ] **CA-14**: DADO que a tela de sucesso é apresentada QUANDO não existem textos públicos configurados ENTÃO o sistema apresenta textos seguros de fallback.
- [ ] **CA-15**: DADO que há outras solicitações no mesmo horário QUANDO o cliente visualiza ou conclui o fluxo ENTÃO o sistema não revela nomes, telefones, quantidade de interessados ou detalhes de terceiros.
- [ ] **CA-16**: DADO que o cliente usa a jornada em celular QUANDO interage com qualquer etapa ENTÃO o fluxo permanece legível, direto e utilizável em telas pequenas.
- [ ] **CA-17**: DADO que o cliente concluiu a solicitação QUANDO lê a mensagem final ENTÃO entende que precisa aguardar confirmação administrativa.

---

## 9. Restrições & Considerações
- A experiência deve ser mobile-first e funcionar bem em telas pequenas.
- A experiência deve ser predominantemente escura, com boa legibilidade e contraste.
- O fluxo deve permanecer curto e sem etapas desnecessárias.
- O cliente não deve receber linguagem que indique confirmação definitiva.
- A confirmação de apenas uma solicitação por horário é responsabilidade administrativa.
- A frente do cliente não deve incluir mecanismos de cancelamento, remarcação ou autogerenciamento.
- A disponibilidade e os textos públicos dependem de informações externas à jornada do cliente. `[DELEGAR_TECH_SPEC]`
- Regras críticas de elegibilidade, duplicidade e confirmação não devem depender apenas da percepção visual do cliente. `[DELEGAR_TECH_SPEC]`

---

## 10. Métricas de Sucesso
- Percentual de clientes que concluem a solicitação após iniciar o fluxo.
- Tempo médio para concluir uma solicitação.
- Taxa de abandono por etapa.
- Quantidade de tentativas bloqueadas por telefone duplicado no mesmo dia.
- Percentual de solicitações que chegam com dados completos e revisáveis pelo administrador.
- Redução de dúvidas do cliente sobre o status "aguardando confirmação".

---

## 11. Roadmap / Fases
- **Fase 1:** Fluxo principal de identificação, escolha, revisão e sucesso aguardando confirmação.
- **Fase 2:** Refinamento de estados vazios, mensagens de erro e tratamento de indisponibilidade.
- **Fase 3:** Melhorias futuras fora da v1, como retomada local, cores configuráveis, consulta de solicitação, remarcação ou comunicação automática.

---

## 12. Rastreabilidade de User Stories

| User Story | Descrição Resumida | Critério de Aceite Relacionado |
|------------|-------------------|-------------------------------|
| US-01 | Identificação sem conta | CA-01, CA-02, CA-03 |
| US-02 | Escolha de profissional ativo | CA-04 |
| US-03 | Escolha de dia liberado | CA-05 |
| US-04 | Escolha de horário elegível | CA-06, CA-07 |
| US-05 | Revisão antes do envio | CA-11 |
| US-06 | Sucesso aguardando confirmação | CA-12, CA-13, CA-14, CA-17 |
| US-07 | Triagem administrativa de concorrência | CA-07, CA-08 |
| US-08 | Privacidade durante o fluxo | CA-15 |
| US-09 | Bloqueio de duplicidade diária por telefone | CA-09, CA-10 |
| US-01, US-02, US-03, US-04, US-05, US-06, US-08, US-09 | Experiência mobile-first | CA-16 |

---

## 13. Checklist Final
- [x] PRD descreve apenas O QUE / POR QUÊ
- [x] Escopo fechado
- [x] User Stories definidas e numeradas (US-XX)
- [x] Critérios de aceite claros
- [x] Tabela de rastreabilidade preenchida
- [x] Pronto para criar o TECH_SPEC (COMO)
