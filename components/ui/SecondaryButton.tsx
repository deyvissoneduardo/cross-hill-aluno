'use client'

import type { ReactNode } from 'react'

/**
 * Ação secundária e não destrutiva (Voltar).
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`SecondaryButton`),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4.2 e §4.3.
 *
 * Mesma disciplina de estados do `PrimaryButton` (`loading` → `aria-busy` + bloqueio,
 * `disabled` nativo, rótulo sempre visível), com hierarquia visual de superfície:
 * borda sutil sobre a superfície do painel, sem preenchimento de destaque.
 */
export interface SecondaryButtonProps {
  children: ReactNode
  /** Emitido sem argumentos: o botão comunica intenção, não o evento DOM. */
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
}: SecondaryButtonProps) {
  const bloqueado = disabled || loading

  return (
    <button
      type={type}
      onClick={() => onClick?.()}
      disabled={bloqueado}
      aria-busy={loading ? true : undefined}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3 text-base font-medium text-[var(--foreground)] transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      ) : null}
      <span>{children}</span>
    </button>
  )
}
