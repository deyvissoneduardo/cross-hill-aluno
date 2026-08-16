'use client'

import type { ReactNode } from 'react'

/**
 * Ação principal do fluxo (Continuar, Solicitar agendamento, Tentar novamente).
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`PrimaryButton`),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4, §8 e §9.
 *
 * Estados por semântica, não por cor (§9 do design):
 * - `loading` → `aria-busy="true"` + `disabled`, impedindo repetição da ação (§8);
 * - `disabled` → estado nativo `disabled`, exposto na árvore de acessibilidade;
 * - o rótulo permanece visível nos três estados, mantendo o nome acessível estável.
 *
 * O spinner é decorativo (`aria-hidden`) e não anima sob `prefers-reduced-motion`.
 * `min-h-12` garante alvo de toque confortável e altura estável entre estados.
 */
export interface PrimaryButtonProps {
  children: ReactNode
  /** Emitido sem argumentos: o botão comunica intenção, não o evento DOM. */
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
}: PrimaryButtonProps) {
  const bloqueado = disabled || loading

  return (
    <button
      type={type}
      onClick={() => onClick?.()}
      disabled={bloqueado}
      aria-busy={loading ? true : undefined}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-base font-semibold text-[var(--background)] transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
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
