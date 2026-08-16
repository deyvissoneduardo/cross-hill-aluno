import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Exclui a pasta de specs do Playwright: rodam sob '@playwright/test',
    // que quebra se coletado pelo Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
