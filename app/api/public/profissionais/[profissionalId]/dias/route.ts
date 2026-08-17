/**
 * Route Handler público: lista dias liberados de um profissional (tech_spec.md §7.1, §7.4).
 *
 * Delega toda a leitura à porta `AgendamentoStore` (T4) — nunca acessa Firestore diretamente.
 * `listarDiasLiberados` mantém datas com ao menos um slot liberado e sem agendamento, e mapeia para o DTO público mínimo
 * (`data`, `label`); este handler apenas repassa o resultado, sem reimplementar a regra.
 *
 * `params` é uma Promise nesta versão do Next.js (App Router / Route Handlers dinâmicos) —
 * ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
 */
import { listarDiasLiberados } from '@/lib/firebase/agendamentoStore'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profissionalId: string }> }
) {
  const { profissionalId } = await params

  try {
    const dias = await listarDiasLiberados(profissionalId)
    return Response.json(dias)
  } catch (erro) {
    // Erro inesperado (Firestore indisponível, credencial inválida, etc.) nunca deve vazar
    // stack trace ao cliente público — mensagem genérica, log server-side.
    console.error(
      '[GET /api/public/profissionais/[profissionalId]/dias] falha inesperada ao listar dias',
      erro
    )
    return Response.json(
      { error: 'Não foi possível carregar os dias disponíveis. Tente novamente.' },
      { status: 500 }
    )
  }
}
