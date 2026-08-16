import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DiaDisponivel } from '@/app/agendamento/types'

/**
 * Mocka a porta `AgendamentoStore` (T4) — o handler NUNCA acessa Firestore diretamente, e o
 * teste NUNCA cria um símbolo de produção só para si (Iron Law #6 / regra do seam). `vi.hoisted`
 * evita a armadilha de referenciar uma `const` de módulo dentro do factory de `vi.mock` antes de
 * ela existir (o `vi.mock` é hoisted pelo Vitest para antes dos imports estáticos do arquivo).
 */
const { listarDiasLiberados } = vi.hoisted(() => ({
  listarDiasLiberados: vi.fn(),
}))

vi.mock('@/lib/firebase/agendamentoStore', () => ({
  listarDiasLiberados,
}))

import { GET } from './route'

function contexto(profissionalId: string) {
  return { params: Promise.resolve({ profissionalId }) }
}

describe('GET /api/public/profissionais/[profissionalId]/dias', () => {
  beforeEach(() => {
    listarDiasLiberados.mockReset()
  })

  it('CT-031: get_public_days_returns_released_days — retorna apenas data e label dos dias liberados', async () => {
    // `listarDiasLiberados` (T4) já filtra `ativo == true` e ordena por data — a invariante sob
    // teste é que o handler REPASSA fielmente esse resultado, encaminha o profissionalId da rota
    // dinâmica corretamente e não adiciona nenhum campo interno (ex.: profissionalId, horarios).
    const dias: DiaDisponivel[] = [
      { data: '2026-08-20', label: 'Qui, 20/08' },
      { data: '2026-08-21', label: 'Sex, 21/08' },
    ]
    listarDiasLiberados.mockResolvedValueOnce(dias)

    const response = await GET(
      new Request('http://localhost/api/public/profissionais/prof-1/dias'),
      contexto('prof-1')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([
      { data: '2026-08-20', label: 'Qui, 20/08' },
      { data: '2026-08-21', label: 'Sex, 21/08' },
    ])
    expect(Object.keys(body[0])).toEqual(['data', 'label'])
    expect(listarDiasLiberados).toHaveBeenCalledTimes(1)
    expect(listarDiasLiberados).toHaveBeenCalledWith('prof-1')
  })

  it('CT-031 (negative companion): profissional sem dias liberados retorna lista pública vazia, não erro', async () => {
    listarDiasLiberados.mockResolvedValueOnce([])

    const response = await GET(
      new Request('http://localhost/api/public/profissionais/prof-sem-dias/dias'),
      contexto('prof-sem-dias')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('retorna 500 genérico sem stack trace quando a store lança uma exceção inesperada', async () => {
    listarDiasLiberados.mockRejectedValueOnce(new Error('boom - detalhe interno do Firestore'))

    const response = await GET(
      new Request('http://localhost/api/public/profissionais/prof-1/dias'),
      contexto('prof-1')
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(Object.keys(body)).toEqual(['error'])
    expect(JSON.stringify(body)).not.toContain('boom')
  })
})
