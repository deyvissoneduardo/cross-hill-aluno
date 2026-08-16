/**
 * Route Handler público: lista horários elegíveis de um profissional num dia
 * (tech_spec.md §7.1, §7.4).
 *
 * Delega toda a leitura à porta `AgendamentoStore` (T4) — nunca acessa Firestore diretamente.
 * `listarHorariosElegiveis` já remove horários `CONFIRMADO` e mantém elegíveis os horários com
 * Solicitações de Agendamento `AGUARDANDO_CONFIRMACAO` de terceiros (RN-07/CA-07/CA-15); este
 * handler apenas repassa o resultado, sem reimplementar a regra.
 *
 * `data` é obrigatória via query string (`?data=YYYY-MM-DD`, tech_spec.md §7.1). Ausente ou
 * malformada é rejeitada ANTES de consultar a store — o endpoint público não tem autenticação,
 * então validar o formato aqui evita repassar entrada arbitrária para a camada de dados.
 *
 * `params` é uma Promise nesta versão do Next.js (App Router / Route Handlers dinâmicos) —
 * ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
 */
import { listarHorariosElegiveis } from '@/lib/firebase/agendamentoStore'

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/

/** `YYYY-MM-DD` sintaticamente correto E calendarmente real (rejeita, ex., "2026-02-30"). */
function isDataValida(data: string): boolean {
  if (!FORMATO_DATA.test(data)) return false

  const [ano, mes, dia] = data.split('-').map(Number)
  const referencia = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    referencia.getUTCFullYear() === ano &&
    referencia.getUTCMonth() === mes - 1 &&
    referencia.getUTCDate() === dia
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profissionalId: string }> }
) {
  const { profissionalId } = await params
  const data = new URL(request.url).searchParams.get('data')

  if (!data || !isDataValida(data)) {
    return Response.json(
      { error: 'Informe uma data válida no formato AAAA-MM-DD.' },
      { status: 400 }
    )
  }

  try {
    const horarios = await listarHorariosElegiveis(profissionalId, data)
    return Response.json(horarios)
  } catch (erro) {
    // Erro inesperado (Firestore indisponível, credencial inválida, etc.) nunca deve vazar
    // stack trace ao cliente público — mensagem genérica, log server-side.
    console.error(
      '[GET /api/public/profissionais/[profissionalId]/horarios] falha inesperada ao listar horários',
      erro
    )
    return Response.json(
      { error: 'Não foi possível carregar os horários disponíveis. Tente novamente.' },
      { status: 500 }
    )
  }
}
