/**
 * Repository de browser (fetch nativo) para dias e horários de disponibilidade de um
 * profissional (tech_spec.md §7, T9).
 *
 * Fronteira HTTP client-side dos dois endpoints de disponibilidade (T5):
 * - `GET /api/public/profissionais/{profissionalId}/dias`
 * - `GET /api/public/profissionais/{profissionalId}/horarios?data=YYYY-MM-DD`
 *
 * Mantido como módulo próprio, separado de `profissionaisRepository.ts` (decisão de T9): os
 * dois arquivos compartilham o mesmo PADRÃO de erro/URL, mas endereçam recursos distintos
 * (profissional vs. disponibilidade de um profissional) — arquivos separados mantêm cada um
 * pequeno e o nome do arquivo alinhado ao recurso que ele busca, sem precisar de uma camada de
 * HTTP client genérica compartilhada (fora de escopo de T9) só para eliminar a pequena
 * duplicação de ~10 linhas entre eles.
 */
import type { DiaDisponivel, HorarioDisponivel, ResultadoRepository } from '@/app/agendamento/types'

/** Absolutiza um path público — o `fetch` nativo do runtime de teste exige URL absoluta. */
function urlPublica(caminho: string): string {
  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origem}${caminho}`
}

function caminhoDias(profissionalId: string): string {
  return `/api/public/profissionais/${encodeURIComponent(profissionalId)}/dias`
}

function caminhoHorarios(profissionalId: string, data: string): string {
  const query = new URLSearchParams({ data }).toString()
  return `/api/public/profissionais/${encodeURIComponent(profissionalId)}/horarios?${query}`
}

/** Extrai a mensagem de erro de um corpo `{ error: string }` — nunca lança em corpo inválido. */
async function extrairMensagemDeErro(response: Response): Promise<string | undefined> {
  try {
    const corpo: unknown = await response.json()
    if (corpo && typeof corpo === 'object' && typeof (corpo as Record<string, unknown>).error === 'string') {
      return (corpo as Record<string, unknown>).error as string
    }
  } catch {
    // Corpo não é JSON válido — segue sem mensagem específica, o chamador usa um fallback.
  }
  return undefined
}

/** Parse defensivo: extrai campos explicitamente, ignora extra, descarta item malformado. */
function paraDiaDisponivel(item: unknown): DiaDisponivel | null {
  if (!item || typeof item !== 'object') return null
  const bruto = item as Record<string, unknown>
  if (typeof bruto.data !== 'string' || typeof bruto.label !== 'string') return null
  return { data: bruto.data, label: bruto.label }
}

/** Parse defensivo: extrai campos explicitamente, ignora extra, descarta item malformado. */
function paraHorarioDisponivel(item: unknown): HorarioDisponivel | null {
  if (!item || typeof item !== 'object') return null
  const bruto = item as Record<string, unknown>
  if (typeof bruto.horario !== 'string') return null
  return { horario: bruto.horario }
}

/** Requisita um endpoint GET de leitura pública e devolve o corpo já parseado como array. */
async function buscarListaPublica(url: string, mensagemErroFallback: string): Promise<ResultadoRepository<unknown[]>> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    return { ok: false, erro: { tipo: 'REDE' } }
  }

  if (!response.ok) {
    const mensagem = await extrairMensagemDeErro(response)
    return { ok: false, erro: { tipo: 'SERVIDOR', mensagem: mensagem ?? mensagemErroFallback } }
  }

  let corpo: unknown
  try {
    corpo = await response.json()
  } catch {
    return { ok: false, erro: { tipo: 'SERVIDOR', mensagem: 'Resposta inválida do servidor.' } }
  }

  return { ok: true, dados: Array.isArray(corpo) ? corpo : [] }
}

/** `GET /api/public/profissionais/{profissionalId}/dias` (T5) — dias liberados do profissional. */
async function listarDias(profissionalId: string): Promise<ResultadoRepository<DiaDisponivel[]>> {
  const resultado = await buscarListaPublica(
    urlPublica(caminhoDias(profissionalId)),
    'Não foi possível carregar os dias disponíveis.'
  )
  if (!resultado.ok) return resultado
  return { ok: true, dados: resultado.dados.map(paraDiaDisponivel).filter((item): item is DiaDisponivel => item !== null) }
}

/**
 * `GET /api/public/profissionais/{profissionalId}/horarios?data=YYYY-MM-DD` (T5) — horários
 * elegíveis do profissional num dia.
 */
async function listarHorarios(
  profissionalId: string,
  data: string
): Promise<ResultadoRepository<HorarioDisponivel[]>> {
  const resultado = await buscarListaPublica(
    urlPublica(caminhoHorarios(profissionalId, data)),
    'Não foi possível carregar os horários disponíveis.'
  )
  if (!resultado.ok) return resultado
  return {
    ok: true,
    dados: resultado.dados.map(paraHorarioDisponivel).filter((item): item is HorarioDisponivel => item !== null),
  }
}

export const disponibilidadeRepository = { listarDias, listarHorarios }
