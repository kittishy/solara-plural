import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', '**/node_modules/**', '.next/**', '.opencode/**', '.claude/**', '.codex/**', '.gemini/**', '.trae/**', 'scripts/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/db/schema.ts', 'lib/db/index.ts'],
    },
  },
});
