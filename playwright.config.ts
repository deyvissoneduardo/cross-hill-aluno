import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PORT ?? '3000'
const baseURL = `http://localhost:${PORT}`

/**
 * Configuração Playwright para os testes E2E do app Next.js.
 * Nesta task nenhum fluxo funcional é executado — apenas a infraestrutura
 * fica pronta para as tasks seguintes da feature de agendamento.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
