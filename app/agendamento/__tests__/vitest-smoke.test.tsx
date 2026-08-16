import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * CT-027 — Vitest executa TSX com jsdom e matchers DOM.
 *
 * INVARIANT: a suíte unitária (Vitest) executa TS/TSX da App Router com
 * ambiente jsdom e matchers de DOM (@testing-library/jest-dom) sem
 * depender de um navegador real.
 * OWNING_LAYER: unit
 * EXISTING_SUITE: nenhuma (primeira task da feature — cria a suíte).
 * Real execution boundary: filesystem (o próprio Vitest/jsdom executando
 * o arquivo e renderizando JSX real, sem mocks).
 */

function FormularioMinimo() {
  return (
    <form>
      <button type="submit">Continuar</button>
    </form>
  )
}

describe('infraestrutura de testes web (Vitest + Testing Library + jsdom)', () => {
  it('renderiza JSX e localiza o botão "Continuar" por role/nome com matcher de DOM', () => {
    render(<FormularioMinimo />)

    const botao = screen.getByRole('button', { name: 'Continuar' })

    expect(botao).toBeInTheDocument()
    expect(botao).toHaveTextContent('Continuar')
  })
})
