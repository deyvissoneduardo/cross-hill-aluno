'use client'

import { AppShell } from '@/components/ui/AppShell'
import { InlineBanner } from '@/components/ui/InlineBanner'
import { StepProgress } from '@/components/ui/StepProgress'
import { AppointmentProvider, useAppointmentFlow } from '../state/AppointmentProvider'
import { IdentificationStep, type IdentificationSubmitPayload } from './IdentificationStep'
import { ReviewStep } from './ReviewStep'
import { ScheduleStep } from './ScheduleStep'
import { SuccessStep } from './SuccessStep'

const TOTAL_STEPS = 4

function AppointmentFlowContent() {
  const { state, dispatch } = useAppointmentFlow()

  function handleIdentificationContinue(payload: IdentificationSubmitPayload) {
    dispatch({ type: 'SET_IDENTIFICATION', payload })
  }

  if (state.step === 'schedule') {
    return (
      <AppShell>
        <StepProgress currentStep={2} totalSteps={TOTAL_STEPS} />
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Escolha seu horário</h1>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Selecione o dia e depois o horário disponível.
          </p>
          {state.flowError ? <InlineBanner tone="warning">{state.flowError}</InlineBanner> : null}
        </section>
        <ScheduleStep />
      </AppShell>
    )
  }

  if (state.step === 'review') {
    return (
      <AppShell>
        <StepProgress currentStep={3} totalSteps={TOTAL_STEPS} />
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Revise sua solicitação</h1>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Confira os dados antes de solicitar o agendamento.
          </p>
        </section>
        <ReviewStep />
      </AppShell>
    )
  }

  if (state.step === 'success') {
    return (
      <AppShell>
        <StepProgress currentStep={4} totalSteps={TOTAL_STEPS} />
        <SuccessStep />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <StepProgress currentStep={1} totalSteps={TOTAL_STEPS} />
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Solicite seu horário</h1>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Seu pedido será analisado antes da confirmação.
        </p>
      </section>
      <IdentificationStep onContinue={handleIdentificationContinue} />
    </AppShell>
  )
}

export function AppointmentFlow() {
  return (
    <AppointmentProvider>
      <AppointmentFlowContent />
    </AppointmentProvider>
  )
}
