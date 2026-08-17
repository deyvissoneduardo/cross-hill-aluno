/**
 * Repository de browser (fetch nativo) para o profissional público (tech_spec.md §7, T9).
 *
 * Fronteira HTTP client-side: consome apenas `GET /api/public/profissionais` (T5). Nenhum
 * componente de UI chama `fetch` diretamente — este módulo (junto dos demais em
 * `app/agendamento/repositories/`) é a ÚNICA fronteira de rede da feature no browser.
 *
 * A URL é montada com `window.location.origin` (nunca um domínio hardcoded): em produção o
 * browser resolveria um path relativo do mesmo jeito, mas o `fetch` nativo do runtime de teste
 * (Node/undici, mesmo sob ambiente jsdom) exige URL absoluta para conseguir fazer o parse — sem
 * a origem explícita a chamada falha antes mesmo de chegar ao MSW.
 *
 * Deliberadamente NÃO existe uma camada de HTTP client genérica compartilhada entre os
 * repositories da feature (fora de escopo de T9) — cada arquivo é pequeno o bastante para ficar
 * autocontido, o que evita uma abstração especulativa para 4 chamadas.
 */
import type { Profissional, ResultadoRepository } from '@/app/agendamento/types'

const CAMINHO_PROFISSIONAIS = '/api/public/profissionais'

/** Absolutiza um path público — ver nota de topo sobre por que não usar path relativo puro. */
function urlPublica(caminho: string): string {
  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origem}${caminho}`
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

/**
 * Mapeia um item do JSON de resposta para `Profissional`, extraindo campos explicitamente
 * (parse defensivo — nunca `as any`). Campo extra inesperado (ex.: `ativo`) é ignorado; item
 * malformado é descartado em vez de quebrar o parse da lista inteira.
 */
function paraProfissional(item: unknown): Profissional | null {
  if (!item || typeof item !== 'object') return null
  const bruto = item as Record<string, unknown>
  if (typeof bruto.id !== 'string' || typeof bruto.nome !== 'string') {
    return null
  }
  return { id: bruto.id, nome: bruto.nome }
}

/** `GET /api/public/profissionais` — retorna o único profissional configurado pelo servidor. */
async function listar(): Promise<ResultadoRepository<Profissional[]>> {
  let response: Response
  try {
    response = await fetch(urlPublica(CAMINHO_PROFISSIONAIS))
  } catch {
    // fetch rejeita por falha de transporte (offline, DNS, timeout) — nunca erro HTTP.
    return { ok: false, erro: { tipo: 'REDE' } }
  }

  if (!response.ok) {
    const mensagem = await extrairMensagemDeErro(response)
    return {
      ok: false,
      erro: { tipo: 'SERVIDOR', mensagem: mensagem ?? 'Não foi possível carregar os profissionais.' },
    }
  }

  let corpo: unknown
  try {
    corpo = await response.json()
  } catch {
    return { ok: false, erro: { tipo: 'SERVIDOR', mensagem: 'Resposta inválida do servidor.' } }
  }

  const lista = Array.isArray(corpo) ? corpo : []
  const profissionais = lista.map(paraProfissional).filter((item): item is Profissional => item !== null)
  return { ok: true, dados: profissionais }
}

export const profissionaisRepository = { listar }
