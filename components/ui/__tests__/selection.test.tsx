import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SelectionCard } from '../SelectionCard'
import { TimeChip } from '../TimeChip'

/**
 * CT-038 — `selection_controls_expose_state_semantics` (CA-05, CA-06, CA-16).
 *
 * INVARIANT: seleção e indisponibilidade dos controles de escolha (dia/profissional
 * em `SelectionCard`, horário em `TimeChip`) são perceptíveis pela árvore de
 * acessibilidade — `aria-pressed` reflete a seleção e o nome acessível não muda ao
 * selecionar — e o controle indisponível não emite `onSelect`.
 * OWNING_LAYER: unit | REAL_EXECUTION_BOUNDARY: none
 * EXISTING_SUITE: nenhuma para `components/ui` — este arquivo é declarado em §5.1 da T10.
 * Setup: render real + `user-event`; único dublê é o handler `onSelect`.
 *
 * Nenhuma asserção sobre classe CSS: o marcador visual ("Selecionado", "✓") é
 * `aria-hidden` e sua função no contrato é justamente NÃO alterar o nome acessível.
 */

interface EstadoSelecao {
  selected?: boolean
  disabled?: boolean
  onSelect: () => void
}

const CONTROLES: ReadonlyArray<{
  nome: string
  /** Nome acessível esperado — deve ser idêntico em todos os estados. */
  nomeAcessivel: string
  renderizar: (estado: EstadoSelecao) => ReactElement
}> = [
  {
    nome: 'SelectionCard',
    // SUT_IS_CORRECT_BECAUSE: a tabela de estados usa o card sem `description` de
    // propósito. Com descrição, o nome acessível calculado em jsdom concatena os dois
    // spans sem separador ("Ana SouzaCREF 123456-G/SP") porque o layout flex do
    // Tailwind não é aplicado no ambiente de teste — um artefato do ambiente, não do
    // componente. A descrição tem cobertura própria em "conteúdo de apoio".
    nomeAcessivel: 'Ana Souza',
    renderizar: (estado) => <SelectionCard title="Ana Souza" {...estado} />,
  },
  {
    nome: 'TimeChip',
    nomeAcessivel: '09:00',
    renderizar: (estado) => <TimeChip time="09:00" {...estado} />,
  },
]

// A suíte roda com `globals: false` (vitest.config.mts), então o auto-cleanup da
// Testing Library não se registra: limpamos ANTES de cada teste, para que um teste
// que falhe no meio não deixe DOM herdado para o próximo.
beforeEach(() => {
  cleanup()
})

describe.each(CONTROLES)('$nome — semântica de seleção', ({ nomeAcessivel, renderizar }) => {
  it('quando não selecionado expõe aria-pressed="false" e emite onSelect sem argumentos ao ser acionado', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(renderizar({ onSelect }))

    const controle = screen.getByRole('button', { name: nomeAcessivel })
    expect(controle).toHaveAttribute('aria-pressed', 'false')
    expect(controle).toBeEnabled()

    await user.click(controle)

    expect(onSelect).toHaveBeenCalledTimes(1)
    // Contrato do componente: `onSelect` não recebe o evento DOM.
    expect(onSelect).toHaveBeenLastCalledWith()
  })

  it('quando selecionado expõe aria-pressed="true" sem alterar o nome acessível e continua acionável', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(renderizar({ selected: true, onSelect }))

    // O mesmo nome acessível do estado não selecionado localiza o controle.
    const controle = screen.getByRole('button', { name: nomeAcessivel })
    expect(controle).toHaveAttribute('aria-pressed', 'true')

    await user.click(controle)

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  // Negative companion + cenário de erro da T10 §6.4 (controle disabled acionado).
  it('quando indisponível é exposto como disabled e não emite onSelect ao ser clicado', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(renderizar({ disabled: true, onSelect }))

    const controle = screen.getByRole('button', { name: nomeAcessivel })
    expect(controle).toBeDisabled()
    expect(controle).toHaveAttribute('aria-pressed', 'false')

    await user.click(controle)

    expect(onSelect).toHaveBeenCalledTimes(0)
  })
})

describe('SelectionCard — conteúdo de apoio', () => {
  it('renderiza a descrição informada como texto de apoio', () => {
    render(<SelectionCard title="Ana Souza" description="CREF 123456-G/SP" onSelect={vi.fn()} />)

    expect(screen.getByText('CREF 123456-G/SP')).toBeInTheDocument()
  })

  it('sem descrição não renderiza texto de apoio e o nome acessível é apenas o título', () => {
    render(<SelectionCard title="Ana Souza" onSelect={vi.fn()} />)

    expect(screen.queryByText('CREF 123456-G/SP')).toBeNull()
    expect(screen.getByRole('button', { name: 'Ana Souza' })).toBeInTheDocument()
  })
})
