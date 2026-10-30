import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Limite la mémoire utilisée (machines de développement modestes, Docker en parallèle).
    maxWorkers: 2,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.ts'],
          env: {
            VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
            VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
          },
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 20000,
          fileParallelism: false,
        },
      },
    ],
  },
})
