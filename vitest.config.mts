import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals:      true,
    environment:  'node',     // node for all tests (API routes + unit)
    setupFiles:   ['src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include:  ['src/lib/**', 'src/app/api/**'],
      exclude:  ['src/lib/supabase.ts'],
    },
  },
})
