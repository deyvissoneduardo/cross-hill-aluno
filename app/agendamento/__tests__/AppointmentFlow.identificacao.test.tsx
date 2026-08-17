import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AppointmentFlow } from '../components/AppointmentFlow'

/**
 * CT-001..CT-003 — identificação inicial do fluxo.
 *
 * INVARIANT: a primeira etapa coleta apenas nome e telefone, bloqueia identificação
 * inválida com erro inline e libera a etapa de escolha somente após dados válidos.
 * OWNING_LAYER: unit | REAL_EXECUTION_BOUNDARY: none
 * EXISTING_SUITE: NO_SUITE_FOUND — T11 cria a primeira suíte do container
 * `AppointmentFlow`; suítes existentes cobrem apenas infra, tipos, validações e UI base.
 */

beforeEach(() => {
  cleanup()
})

describe('AppointmentFlow — identificação', () => {
  it('renders_identification_without_account_fields', () => {
    render(<AppointmentFlow />)

    expect(screen.getByRole('heading', { name: 'Solicite seu horário' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()

    expect(screen.queryByText(/senha|login|conta|perfil|cadastro/i)).toBeNull()
    expect(screen.queryByLabelText(/senha|login|conta|perfil|cadastro/i)).toBeNull()
  })

  it('blocks_continue_without_required_fields', async () => {
    const user = userEvent.setup()
    render(<AppointmentFlow />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { name: 'Solicite seu horário' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByText('Informe seu nome.')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Informe um telefone.')).toHaveAttribute('role', 'alert')
    expect(screen.queryByRole('heading', { name: 'Escolha seu horário' })).toBeNull()
  })

  it('advances_with_valid_identification', async () => {
    const user = userEvent.setup()
    render(<AppointmentFlow />)

    await user.type(screen.getByLabelText('Nome'), 'João Silva')
    await user.type(screen.getByLabelText('Telefone'), '(61) 99999-9999')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { name: 'Escolha seu horário' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(screen.queryByRole('heading', { name: 'Solicite seu horário' })).toBeNull()
  })
})
