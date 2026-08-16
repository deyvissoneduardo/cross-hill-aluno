# Glossário de Domínio — Projeto

## Termos

**Solicitação de Agendamento**:
Registro criado pelo cliente sem conta para pedir um horário, sempre pendente de confirmação administrativa até decisão posterior do administrador.
_Evitar_: agendamento confirmado, reserva, agendamento definitivo, `AgendamentoSolicitado`

## Relacionamentos
- Uma **Solicitação de Agendamento** pertence a exatamente um **Profissional**, uma data e um horário.
- Um mesmo horário pode ter múltiplas **Solicitações de Agendamento** pendentes, mas só pode ter uma confirmação administrativa posterior.

## Ambiguidades resolvidas
- "Agendamento" era usado tanto para o pedido criado pelo cliente quanto para uma marcação definitiva — resolvido: o cliente cria uma **Solicitação de Agendamento**; confirmação definitiva fica sob responsabilidade administrativa.
