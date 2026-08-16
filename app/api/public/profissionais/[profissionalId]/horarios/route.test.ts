import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HorarioDisponivel } from '@/app/agendamento/types'

/**
 * Mocka a porta `AgendamentoStore` (T4) — o handler NUNCA acessa Firestore diretamente, e o
 * teste NUNCA cria um símbolo de produção só para si (Iron Law #6 / regra do seam). `vi.hoisted`
 * evita a armadilha de referenciar uma `const` de módulo dentro do factory de `vi.mock` antes de
 * ela existir (o `vi.mock` é hoisted pelo Vitest para antes dos imports estáticos do arquivo).
 */
const { listarHorariosElegiveis } = vi.hoisted(() => ({
  listarHorariosElegiveis: vi.fn(),
}))

vi.mock('@/lib/firebase/agendamentoStore', () => ({
  listarHorariosElegiveis,
}))

import { GET } from './route'

function contexto(profissionalId: string) {
  return { params: Promise.resolve({ profissionalId }) }
}

function requestComData(data: string | undefined) {
  const url =
    data === undefined
      ? 'http://localhost/api/public/profissionais/prof-1/horarios'
      : `http://localhost/api/public/profissionais/prof-1/horarios?data=${encodeURIComponent(data)}`
  return new Request(url)
}

describe('GET /api/public/profissionais/[profissionalId]/horarios', () => {
  beforeEach(() => {
    listarHorariosElegiveis.mockReset()
  })

  it.each([
    ['ausente (sem query param)', undefined],
    ['texto não numérico', 'abc'],
    ['formato brasileiro em vez de ISO', '20-08-2026'],
    ['calendarmente inexistente (30 de fevereiro)', '2026-02-30'],
  ])(
    'CT-032: get_public_times_rejects_invalid_date — rejeita data %s com 400 sem consultar a store',
    async (_descricao, data) => {
      const response = await GET(requestComData(data), contexto('prof-1'))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(Object.keys(body)).toEqual(['error'])
      expect(listarHorariosElegiveis).not.toHaveBeenCalled()
    }
  )

  it('CT-032 (negative companion): data válida no formato YYYY-MM-DD consulta a store normalmente', async () => {
    listarHorariosElegiveis.mockResolvedValueOnce([])

    const response = await GET(requestComData('2026-08-20'), contexto('prof-1'))

    expect(response.status).toBe(200)
    expect(listarHorariosElegiveis).toHaveBeenCalledTimes(1)
    expect(listarHorariosElegiveis).toHaveBeenCalledWith('prof-1', '2026-08-20')
  })

  it('CT-033: get_public_times_hides_confirmed_and_keeps_pending_eligible — repassa fielmente os horários elegíveis, sem alterar nem sinalizar pendências', async () => {
    // `listarHorariosElegiveis` (T4) já aplica a regra: horários `CONFIRMADO` somem e horários
    // com Solicitação de Agendamento `AGUARDANDO_CONFIRMACAO` de terceiros continuam elegíveis
    // sem contador/nome/telefone. A invariante sob teste é que o handler REPASSA o array como
    // veio — sem reordenar, sem filtrar de novo, sem adicionar campo extra (CA-15).
    const elegiveis: HorarioDisponivel[] = [{ horario: '09:00' }, { horario: '10:30' }]
    listarHorariosElegiveis.mockResolvedValueOnce(elegiveis)

    const response = await GET(requestComData('2026-08-20'), contexto('prof-1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([{ horario: '09:00' }, { horario: '10:30' }])
    expect(Object.keys(body[0])).toEqual(['horario'])
  })

  it('CT-033 (negative companion): dia sem nenhum horário elegível retorna lista pública vazia, não erro', async () => {
    listarHorariosElegiveis.mockResolvedValueOnce([])

    const response = await GET(requestComData('2026-08-20'), contexto('prof-1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('retorna 500 genérico sem stack trace quando a store lança uma exceção inesperada', async () => {
    listarHorariosElegiveis.mockRejectedValueOnce(new Error('boom - detalhe interno do Firestore'))

    const response = await GET(requestComData('2026-08-20'), contexto('prof-1'))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(Object.keys(body)).toEqual(['error'])
    expect(JSON.stringify(body)).not.toContain('boom')
  })
})
