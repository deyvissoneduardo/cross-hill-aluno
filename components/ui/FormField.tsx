'use client'

/**
 * Campo de formulário com label, texto de apoio e erro inline.
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`FormField`),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4.1 e §5 (erro inline sob
 * o campo afetado, com borda em `--danger`).
 *
 * Acessibilidade (tech_spec §13.2): `label` explícito via `htmlFor`, apoio e erro
 * associados por `aria-describedby`, `aria-invalid` no estado de erro e a mensagem
 * anunciada por `role="alert"`. O erro é comunicado por texto — nunca só por cor.
 * `text-base` evita zoom automático em iOS; `min-h-12` mantém alvo de toque confortável.
 */
export interface FormFieldProps {
  /** Id do input — base para associar label, apoio e erro. */
  id: string
  label: string
  value: string
  /** Emitido com o valor já extraído do input. */
  onChange: (value: string) => void
  type?: 'text' | 'tel'
  inputMode?: 'text' | 'tel'
  autoComplete?: string
  placeholder?: string
  /** Texto de apoio exibido abaixo do label. */
  hint?: string
  /** Mensagem de erro inline; quando presente, o campo entra em estado inválido. */
  error?: string
}

export function FormField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  hint,
  error,
}: FormFieldProps) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}

      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'min-h-12 w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] transition-colors duration-150 outline-none placeholder:text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-reduce:transition-none',
          error ? 'border-[var(--danger)]' : 'border-[var(--border-subtle)]',
        ].join(' ')}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
