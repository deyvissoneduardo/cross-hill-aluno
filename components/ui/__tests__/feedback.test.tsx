import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InlineBanner, type InlineBannerTone } from '../InlineBanner'
import { SkeletonBlock } from '../SkeletonBlock'
import { StepProgress } from '../StepProgress'

/**
 * CT-039 — `skeleton_and_progress_preserve_semantics` (CA-16).
 *
 * INVARIANT: os componentes de feedback comunicam estado sem depender de cor nem de
 * classe CSS — o skeleton anuncia carregamento (`role="status"` + `aria-busy`) e
 * reserva exatamente a dimensão recebida; o `StepProgress` comunica a etapa atual por
 * `aria-valuenow`/`aria-valuetext` e por texto visível; o `InlineBanner` escolhe a
 * urgência do papel (`alert` vs `status`) e carrega o prefixo textual do tom.
 * OWNING_LAYER: unit | REAL_EXECUTION_BOUNDARY: none
 * EXISTING_SUITE: nenhuma para `components/ui` — este arquivo é declarado em §5.1 da T10.
 * Setup: render real; sem mocks, exceto o handler da ação do banner.
 */

// A suíte roda com `globals: false` (vitest.config.mts), então o auto-cleanup da
// Testing Library não se registra: limpamos ANTES de cada teste, para que um teste
// que falhe no meio não deixe DOM herdado para o próximo.
beforeEach(() => {
  cleanup()
})

describe('SkeletonBlock — semântica de carregamento e dimensão reservada', () => {
  // SUT_IS_CORRECT_BECAUSE: o componente aplica exatamente as strings CSS recebidas
  // (`4.5rem`, `12rem`); o jsdom resolve `rem` contra o root font-size padrão de 16px
  // ao ler o estilo computado, por isso a dimensão esperada é declarada em px.
  it.each([
    {
      caso: 'com label e largura explícitas',
      elemento: <SkeletonBlock height="4.5rem" width="12rem" label="Carregando profissionais" />,
      textoEsperado: 'Carregando profissionais',
      larguraEsperada: '192px',
    },
    {
      caso: 'com label e largura padrão',
      elemento: <SkeletonBlock height="4.5rem" />,
      textoEsperado: 'Carregando',
      larguraEsperada: '100%',
    },
  ])('$caso anuncia o carregamento e reserva a dimensão recebida', ({
    elemento,
    textoEsperado,
    larguraEsperada,
  }) => {
    render(elemento)

    const skeleton = screen.getByRole('status')

    expect(skeleton).toHaveAttribute('aria-busy', 'true')
    expect(skeleton).toHaveTextContent(textoEsperado)
    expect(skeleton).toHaveStyle({ height: '72px', width: larguraEsperada })
  })
})

describe('StepProgress — etapa atual comunicada por semântica e texto', () => {
  it.each([
    { currentStep: 1, totalSteps: 4, texto: 'Etapa 1 de 4' },
    { currentStep: 2, totalSteps: 4, texto: 'Etapa 2 de 4' },
    { currentStep: 4, totalSteps: 4, texto: 'Etapa 4 de 4' },
  ])('etapa $currentStep de $totalSteps expõe "$texto" em aria-valuetext, aria-valuenow e texto visível', ({
    currentStep,
    totalSteps,
    texto,
  }) => {
    render(<StepProgress currentStep={currentStep} totalSteps={totalSteps} />)

    const progresso = screen.getByRole('progressbar')

    expect(progresso).toHaveAttribute('aria-valuenow', String(currentStep))
    expect(progresso).toHaveAttribute('aria-valuemin', '1')
    expect(progresso).toHaveAttribute('aria-valuemax', String(totalSteps))
    expect(progresso).toHaveAttribute('aria-valuetext', texto)
    // Terceira via, independente de cor e de leitor de tela: o texto na tela.
    expect(progresso).toHaveTextContent(texto)
  })

  it('sem label usa "Progresso do agendamento" como nome acessível', () => {
    render(<StepProgress currentStep={2} totalSteps={4} />)

    expect(screen.getByRole('progressbar', { name: 'Progresso do agendamento' })).toBeInTheDocument()
  })

  it('com label informado substitui o nome acessível padrão', () => {
    render(<StepProgress currentStep={2} totalSteps={4} label="Progresso da solicitação" />)

    expect(screen.getByRole('progressbar', { name: 'Progresso da solicitação' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: 'Progresso do agendamento' })).toBeNull()
  })
})

describe('InlineBanner — papel e prefixo textual por tom', () => {
  it('no tom error interrompe com role="alert", prefixa "Erro:" e emite a ação sem argumentos', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <InlineBanner
        tone="error"
        title="Falha ao carregar horários"
        action={{ label: 'Tentar novamente', onClick }}
      >
        Verifique sua conexão.
      </InlineBanner>,
    )

    const banner = screen.getByRole('alert')
    expect(banner).toHaveTextContent('Erro:')
    expect(banner).toHaveTextContent('Falha ao carregar horários')
    expect(banner).toHaveTextContent('Verifique sua conexão.')
    // Nenhum banner de tom error deve ser anunciado como `status` (anúncio educado).
    expect(screen.queryByRole('status')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenLastCalledWith()
  })

  it.each([
    { tone: 'info' as InlineBannerTone, prefixo: 'Informação:' },
    { tone: 'success' as InlineBannerTone, prefixo: 'Sucesso:' },
    { tone: 'warning' as InlineBannerTone, prefixo: 'Aviso:' },
  ])('no tom $tone anuncia com role="status" e prefixa "$prefixo"', ({ tone, prefixo }) => {
    render(<InlineBanner tone={tone}>Nenhum horário disponível neste dia.</InlineBanner>)

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(prefixo)
    expect(banner).toHaveTextContent('Nenhum horário disponível neste dia.')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('sem a prop action não renderiza botão de recuperação', () => {
    render(<InlineBanner tone="error">Não foi possível concluir.</InlineBanner>)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível concluir.')
  })
})
