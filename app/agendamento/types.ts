/**
 * Modelos de domínio e DTOs públicos da feature "Agendamento do cliente sem conta".
 *
 * Fonte de verdade: `docs/specs/features/agendamento-cliente/v1/tech_spec.md` (§7.2, §7.3, §7.4).
 * Termo canônico "Solicitação de Agendamento": `docs/specs/domain-glossary.md`.
 *
 * Estes contratos são consumidos por store, BFF e UI sem depender do Firestore —
 * nenhum tipo aqui importa ou representa campos internos de documento (paths de
 * coleção, timestamps administrativos, `telefoneNormalizado`/`telefoneExibicao`/
 * `nomeCliente` de terceiros). Nenhum tipo expõe nome, telefone, quantidade ou
 * identificador de outras Solicitações de Agendamento concorrentes (RN-13, CA-15).
 */

/** Status possíveis de uma Solicitação de Agendamento (RN-08, RN-11, RN-12). */
export type StatusSolicitacaoAgendamento =
  | 'AGUARDANDO_CONFIRMACAO'
  | 'CONFIRMADO'
  | 'CANCELADO'

/** Profissional ativo visível ao cliente (tech_spec.md §7.2 — `ProfissionalPublicoDTO`). */
export interface Profissional {
  id: string
  nome: string
  cref: string
}

/** Dia liberado para agendamento com um profissional (tech_spec.md §7.2 — `DiaDisponivelDTO`). */
export interface DiaDisponivel {
  /** Data no formato `YYYY-MM-DD`. */
  data: string
  /** Rótulo de exibição do dia (ex.: "Qui, 20/08"). */
  label: string
}

/** Horário elegível para solicitação num dia (tech_spec.md §7.2 — `HorarioDisponivelDTO`). */
export interface HorarioDisponivel {
  /** Horário no formato `HH:mm`. */
  horario: string
}

/**
 * Solicitação de Agendamento (glossário de domínio) mapeada para uso em store/UI.
 * Nunca inclui nome, telefone ou identificador de outra Solicitação de Agendamento
 * concorrente, nem detalhes administrativos (tech_spec.md §7.3, §7.4).
 */
export interface SolicitacaoAgendamento {
  id: string
  status: StatusSolicitacaoAgendamento
  profissionalNome: string
  /** Data no formato `YYYY-MM-DD`. */
  data: string
  /** Horário no formato `HH:mm`. */
  horario: string
}

/** Textos públicos configuráveis da tela de sucesso, com fallback seguro (RN-14). */
export interface ConfiguracaoSucesso {
  titulo: string
  descricao: string
  regras: string[]
  dicas: string[]
  avisos: string[]
}

/**
 * Payload enviado pelo próprio cliente para criar uma Solicitação de Agendamento.
 * `nomeCliente`/`telefoneNormalizado`/`telefoneExibicao` pertencem ao solicitante
 * atual — nunca a terceiros — e o payload não carrega quantidade ou identificador
 * de solicitações concorrentes (tech_spec.md §7.2).
 */
export interface CriarSolicitacaoAgendamentoDTO {
  nomeCliente: string
  telefoneNormalizado: string
  telefoneExibicao: string
  profissionalId: string
  /** Data no formato `YYYY-MM-DD`. */
  data: string
  /** Horário no formato `HH:mm`. */
  horario: string
}

/**
 * Resposta pública da criação de uma Solicitação de Agendamento.
 * Não inclui `telefoneNormalizado`, `telefoneExibicao`, `nomeCliente`, contador de
 * solicitações concorrentes, nem qualquer campo administrativo (tech_spec.md §7.2).
 */
export interface SolicitacaoAgendamentoDTO {
  id: string
  status: StatusSolicitacaoAgendamento
  profissionalNome: string
  /** Data no formato `YYYY-MM-DD`. */
  data: string
  /** Horário no formato `HH:mm`. */
  horario: string
}
