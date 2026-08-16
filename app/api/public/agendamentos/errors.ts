/**
 * Contrato público de erros do POST `/api/public/agendamentos`.
 *
 * Fonte de verdade: `docs/specs/features/agendamento-cliente/v1/tech_spec.md` (§9 Gerenciamento
 * de Erros, §10.2.1 Antiabuso). Mapeia os erros de domínio internos (`SlotIndisponivelError`,
 * `TelefoneDuplicadoNoDiaError` de `lib/firebase/agendamentoStore.ts`, T4) e o limite antiabuso
 * (`rateLimit.ts`) para um contrato HTTP público estável — código, status e mensagem GENÉRICA
 * de exibição ao cliente.
 *
 * As mensagens públicas seguem LITERALMENTE a tabela do tech_spec §9, não a mensagem do erro de
 * domínio que originou o mapeamento: a mensagem interna de T4 existe para quem lê o código-fonte
 * do domínio, a pública é contrato de UI (podem divergir de propósito). Route Handlers (T7/T8)
 * usam apenas os helpers abaixo — nunca constroem `Response` a partir de `error.message` de um
 * erro de domínio interno, o que evitaria o desvio.
 *
 * Nenhum símbolo aqui expõe nome, telefone, IP, identificador de outra Solicitação de
 * Agendamento concorrente ou detalhe de concorrência/infraestrutura (RN-13, CA-15).
 */

import 'server-only'

import { SlotIndisponivelError, TelefoneDuplicadoNoDiaError } from '@/lib/firebase/agendamentoStore'

/** Código estável do erro público — a UI usa para decidir banner/ação, nunca exibe cru. */
export type CodigoErroPublicoAgendamento =
  | 'PAYLOAD_INVALIDO'
  | 'SLOT_INDISPONIVEL'
  | 'TELEFONE_DUPLICADO_NO_DIA'
  | 'LIMITE_ANTIABUSO'
  | 'ERRO_SERVIDOR'

/**
 * Erro de domínio público do POST de agendamento. Contrato estável: `codigo` (para a UI mapear
 * banner/ação), `status` (HTTP) e a mensagem herdada de `Error` (texto genérico pronto para
 * exibição). Nunca carrega nome, telefone, IP, identificador de Solicitação de Agendamento de
 * terceiro ou detalhe de concorrência/infraestrutura.
 */
export class ErroDominioAgendamento extends Error {
  constructor(
    readonly codigo: CodigoErroPublicoAgendamento,
    readonly status: number,
    mensagem: string
  ) {
    super(mensagem)
    this.name = 'ErroDominioAgendamento'
  }
}

/**
 * Payload inválido (nome/telefone/slot ausente ou malformado pela validação de `cliente.ts`,
 * T3) — nunca chega à transação Firestore. `mensagem` já deve ser um texto público seguro (as
 * mensagens de `validarNomeCliente`/`validarTelefoneCliente` já nascem genéricas).
 */
export function erroPayloadInvalido(mensagem: string): ErroDominioAgendamento {
  return new ErroDominioAgendamento('PAYLOAD_INVALIDO', 400, mensagem)
}

/**
 * Mapeia `SlotIndisponivelError` (T4) para o contrato público. Reaproveita a própria mensagem
 * de T4 porque ela já nasceu genérica por design — mesmo texto tanto para horário inelegível
 * quanto para slot já `CONFIRMADO` (ver JSDoc de `SlotIndisponivelError`).
 */
export function erroIndisponibilidade(): ErroDominioAgendamento {
  return new ErroDominioAgendamento(
    'SLOT_INDISPONIVEL',
    409,
    'Este horário não está mais disponível.'
  )
}

/**
 * Mapeia `TelefoneDuplicadoNoDiaError` (T4) para o contrato público. A mensagem pública segue
 * EXATAMENTE `tech_spec.md` §9 (linha "Duplicidade diária") — deliberadamente distinta da
 * mensagem interna do erro de domínio, porque a tabela §9 é a fonte de verdade do texto de UI.
 */
export function erroDuplicidade(): ErroDominioAgendamento {
  return new ErroDominioAgendamento(
    'TELEFONE_DUPLICADO_NO_DIA',
    409,
    'Você já possui um agendamento para este dia.'
  )
}

/**
 * Limite antiabuso excedido (`tech_spec.md` §10.2.1 e §9, linha "Limite antiabuso"). Mensagem
 * deliberadamente genérica — nunca informa contador, janela, IP ou telefone (§10.2.1: "a UI não
 * deve informar contador, janela, suspeita de abuso ou detalhes técnicos").
 */
export function erroLimiteAntiabuso(): ErroDominioAgendamento {
  return new ErroDominioAgendamento(
    'LIMITE_ANTIABUSO',
    429,
    'Não foi possível concluir sua solicitação. Tente novamente mais tarde.'
  )
}

/**
 * Falha inesperada de servidor (`tech_spec.md` §9, linha "Servidor (5xx)"). Usado pelo Route
 * Handler (T7/T8) como fallback de qualquer erro não mapeado — nunca propaga a mensagem/stack
 * do erro original ao cliente.
 */
export function erroServidor(): ErroDominioAgendamento {
  return new ErroDominioAgendamento(
    'ERRO_SERVIDOR',
    500,
    'Não foi possível concluir sua solicitação. Tente novamente.'
  )
}

/**
 * Mapeia qualquer erro lançado por `agendamentoStore.criarSolicitacaoAgendamento` (T4) para o
 * contrato público — isola o Route Handler de precisar importar/conhecer os erros de domínio
 * internos (`SlotIndisponivelError`, `TelefoneDuplicadoNoDiaError`) e de decidir mensagens.
 * Qualquer erro não reconhecido (rede, bug, exceção do SDK Firestore) cai em `erroServidor()`
 * — nunca propaga detalhe interno ao cliente.
 */
export function mapearErroDominioAgendamento(erro: unknown): ErroDominioAgendamento {
  if (erro instanceof SlotIndisponivelError) {
    return erroIndisponibilidade()
  }
  if (erro instanceof TelefoneDuplicadoNoDiaError) {
    return erroDuplicidade()
  }
  return erroServidor()
}
