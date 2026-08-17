import { expect, type Page, test } from '@playwright/test'

const PROFISSIONAIS = [{ id: 'profissional', nome: 'Maria Silva' }]

const DIAS = [{ data: '2026-08-20', label: 'Qui, 20/08' }]
const HORARIOS = [{ horario: '09:00' }, { horario: '14:00' }]

const CONFIGURACAO_SUCESSO = {
  titulo: 'Agendamento solicitado!',
  descricao: 'Seu horário está aguardando confirmação administrativa.',
  regras: ['A equipe administrativa analisará a solicitação.'],
  dicas: ['Chegue com 10 minutos de antecedência após a confirmação.'],
  avisos: ['Você receberá retorno pelo telefone informado.'],
}

const SOLICITACAO_ACEITA = {
  id: 'solicitacao-e2e-1',
  status: 'AGUARDANDO_CONFIRMACAO',
  profissionalNome: 'Maria Silva',
  data: '2026-08-20',
  horario: '09:00',
}

test.describe('agendamento do cliente', () => {
  test('CT-017: cliente conclui solicitação e vê sucesso aguardando confirmação', async ({ page }) => {
    await prepararApiPublica(page)

    await preencherFluxoAteRevisao(page, {
      nome: 'Ana Cliente',
      telefone: '(61) 99999-9999',
    })
    await expect(page.getByRole('heading', { name: 'Revise sua solicitação' })).toBeVisible()
    await expect(page.getByText('A confirmação será feita pelo administrador.')).toBeVisible()

    await page.getByRole('button', { name: 'Solicitar agendamento' }).click()

    await expect(page.getByRole('heading', { name: 'Agendamento solicitado!' })).toBeVisible()
    await expect(
      page.getByText('Seu horário está aguardando confirmação administrativa.')
    ).toBeVisible()
    await expect(page.getByText('A equipe administrativa analisará a solicitação.')).toBeVisible()
    await expect(page.getByText(/agendamento confirmado|horário confirmado|confirmado com sucesso/i)).toHaveCount(0)
  })

  test('CT-021: slot concorrente não revela dados ou contadores de terceiros', async ({ page }) => {
    await prepararApiPublica(page, {
      horarios: [
        {
          horario: '09:00',
          nomeClienteConcorrente: 'Cliente Concorrente',
          telefoneConcorrente: '(61) 98888-0000',
          quantidadeSolicitacoesConcorrentes: 7,
          detalheConcorrencia: '7 solicitações aguardando',
        },
      ],
      solicitacao: {
        ...SOLICITACAO_ACEITA,
        nomeClienteConcorrente: 'Cliente Concorrente',
        telefoneConcorrente: '(61) 98888-0000',
        quantidadeSolicitacoesConcorrentes: 7,
      },
    })

    await preencherIdentificacao(page, 'Bruno Cliente', '(61) 97777-7777')
    await selecionarHorario(page)
    await assertNaoRevelaTerceiros(page)

    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Revise sua solicitação' })).toBeVisible()
    await assertNaoRevelaTerceiros(page)

    await page.getByRole('button', { name: 'Solicitar agendamento' }).click()
    await expect(page.getByRole('heading', { name: 'Agendamento solicitado!' })).toBeVisible()
    await assertNaoRevelaTerceiros(page)
  })
})

async function prepararApiPublica(
  page: Page,
  overrides: {
    horarios?: unknown[]
    solicitacao?: Record<string, unknown>
    postStatus?: number
  } = {}
) {
  await page.route('**/api/public/profissionais', async (route) => {
    await route.fulfill({ json: PROFISSIONAIS })
  })
  await page.route('**/api/public/profissionais/profissional/dias', async (route) => {
    await route.fulfill({ json: DIAS })
  })
  await page.route('**/api/public/profissionais/profissional/horarios**', async (route) => {
    await route.fulfill({ json: overrides.horarios ?? HORARIOS })
  })
  await page.route('**/api/public/agendamentos', async (route) => {
    await route.fulfill({
      status: overrides.postStatus ?? 201,
      json: overrides.solicitacao ?? SOLICITACAO_ACEITA,
    })
  })
  await page.route('**/api/public/configuracao/sucesso', async (route) => {
    await route.fulfill({ json: CONFIGURACAO_SUCESSO })
  })
}

async function preencherFluxoAteRevisao(
  page: Page,
  cliente: { nome: string; telefone: string }
) {
  await preencherIdentificacao(page, cliente.nome, cliente.telefone)
  await selecionarHorario(page)
  await page.getByRole('button', { name: 'Continuar' }).click()
}

async function preencherIdentificacao(page: Page, nome: string, telefone: string) {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page).toHaveTitle('CrossHill | Agendamento')
  await expect(page.getByRole('heading', { name: 'Solicite seu horário' })).toBeVisible()
  await expect(page.getByText('Seu pedido será analisado antes da confirmação.')).toBeVisible()
  await expect(page.getByAltText('Next.js logo')).toHaveCount(0)

  await page.getByLabel('Nome').fill(nome)
  await page.getByLabel('Telefone').fill(telefone)
  await page.getByRole('button', { name: 'Continuar' }).click()
}

async function selecionarHorario(page: Page) {
  await expect(page.getByRole('heading', { name: 'Escolha seu horário' })).toBeVisible()
  await page.getByRole('button', { name: /Qui, 20\/08/ }).click()
  await expect(page.getByRole('button', { name: /Qui, 20\/08/ })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /09:00/ }).click()
  await expect(page.getByRole('button', { name: /09:00/ })).toHaveAttribute('aria-pressed', 'true')
}

async function assertNaoRevelaTerceiros(page: Page) {
  const body = page.locator('body')
  await expect(body).not.toContainText('Cliente Concorrente')
  await expect(body).not.toContainText('(61) 98888-0000')
  await expect(body).not.toContainText('7 solicitações aguardando')
  await expect(body).not.toContainText('quantidadeSolicitacoesConcorrentes')
}
