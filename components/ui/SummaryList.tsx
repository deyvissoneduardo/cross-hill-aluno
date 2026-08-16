/**
 * Lista compacta de rótulo/valor usada na revisão antes do envio.
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`SummaryList`),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §4.3.
 *
 * Usa `dl`/`dt`/`dd` para que a associação rótulo→valor seja semântica, não visual.
 * Em 320px o valor quebra em várias linhas em vez de estourar a largura do painel.
 */
export interface SummaryListItem {
  label: string
  value: string
}

export interface SummaryListProps {
  items: SummaryListItem[]
}

export function SummaryList({ items }: SummaryListProps) {
  return (
    <dl className="flex flex-col divide-y divide-[var(--border-subtle)] rounded-2xl bg-[var(--surface-muted)] px-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
        >
          <dt className="text-sm text-[var(--text-muted)]">{item.label}</dt>
          <dd className="min-w-0 text-right text-sm font-medium break-words text-[var(--foreground)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
