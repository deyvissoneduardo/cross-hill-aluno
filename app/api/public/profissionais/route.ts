/**
 * Route Handler público: lista profissionais ativos (tech_spec.md §7.1, §7.4).
 *
 * Delega toda a leitura à porta `AgendamentoStore` (T4) — nunca acessa Firestore diretamente.
 * `listarProfissionaisAtivos` já filtra `ativo == true` e mapeia para o DTO público mínimo
 * (`id`, `nome`, `cref`); este handler apenas repassa o resultado, sem reimplementar a regra.
 */
import { listarProfissionaisAtivos } from '@/lib/firebase/agendamentoStore'

export async function GET() {
  try {
    const profissionais = await listarProfissionaisAtivos()
    return Response.json(profissionais)
  } catch (erro) {
    // Erro inesperado (Firestore indisponível, credencial inválida, etc.) nunca deve vazar
    // stack trace ao cliente público — mensagem genérica, log server-side.
    console.error('[GET /api/public/profissionais] falha inesperada ao listar profissionais', erro)
    return Response.json(
      { error: 'Não foi possível carregar os profissionais. Tente novamente.' },
      { status: 500 }
    )
  }
}
