/**
 * CT-006..CT-010 — etapa de escolha de profissional, dia e horário.
 *
 * INVARIANT: depois de identificação válida, a UI carrega disponibilidade via
 * repositories reais, mostra apenas profissionais/dias/horários públicos retornados
 * pelo BFF e bloqueia progressão quando a seleção está incompleta ou vazia.
 * OWNING_LAYER: component-integration.
 * EXISTING_SUITE: AppointmentFlow.identificacao.test.tsx cobre identificação; este
 * arquivo cobre a fronteira HTTP de disponibilidade com MSW.
 * REAL_EXECUTION_BOUNDARY: MSW intercepta HTTP público; AppointmentFlow,
 * ScheduleStep, reducer, repositories e componentes UI rodam reais.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { AppointmentFlow } from '../components/AppointmentFlow'

const PROFISSIONAIS_ATIVOS = [
  { id: 'prof-1', nome: 'Ana Souza', cref: '123456-G/DF' },
  { id: 'prof-2', nome: 'Bruno Lima', cref: '654321-G/DF' },
]

const DIAS_LIBERADOS = [
  { data: '2026-08-20', label: 'Qui, 20/08' },
  { data: '2026-08-22', label: 'Sáb, 22/08' },
]

const HORARIOS_ELEGIVEIS = [{ horario: '09:00' }, { horario: '10:30' }]

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  cleanup()
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('AppointmentFlow — disponibilidade', () => {
  it('CT-006 empty_professionals_is_private', async () => {
    server.use(http.get('/api/public/profissionais', () => HttpResponse.json([])))

    await renderScheduleStep()

    expect(await screen.findByText('Nenhum profissional disponível no momento.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.queryByText(/0|contador|ativo|inativo|admin|telefone|confirmado|pendente/i)).toBeNull()
  })

  it('CT-007 shows_only_released_days', async () => {
    server.use(
      http.get('/api/public/profissionais', () => HttpResponse.json(PROFISSIONAIS_ATIVOS)),
      http.get('/api/public/profissionais/prof-1/dias', () => HttpResponse.json(DIAS_LIBERADOS))
    )
    const user = userEvent.setup()

    await renderScheduleStep()
    await user.click(await screen.findByRole('button', { name: /Ana Souza/i }))

    expect(await screen.findByRole('button', { name: /Qui, 20\/08/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Sáb, 22\/08/i })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Sex, 21\/08/i })).toBeNull()
    expect(screen.queryByText('2026-08-21')).toBeNull()
  })

  it('CT-008 empty_days_blocks_progress', async () => {
    server.use(
      http.get('/api/public/profissionais', () => HttpResponse.json(PROFISSIONAIS_ATIVOS)),
      http.get('/api/public/profissionais/prof-2/dias', () => HttpResponse.json([]))
    )
    const user = userEvent.setup()

    await renderScheduleStep()
    await user.click(await screen.findByRole('button', { name: /Bruno Lima/i }))

    expect(await screen.findByText('Não há datas disponíveis para este profissional.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'Revise sua solicitação' })).toBeNull()
  })

  it('CT-009 shows_only_eligible_times', async () => {
    server.use(
      http.get('/api/public/profissionais', () => HttpResponse.json(PROFISSIONAIS_ATIVOS)),
      http.get('/api/public/profissionais/prof-1/dias', () => HttpResponse.json(DIAS_LIBERADOS)),
      http.get('/api/public/profissionais/prof-1/horarios', () => HttpResponse.json(HORARIOS_ELEGIVEIS))
    )
    const user = userEvent.setup()

    await renderScheduleStep()
    await user.click(await screen.findByRole('button', { name: /Ana Souza/i }))
    await user.click(await screen.findByRole('button', { name: /Qui, 20\/08/i }))

    expect(await screen.findByRole('button', { name: '09:00' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '10:30' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '11:00' })).toBeNull()
    expect(screen.queryByText(/confirmado|pendente|concorrente|contador|telefone/i)).toBeNull()
  })

  it('CT-010 empty_times_blocks_review', async () => {
    server.use(
      http.get('/api/public/profissionais', () => HttpResponse.json(PROFISSIONAIS_ATIVOS)),
      http.get('/api/public/profissionais/prof-1/dias', () => HttpResponse.json(DIAS_LIBERADOS)),
      http.get('/api/public/profissionais/prof-1/horarios', () => HttpResponse.json([]))
    )
    const user = userEvent.setup()

    await renderScheduleStep()
    await user.click(await screen.findByRole('button', { name: /Ana Souza/i }))
    await user.click(await screen.findByRole('button', { name: /Qui, 20\/08/i }))

    expect(await screen.findByText('Não há horários disponíveis nesta data.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'Revise sua solicitação' })).toBeNull()
  })

  it('shows_time_load_error_and_retries_without_leaving_schedule_step', async () => {
    let horariosCalls = 0
    server.use(
      http.get('/api/public/profissionais', () => HttpResponse.json(PROFISSIONAIS_ATIVOS)),
      http.get('/api/public/profissionais/prof-1/dias', () => HttpResponse.json(DIAS_LIBERADOS)),
      http.get('/api/public/profissionais/prof-1/horarios', () => {
        horariosCalls += 1
        if (horariosCalls === 1) {
          return HttpResponse.json({ error: 'falha interna' }, { status: 500 })
        }
        return HttpResponse.json(HORARIOS_ELEGIVEIS)
      })
    )
    const user = userEvent.setup()

    await renderScheduleStep()
    await user.click(await screen.findByRole('button', { name: /Ana Souza/i }))
    await user.click(await screen.findByRole('button', { name: /Qui, 20\/08/i }))

    expect(await screen.findByText('Não foi possível carregar os horários.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Escolha seu horário' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ana Souza/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Qui, 20\/08/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('button', { name: '09:00' })).toBeEnabled()
    expect(horariosCalls).toBe(2)
  })
})

async function renderScheduleStep() {
  const user = userEvent.setup()
  render(<AppointmentFlow />)

  await user.type(screen.getByLabelText('Nome'), 'João Silva')
  await user.type(screen.getByLabelText('Telefone'), '(61) 99999-9999')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Escolha seu horário' })).toBeInTheDocument()
  })
}
