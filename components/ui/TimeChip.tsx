'use client'

/**
 * Chip compacto de horário, com estados selecionado e indisponível.
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`TimeChip`),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4.2, §5 e §9.
 *
 * Mesma disciplina do `SelectionCard`: `aria-pressed` comunica a seleção por
 * semântica, o glifo de marcação dá a pista visual não-cromática e o `disabled`
 * nativo bloqueia a ação. O glifo ocupa espaço mesmo oculto (`invisible`) para que
 * a largura do chip não mude ao selecionar, preservando a grade em 320px.
 *
 * `min-h-11` mantém o alvo de toque confortável mesmo com chips em 2-3 colunas.
 */
export interface TimeChipProps {
  /** Horário no formato `HH:mm`. */
  time: string
  selected?: boolean
  disabled?: boolean
  /** Emitido sem argumentos quando o chip é acionado. */
  onSelect: () => void
}

export function TimeChip({ time, selected = false, disabled = false, onSelect }: TimeChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect()}
      className={[
        'inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border px-3 py-2 text-base font-medium tabular-nums transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        selected
          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--background)]'
          : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)]',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={['shrink-0 text-sm', selected ? 'visible' : 'invisible'].join(' ')}
      >
        ✓
      </span>
      <span>{time}</span>
    </button>
  )
}
