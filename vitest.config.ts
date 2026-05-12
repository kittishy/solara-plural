import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolves @/ path aliases from tsconfig.json without needing a plugin
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', '.next', 'scripts/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/db/schema.ts', 'lib/db/index.ts'],
    },
  },
});
