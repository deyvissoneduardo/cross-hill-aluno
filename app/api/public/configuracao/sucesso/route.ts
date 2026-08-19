/**
 * Route Handler público: carrega os textos configuráveis da tela de sucesso
 * (tech_spec.md §7.1, §7.4, RN-14).
 *
 * Delega toda a leitura à porta `AgendamentoStore` (T4) — nunca acessa Firestore diretamente.
 * `carregarConfiguracaoSucesso` NUNCA lança e NUNCA retorna `null`: configuração ausente,
 * incompleta ou com erro de leitura já resolve internamente para o fallback seguro
 * (`CONFIGURACAO_SUCESSO_FALLBACK`). Por isso este handler não precisa de tratamento de
 * exceção — apenas repassa o DTO com 200, garantindo que a tela de sucesso nunca fique
 * bloqueada por configuração de texto ausente/inválida.
 */
import { carregarConfiguracaoSucesso } from '@/lib/firebase/agendamentoStore'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configuracao = await carregarConfiguracaoSucesso()
  return Response.json(configuracao, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
