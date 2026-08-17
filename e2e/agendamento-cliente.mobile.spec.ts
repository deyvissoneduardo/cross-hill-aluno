import { expect, type Page, test } from '@playwright/test'

const PROFISSIONAIS = [{ id: 'profissional', nome: 'Maria Silva' }]
const DIAS = [{ data: '2026-08-20', label: 'Qui, 20/08' }]
const HORARIOS = [{ horario: '09:00' }]
const SOLICITACAO_ACEITA = {
  id: 'solicitacao-mobile-1',
  status: 'AGUARDANDO_CONFIRMACAO',
  profissionalNome: 'Maria Silva',
  data: '2026-08-20',
  horario: '09:00',
}
const CONFIGURACAO_SUCESSO = {
  titulo: 'Agendamento solicitado!',
  descricao: 'Seu horário está aguardando confirmação administrativa.',
  regras: [],
  dicas: [],
  avisos: [],
}

test.describe('agendamento do cliente em mobile e reduced motion', () => {
  test('CT-022: fluxo completo é utilizável em viewport 320x720', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await prepararApiPublica(page)

    await page.goto('/')
    await assertSemOverflowHorizontal(page)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Progresso do agendamento' })).toHaveAttribute(
      'aria-valuetext',
      'Etapa 1 de 4'
    )

    await page.getByLabel('Nome').fill('Carla Cliente')
    await page.getByLabel('Telefone').fill('(61) 96666-6666')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeInViewport()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await selecionarFluxoMobile(page)
    await assertSemOverflowHorizontal(page)

    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeInViewport()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page.getByRole('heading', { name: 'Revise sua solicitação' })).toBeVisible()
    await assertSemOverflowHorizontal(page)
    await expect(page.getByRole('button', { name: 'Solicitar agendamento' })).toBeInViewport()
    await page.getByRole('button', { name: 'Solicitar agendamento' }).click()

    await expect(page.getByRole('heading', { name: 'Agendamento solicitado!' })).toBeVisible()
    await expect(page.getByText('Seu horário está aguardando confirmação administrativa.')).toBeVisible()
    await assertSemOverflowHorizontal(page)
  })

  test('CT-023: reduced motion preserva erro, seleção, foco e sucesso por semântica', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await prepararApiPublica(page)

    await page.goto('/')
    await expect
      .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
      .toBe(true)

    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Informe seu nome.')).toBeVisible()
    await expect(page.getByText('Informe um telefone.')).toBeVisible()
    await expect(page.getByLabel('Nome')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Telefone')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Nome').fill('Daniel Cliente')
    await page.getByLabel('Telefone').fill('(61) 95555-5555')
    await page.getByRole('button', { name: 'Continuar' }).click()

    const dia = page.getByRole('button', { name: /Qui, 20\/08/ })
    await dia.click()
    await expect(dia).toBeFocused()
    await expect(dia).toHaveAttribute('aria-pressed', 'true')

    const horario = page.getByRole('button', { name: /09:00/ })
    await horario.click()
    await expect(horario).toBeFocused()
    await expect(horario).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Solicitar agendamento' }).click()

    await expect(page.getByRole('progressbar', { name: 'Progresso do agendamento' })).toHaveAttribute(
      'aria-valuetext',
      'Etapa 4 de 4'
    )
    await expect(page.getByRole('heading', { name: 'Agendamento solicitado!' })).toBeVisible()
    await expect(page.getByText(/agendamento confirmado|horário confirmado|confirmado com sucesso/i)).toHaveCount(0)
  })
})

async function prepararApiPublica(page: Page) {
  await page.route('**/api/public/profissionais', async (route) => {
    await route.fulfill({ json: PROFISSIONAIS })
  })
  await page.route('**/api/public/profissionais/profissional/dias', async (route) => {
    await route.fulfill({ json: DIAS })
  })
  await page.route('**/api/public/profissionais/profissional/horarios**', async (route) => {
    await route.fulfill({ json: HORARIOS })
  })
  await page.route('**/api/public/agendamentos', async (route) => {
    await route.fulfill({ status: 201, json: SOLICITACAO_ACEITA })
  })
  await page.route('**/api/public/configuracao/sucesso', async (route) => {
    await route.fulfill({ json: CONFIGURACAO_SUCESSO })
  })
}

async function selecionarFluxoMobile(page: Page) {
  await expect(page.getByRole('heading', { name: 'Escolha seu horário' })).toBeVisible()
  await page.getByRole('button', { name: /Qui, 20\/08/ }).click()
  await page.getByRole('button', { name: /09:00/ }).click()
}

async function assertSemOverflowHorizontal(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        body: document.body.scrollWidth <= document.body.clientWidth,
        html: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      }))
    )
    .toEqual({ body: true, html: true })
}
