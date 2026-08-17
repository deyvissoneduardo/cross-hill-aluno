/**
 * CT-018..CT-020 + duplicidade diária — envio final e tela de sucesso.
 *
 * INVARIANT: o POST público cria uma Solicitação de Agendamento aguardando
 * confirmação; falhas recuperáveis permanecem na revisão, duplicidade diária
 * mostra mensagem definida e sucesso usa configuração pública ou fallback seguro.
 * OWNING_LAYER: component-integration.
 * EXISTING_SUITE: AppointmentFlow.revisao.test.tsx cobre revisão sem submit; este
 * arquivo cobre a fronteira HTTP de submit e configuração com MSW.
 * REAL_EXECUTION_BOUNDARY: MSW intercepta HTTP público; AppointmentFlow,
 * ReviewStep, SuccessStep, reducer, repositories e componentes UI rodam reais.
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
const SOLICITACAO_ACEITA = {
  id: 'solicitacao-interna-nao-exibida',
  status: 'AGUARDANDO_CONFIRMACAO',
  profissionalNome: 'Ana Souza',
  data: '2026-08-20',
  horario: '09:00',
}

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  cleanup()
  server.use(
    http.get('/api/public/profissionais', () => HttpResponse.json(PROFISSIONAIS_ATIVOS)),
    http.get('/api/public/profissionais/profissional/dias', () => HttpResponse.json(DIAS_LIBERADOS)),
    http.get('/api/public/profissionais/profissional/horarios', () => HttpResponse.json(HORARIOS_ELEGIVEIS)),
    http.get('/api/public/configuracao/sucesso', () =>
      HttpResponse.json({
        titulo: 'Solicitação recebida',
        descricao: 'Seu horário está aguardando confirmação administrativa pela equipe.',
        regras: [],
        dicas: [],
        avisos: [],
      })
    )
  )
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('AppointmentFlow — envio e sucesso', () => {
  it('CT-018 submit_failure_is_recoverable', async () => {
    let postCalls = 0
    server.use(
      http.post('/api/public/agendamentos', () => {
        postCalls += 1
        if (postCalls === 1) {
          return HttpResponse.json({ error: 'falha interna', codigo: 'ERRO_SERVIDOR' }, { status: 500 })
        }
        return HttpResponse.json(SOLICITACAO_ACEITA, { status: 201 })
      })
    )
    const user = userEvent.setup()

    await renderReviewStep(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar agendamento' }))

    expect(await screen.findByText('Não foi possível concluir sua solicitação. Tente novamente.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Revise sua solicitação' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Solicitação recebida' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { name: 'Solicitação recebida' })).toBeInTheDocument()
    expect(postCalls).toBe(2)
  })

  it('shows_daily_duplicate_message', async () => {
    server.use(
      http.post('/api/public/agendamentos', () =>
        HttpResponse.json(
          {
            error: 'duplicidade bloqueada',
            codigo: 'TELEFONE_DUPLICADO_NO_DIA',
          },
          { status: 409 }
        )
      )
    )
    const user = userEvent.setup()

    await renderReviewStep(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar agendamento' }))

    expect(await screen.findByText('Você já possui um agendamento para este dia.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeEnabled()
    expect(screen.queryByRole('heading', { name: 'Solicitação recebida' })).toBeNull()
  })

  it('CT-019 success_uses_public_config', async () => {
    server.use(http.post('/api/public/agendamentos', () => HttpResponse.json(SOLICITACAO_ACEITA, { status: 201 })))
    const user = userEvent.setup()

    await renderReviewStep(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar agendamento' }))

    expect(await screen.findByRole('heading', { name: 'Solicitação recebida' })).toBeInTheDocument()
    expect(screen.getByText('Seu horário está aguardando confirmação administrativa pela equipe.')).toBeInTheDocument()
    expect(screen.queryByText('Agendamento solicitado!')).toBeNull()
    expect(screen.queryByText('solicitacao-interna-nao-exibida')).toBeNull()
    expect(screen.queryByText(/horário confirmado/i)).toBeNull()
  })

  it('CT-020 success_uses_safe_fallback', async () => {
    server.use(
      http.post('/api/public/agendamentos', () => HttpResponse.json(SOLICITACAO_ACEITA, { status: 201 })),
      http.get('/api/public/configuracao/sucesso', () => HttpResponse.json({}, { status: 404 }))
    )
    const user = userEvent.setup()

    await renderReviewStep(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar agendamento' }))

    expect(await screen.findByRole('heading', { name: 'Agendamento solicitado!' })).toBeInTheDocument()
    expect(screen.getByText('Seu horário está aguardando confirmação administrativa.')).toBeInTheDocument()
    expect(screen.queryByText('solicitacao-interna-nao-exibida')).toBeNull()
  })
})

async function renderReviewStep(user: ReturnType<typeof userEvent.setup>) {
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
