/**
 * Indicador discreto de etapa atual da jornada.
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`StepProgress`),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4 (`[ progresso 2/4 ]`).
 *
 * A etapa atual é comunicada por três vias independentes de cor (§9 do design):
 * texto visível ("Etapa 2 de 4"), `role="progressbar"` com `aria-valuenow` e
 * `aria-valuetext`. A trilha de segmentos é puramente decorativa (`aria-hidden`)
 * e tem altura fixa, mantendo a dimensão estável entre etapas.
 */
export interface StepProgressProps {
  /** Etapa atual, base 1. */
  currentStep: number
  /** Total de etapas da jornada. */
  totalSteps: number
  /** Nome acessível do progresso. */
  label?: string
}

export function StepProgress({
  currentStep,
  totalSteps,
  label = 'Progresso do agendamento',
}: StepProgressProps) {
  const texto = `Etapa ${currentStep} de ${totalSteps}`
  const segmentos = Array.from({ length: totalSteps }, (_, indice) => indice + 1)

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-valuetext={texto}
      className="flex flex-col gap-2"
    >
      <span className="text-xs font-medium tracking-wide text-[var(--text-muted)] uppercase">
        {texto}
      </span>
      <span aria-hidden="true" className="flex h-1 w-full gap-1.5">
        {segmentos.map((segmento) => (
          <span
            key={segmento}
            className={[
              'h-1 flex-1 rounded-full transition-colors duration-150 motion-reduce:transition-none',
              segmento <= currentStep
                ? 'bg-[var(--accent)]'
                : 'bg-[var(--border-subtle)]',
            ].join(' ')}
          />
        ))}
      </span>
    </div>
  )
}
