/**
 * Repository de browser (fetch nativo) para criação de Solicitação de Agendamento
 * (tech_spec.md §7, §9, T9).
 *
 * Fronteira HTTP client-side de `POST /api/public/agendamentos` (T7/T8). Envia o
 * `CriarSolicitacaoAgendamentoDTO` completo — incluindo `telefoneNormalizado`, mesmo esse campo
 * sendo ignorado pelo servidor (que sempre recalcula a partir de `telefoneExibicao`) — porque o
 * tipo do DTO o declara obrigatório.
 *
 * Mapeamento de erro (`app/api/public/agendamentos/errors.ts`, contrato REAL — usa
 * `TELEFONE_DUPLICADO_NO_DIA`, não o `DUPLICIDADE_DIA` desatualizado que aparece na task):
 * `codigo` do corpo de erro (`{ error, codigo }`) mapeia 1:1 para `ErroRepository['tipo']`.
 * `codigo` ausente/não reconhecido (corpo malformado) cai em `SERVIDOR` — nunca propaga
 * `Response` cru nem stack trace.
 */
import type {
  CriarSolicitacaoAgendamentoDTO,
  ResultadoRepository,
  SolicitacaoAgendamento,
  StatusSolicitacaoAgendamento,
} from '@/app/agendamento/types'

const CAMINHO_AGENDAMENTOS = '/api/public/agendamentos'

/** Absolutiza um path público — o `fetch` nativo do runtime de teste exige URL absoluta. */
function urlPublica(caminho: string): string {
  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origem}${caminho}`
}

function ehStatusValido(valor: unknown): valor is StatusSolicitacaoAgendamento {
  return valor === 'AGUARDANDO_CONFIRMACAO' || valor === 'CONFIRMADO' || valor === 'CANCELADO'
}

/** Parse defensivo: extrai campos explicitamente, ignora extra, descarta corpo malformado. */
function paraSolicitacaoAgendamento(item: unknown): SolicitacaoAgendamento | null {
  if (!item || typeof item !== 'object') return null
  const bruto = item as Record<string, unknown>
  if (
    typeof bruto.id !== 'string' ||
    !ehStatusValido(bruto.status) ||
    typeof bruto.profissionalNome !== 'string' ||
    typeof bruto.data !== 'string' ||
    typeof bruto.horario !== 'string'
  ) {
    return null
  }
  return {
    id: bruto.id,
    status: bruto.status,
    profissionalNome: bruto.profissionalNome,
    data: bruto.data,
    horario: bruto.horario,
  }
}

/** Códigos reais do contrato de erro do POST — `CodigoErroPublicoAgendamento` (errors.ts). */
const CODIGOS_MAPEADOS = new Set([
  'PAYLOAD_INVALIDO',
  'SLOT_INDISPONIVEL',
  'TELEFONE_DUPLICADO_NO_DIA',
  'LIMITE_ANTIABUSO',
  'ERRO_SERVIDOR',
])

/** Mapeia `{ error, codigo }` do POST para `ErroRepository` — `codigo` ausente/desconhecido vira `SERVIDOR`. */
function paraErroDeResposta(corpo: unknown): ResultadoRepository<never> {
  const bruto = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : {}
  const mensagem = typeof bruto.error === 'string' ? bruto.error : 'Não foi possível concluir sua solicitação.'
  const codigo = typeof bruto.codigo === 'string' && CODIGOS_MAPEADOS.has(bruto.codigo) ? bruto.codigo : 'ERRO_SERVIDOR'

  switch (codigo) {
    case 'PAYLOAD_INVALIDO':
      return { ok: false, erro: { tipo: 'PAYLOAD_INVALIDO', mensagem } }
    case 'SLOT_INDISPONIVEL':
      return { ok: false, erro: { tipo: 'SLOT_INDISPONIVEL', mensagem } }
    case 'TELEFONE_DUPLICADO_NO_DIA':
      return { ok: false, erro: { tipo: 'TELEFONE_DUPLICADO_NO_DIA', mensagem } }
    case 'LIMITE_ANTIABUSO':
      return { ok: false, erro: { tipo: 'LIMITE_ANTIABUSO', mensagem } }
    default:
      return { ok: false, erro: { tipo: 'SERVIDOR', mensagem } }
  }
}

/** `POST /api/public/agendamentos` (T7/T8) — cria uma Solicitação de Agendamento. */
async function criar(
  dto: CriarSolicitacaoAgendamentoDTO
): Promise<ResultadoRepository<SolicitacaoAgendamento>> {
  let response: Response
  try {
    response = await fetch(urlPublica(CAMINHO_AGENDAMENTOS), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    })
  } catch {
    // fetch rejeita por falha de transporte (offline, DNS, timeout) — nunca erro HTTP/domínio.
    return { ok: false, erro: { tipo: 'REDE' } }
  }

  let corpo: unknown
  try {
    corpo = await response.json()
  } catch {
    corpo = null
  }

  if (!response.ok) {
    return paraErroDeResposta(corpo)
  }

  const solicitacao = paraSolicitacaoAgendamento(corpo)
  if (!solicitacao) {
    return { ok: false, erro: { tipo: 'SERVIDOR', mensagem: 'Resposta inválida do servidor.' } }
  }
  return { ok: true, dados: solicitacao }
}

export const agendamentosRepository = { criar }
