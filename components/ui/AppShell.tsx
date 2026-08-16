import type { ReactNode } from 'react'

/**
 * Shell de página dark-first com painel central responsivo.
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`AppShell`) e §5 (responsividade),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4 e §6.
 *
 * Base/celular: painel ocupa a largura total com padding confortável (legível em 320px).
 * `sm`+: painel ganha largura máxima contida e permanece centralizado — o fluxo nunca
 * vira dashboard. Sem I/O: recebe apenas conteúdo por props.
 */
export interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 sm:py-10">
      {/* `main` dá o landmark de conteúdo principal (a11y: ordem de leitura linear). */}
      <main className="flex w-full max-w-[28rem] flex-col gap-6">{children}</main>
    </div>
  )
}
