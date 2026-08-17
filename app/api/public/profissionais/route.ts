/**
 * Route Handler público: retorna o único profissional configurado.
 *
 * Delega toda a leitura à porta `AgendamentoStore` (T4) — nunca acessa Firestore diretamente.
 * `listarProfissionaisAtivos` lê `configuracoes/profissional.nome` e mapeia para o DTO público
 * mínimo (`id`, `nome`); este handler apenas repassa o resultado.
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
