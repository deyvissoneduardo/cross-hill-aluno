'use client'

import type { ReactNode } from 'react'

/**
 * Mensagem contextual exibida dentro do bloco afetado (erro, aviso, vazio, sucesso).
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`InlineBanner`) e §4,
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4.5, §5 e §5.1.
 *
 * Semântica por tom (§9 do design — não depender apenas de cor):
 * - `error` → `role="alert"` (interrompe: falha bloqueante ou recuperável);
 * - demais tons → `role="status"` (anúncio educado, sem interromper);
 * - todo tom carrega um prefixo textual ("Erro:", "Aviso:", ...) no nome acessível
 *   e um glifo decorativo, de modo que o significado não depende da cor.
 *
 * A ação de recuperação (ex.: "Tentar novamente") é opcional e emitida sem argumentos.
 */
export type InlineBannerTone = 'info' | 'success' | 'warning' | 'error'

export interface InlineBannerProps {
  tone: InlineBannerTone
  /** Título curto opcional acima da mensagem. */
  title?: string
  children: ReactNode
  /** Ação de recuperação exibida no rodapé do banner. */
  action?: { label: string; onClick: () => void }
}

const TONE_PREFIX: Record<InlineBannerTone, string> = {
  info: 'Informação:',
  success: 'Sucesso:',
  warning: 'Aviso:',
  error: 'Erro:',
}

const TONE_GLYPH: Record<InlineBannerTone, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '!',
}

const TONE_CLASSES: Record<InlineBannerTone, string> = {
  info: 'border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground)]',
  success: 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--foreground)]',
  warning: 'border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--foreground)]',
  error: 'border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--foreground)]',
}

const TONE_GLYPH_CLASSES: Record<InlineBannerTone, string> = {
  info: 'bg-[var(--surface)] text-[var(--text-muted)]',
  success: 'bg-[var(--success)] text-[var(--background)]',
  warning: 'bg-[var(--warning)] text-[var(--background)]',
  error: 'bg-[var(--danger)] text-[var(--background)]',
}

export function InlineBanner({ tone, title, children, action }: InlineBannerProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={[
        'flex flex-col gap-2 rounded-2xl border p-4 text-sm',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={[
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            TONE_GLYPH_CLASSES[tone],
          ].join(' ')}
        >
          {TONE_GLYPH[tone]}
        </span>
        <div className="min-w-0 flex flex-col gap-1">
          {/* Prefixo textual: o tom continua perceptível sem enxergar a cor. */}
          <span className="sr-only">{TONE_PREFIX[tone]}</span>
          {title ? <p className="font-semibold break-words">{title}</p> : null}
          <div className="break-words text-[var(--text-muted)]">{children}</div>
        </div>
      </div>

      {action ? (
        <button
          type="button"
          onClick={() => action.onClick()}
          className="min-h-11 self-start rounded-lg px-3 py-2 text-sm font-semibold text-[var(--accent)] underline underline-offset-4 transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-reduce:transition-none"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
