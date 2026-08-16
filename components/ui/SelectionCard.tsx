'use client'

/**
 * Card selecionável (profissional, dia) com estados default, foco, selecionado e desabilitado.
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`SelectionCard`),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4.2, §5 e §8.
 *
 * A seleção é um toggle button: `aria-pressed` expõe o estado na árvore de
 * acessibilidade e o marcador textual "Selecionado" o expõe visualmente — a seleção
 * nunca depende só de cor (§9 do design). O marcador é `aria-hidden` para não
 * duplicar o anúncio de `aria-pressed`, e ocupa espaço mesmo quando oculto
 * (`invisible`), mantendo a altura do card estável entre os estados.
 *
 * Indisponibilidade usa o `disabled` nativo: o estado é anunciado e o clique não
 * dispara `onSelect` — o bloqueio não depende de estilo visual.
 */
export interface SelectionCardProps {
  /** Rótulo principal (ex.: nome do profissional, data). */
  title: string
  /** Informação de apoio (ex.: CREF). */
  description?: string
  selected?: boolean
  disabled?: boolean
  /** Emitido sem argumentos quando o card é acionado. */
  onSelect: () => void
}

export function SelectionCard({
  title,
  description,
  selected = false,
  disabled = false,
  onSelect,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect()}
      className={[
        'flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        selected
          ? 'border-[var(--accent)] bg-[var(--surface-muted)]'
          : 'border-[var(--border-subtle)] bg-[var(--surface)]',
      ].join(' ')}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base font-medium break-words text-[var(--foreground)]">
          {title}
        </span>
        {description ? (
          <span className="text-sm break-words text-[var(--text-muted)]">{description}</span>
        ) : null}
      </span>

      <span
        aria-hidden="true"
        className={[
          'shrink-0 text-xs font-semibold text-[var(--accent)] uppercase',
          selected ? 'visible' : 'invisible',
        ].join(' ')}
      >
        Selecionado
      </span>
    </button>
  )
}
