import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/app/MainLayout.tsx',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/lib/seeder.ts',
        'src/shared/utils/sampleData.ts',
        'src/shared/utils/seedData.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        // Critical paths — higher coverage targets
        'src/infrastructure/services/SyncServiceImpl.ts': { lines: 80, functions: 80 },
        'src/shared/store/useSecurityStore.ts': { lines: 75, functions: 75 },
        'src/lib/cryptoIndexedDB.ts': { lines: 85, functions: 85 },
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@app': path.resolve(__dirname, './src/app'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@application': path.resolve(__dirname, './src/application'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
