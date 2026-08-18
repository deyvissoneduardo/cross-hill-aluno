/**
 * CT-015 — revisão completa antes do envio.
 *
 * INVARIANT: envio final só ocorre depois de uma etapa revisável contendo nome,
 * telefone, profissional, data, horário e CTA final.
 * OWNING_LAYER: component-integration.
 * EXISTING_SUITE: AppointmentFlow.disponibilidade.integration.test.tsx cobre a
 * seleção; este arquivo cobre a etapa ReviewStep criada na T13.
 * REAL_EXECUTION_BOUNDARY: MSW intercepta HTTP público de disponibilidade;
 * AppointmentFlow, ScheduleStep, ReviewStep, reducer, repositories e UI rodam reais.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { AppointmentFlow } from '../components/AppointmentFlow'

const PROFISSIONAIS_ATIVOS = [{ id: 'profissional', nome: 'Ana Souza' }]
const DIAS_LIBERADOS = [{ data: '2026-08-20', label: 'Qui, 20/08' }]
const HORARIOS_ELEGIVEIS = [{ horario: '09:00' }]

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  cleanup()
  server.use(
    http.get('/api/public/profissionais', () => HttpResponse.json(PROFISSIONAIS_ATIVOS)),
    http.get('/api/public/profissionais/profissional/dias', () => HttpResponse.json(DIAS_LIBERADOS)),
    http.get('/api/public/profissionais/profissional/horarios', () => HttpResponse.json(HORARIOS_ELEGIVEIS))
  )
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('AppointmentFlow — revisão', () => {
  it('CT-015 renders_complete_review_summary', async () => {
    await renderReviewStep()

    expect(screen.getByRole('heading', { name: 'Revise sua solicitação' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Telefone')).toBeInTheDocument()
    expect(screen.getByText('(61) 99999-9999')).toBeInTheDocument()
    expect(screen.getByText('Profissional')).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Qui, 20/08')).toBeInTheDocument()
    expect(screen.getByText('Horário')).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.queryByText('A confirmação será feita pelo administrador.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Solicitar agendamento' })).toBeEnabled()
  })
})

async function renderReviewStep() {
  const user = userEvent.setup()
  render(<AppointmentFlow />)

  await user.type(screen.getByLabelText('Nome'), 'João Silva')
  await user.type(screen.getByLabelText('Telefone'), '(61) 99999-9999')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(await screen.findByRole('button', { name: /Qui, 20\/08/i }))
  await user.click(await screen.findByRole('button', { name: '09:00' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Revise sua solicitação' })).toBeInTheDocument()
  })
}
