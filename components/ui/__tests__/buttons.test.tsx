import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PrimaryButton, type PrimaryButtonProps } from '../PrimaryButton'
import { SecondaryButton } from '../SecondaryButton'

/**
 * CT-037 — `buttons_expose_accessible_states` (CA-16).
 *
 * INVARIANT: os botões globais comunicam nome acessível, disabled e loading por
 * semântica observável (nome acessível estável nos três estados, `aria-busy` em
 * loading) e, quando bloqueados, não emitem a intenção de clique.
 * OWNING_LAYER: unit | REAL_EXECUTION_BOUNDARY: none
 * EXISTING_SUITE: nenhuma para `components/ui` — este arquivo é declarado em §5.1 da T10.
 * Setup: render real do componente com props públicas; único dublê é o handler `onClick`.
 *
 * Deliberadamente não há asserção sobre classes Tailwind: o contrato testado é a
 * árvore de acessibilidade e o comportamento, não o estilo (design.md §9).
 */

const ROTULO = 'Solicitar agendamento'

const BOTOES: ReadonlyArray<{ nome: string; Botao: ComponentType<PrimaryButtonProps> }> = [
  { nome: 'PrimaryButton', Botao: PrimaryButton },
  { nome: 'SecondaryButton', Botao: SecondaryButton },
]

// A suíte roda com `globals: false` (vitest.config.mts), então o auto-cleanup da
// Testing Library não se registra: limpamos ANTES de cada teste, para que um teste
// que falhe no meio não deixe DOM herdado para o próximo.
beforeEach(() => {
  cleanup()
})

describe.each(BOTOES)('$nome — estados acessíveis', ({ Botao }) => {
  it('no estado default expõe o rótulo como nome acessível, fica habilitado, não marca aria-busy e emite a intenção sem argumentos', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Botao onClick={onClick}>{ROTULO}</Botao>)

    const botao = screen.getByRole('button', { name: ROTULO })
    expect(botao).toBeEnabled()
    expect(botao).not.toHaveAttribute('aria-busy')

    await user.click(botao)

    expect(onClick).toHaveBeenCalledTimes(1)
    // Contrato do componente: o handler recebe zero argumentos (intenção, não evento DOM).
    expect(onClick).toHaveBeenLastCalledWith()
  })

  it('em loading mantém o mesmo nome acessível, marca aria-busy="true" e bloqueia o clique', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Botao onClick={onClick} loading>
        {ROTULO}
      </Botao>,
    )

    // Nome acessível estável: o spinner é decorativo e não entra no nome.
    const botao = screen.getByRole('button', { name: ROTULO })
    expect(botao).toHaveAttribute('aria-busy', 'true')
    expect(botao).toBeDisabled()

    await user.click(botao)

    expect(onClick).toHaveBeenCalledTimes(0)
  })

  // Negative companion do default + cenário de erro da T10 §6.4 (controle disabled acionado).
  it('em disabled mantém o mesmo nome acessível, não marca aria-busy e não chama o handler no clique', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Botao onClick={onClick} disabled>
        {ROTULO}
      </Botao>,
    )

    const botao = screen.getByRole('button', { name: ROTULO })
    expect(botao).toBeDisabled()
    expect(botao).not.toHaveAttribute('aria-busy')

    await user.click(botao)

    expect(onClick).toHaveBeenCalledTimes(0)
  })
})
