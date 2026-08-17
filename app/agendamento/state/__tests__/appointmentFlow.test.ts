import { describe, expect, it } from 'vitest'

import {
  appointmentReducer,
  type AppointmentState,
  initialAppointmentState,
} from '../appointmentReducer'

/**
 * CT-016 — bloqueio de revisão incompleta.
 *
 * INVARIANT: a etapa de revisão só pode ser alcançada quando identificação,
 * profissional, dia e horário estiverem completos no estado em memória.
 * OWNING_LAYER: unit | REAL_EXECUTION_BOUNDARY: none
 * EXISTING_SUITE: NO_SUITE_FOUND — T11 cria a primeira suíte do reducer do fluxo.
 */

describe('appointmentReducer — transições do fluxo', () => {
  it('blocks_review_with_incomplete_selection', () => {
    const stateWithoutTime: AppointmentState = {
      ...initialAppointmentState,
      step: 'schedule',
      identification: {
        nomeCliente: 'João Silva',
        telefoneNormalizado: '5561999999999',
      },
      selection: {
        profissional: {
          id: 'profissional',
          nome: 'Maria Silva',
        },
        dia: {
          data: '2026-08-20',
          label: 'Qui, 20/08',
        },
        horario: null,
      },
    }

    const nextState = appointmentReducer(stateWithoutTime, { type: 'GO_REVIEW' })

    expect(nextState.step).toBe('schedule')
    expect(nextState.selection.horario).toBeNull()
    expect(nextState.flowError).toBe('Escolha profissional, dia e horário antes de revisar.')
  })
})
