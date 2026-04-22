import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: [],
  },
  resolve: {
    alias: {
      'razorpay-universal': new URL('./src/index.ts', import.meta.url).pathname,
      'razorpay-universal/react': new URL(
        './src/adapters/react/index.ts',
        import.meta.url,
      ).pathname,
      'razorpay-universal/vue': new URL(
        './src/adapters/vue/index.ts',
        import.meta.url,
      ).pathname,
      'razorpay-universal/vanilla': new URL(
        './src/adapters/vanilla/index.ts',
        import.meta.url,
      ).pathname,
    },
  },
});
