/**
 * Placeholder de carregamento com dimensão estável.
 *
 * Contrato visual: `docs/specs/design-system.md` §3 (`SkeletonBlock`) e §4 (loading),
 * `docs/specs/features/agendamento-cliente/v1/design.md` §5.
 *
 * A altura/largura vêm por prop e são aplicadas como estilo inline porque o espaço
 * reservado é o próprio contrato do componente (CLS ≤ 0,1 — tech_spec §11.1): o bloco
 * ocupa exatamente a dimensão do conteúdo que substitui, em qualquer tela.
 *
 * `role="status"` + `aria-busy` comunicam o carregamento a leitores de tela; o pulso
 * é suprimido sob `prefers-reduced-motion` (§9 do design), sem perder a semântica.
 */
export interface SkeletonBlockProps {
  /** Altura CSS reservada (ex.: `'4.5rem'`). */
  height: string
  /** Largura CSS reservada. Padrão: ocupa a largura do container. */
  width?: string
  /** Texto acessível do carregamento (ex.: `'Carregando profissionais'`). */
  label?: string
}

export function SkeletonBlock({
  height,
  width = '100%',
  label = 'Carregando',
}: SkeletonBlockProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      style={{ height, width }}
      className="animate-pulse rounded-xl bg-[var(--surface-muted)] motion-reduce:animate-none"
    >
      <span className="sr-only">{label}</span>
    </div>
  )
}
