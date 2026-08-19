/**
 * Repository de browser (fetch nativo) para os textos configuráveis da tela de sucesso
 * (tech_spec.md §7, RN-14, T9).
 *
 * Fronteira HTTP client-side de `GET /api/public/configuracao/sucesso` (T5). O endpoint nunca
 * falha no servidor (fallback seguro sempre aplicado lá — ver `errors.ts`/T4), mas a chamada de
 * rede em si ainda pode falhar do lado do browser (offline, timeout) — por isso este repository
 * também devolve `ResultadoRepository`, no mesmo padrão dos demais, em vez de assumir sucesso.
 */
import type { ConfiguracaoSucesso, ResultadoRepository } from '@/app/agendamento/types'

const CAMINHO_CONFIGURACAO_SUCESSO = '/api/public/configuracao/sucesso'

/** Absolutiza um path público — o `fetch` nativo do runtime de teste exige URL absoluta. */
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

/** Extrai um array de strings de um valor arbitrário do JSON, descartando itens não-string. */
function paraArrayDeStrings(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
}

/** Parse defensivo: extrai campos explicitamente, ignora extra, descarta corpo malformado. */
function paraConfiguracaoSucesso(item: unknown): ConfiguracaoSucesso | null {
  if (!item || typeof item !== 'object') return null
  const bruto = item as Record<string, unknown>
  if (typeof bruto.titulo !== 'string' || typeof bruto.descricao !== 'string') return null
  return {
    titulo: bruto.titulo,
    descricao: bruto.descricao,
    regras: paraArrayDeStrings(bruto.regras),
    dicas: paraArrayDeStrings(bruto.dicas),
    avisos: paraArrayDeStrings(bruto.avisos),
  }
}

/** `GET /api/public/configuracao/sucesso` (T5) — textos configuráveis da tela de sucesso. */
async function buscarSucesso(): Promise<ResultadoRepository<ConfiguracaoSucesso>> {
  let response: Response
  try {
    response = await fetch(urlPublica(CAMINHO_CONFIGURACAO_SUCESSO), { cache: 'no-store' })
  } catch {
    return { ok: false, erro: { tipo: 'REDE' } }
  }

  if (!response.ok) {
    const mensagem = await extrairMensagemDeErro(response)
    return {
      ok: false,
      erro: { tipo: 'SERVIDOR', mensagem: mensagem ?? 'Não foi possível carregar os textos de sucesso.' },
    }
  }

  let corpo: unknown
  try {
    corpo = await response.json()
  } catch {
    return { ok: false, erro: { tipo: 'SERVIDOR', mensagem: 'Resposta inválida do servidor.' } }
  }

  const configuracao = paraConfiguracaoSucesso(corpo)
  if (!configuracao) {
    return { ok: false, erro: { tipo: 'SERVIDOR', mensagem: 'Resposta inválida do servidor.' } }
  }
  return { ok: true, dados: configuracao }
}

export const configuracaoRepository = { buscarSucesso }
