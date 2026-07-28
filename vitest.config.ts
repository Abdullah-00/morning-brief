import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The pipeline is deliberately made of pure functions so it can be tested in
    // plain Node, without the Workers runtime or a network round trip.
    include: ['apps/api/src/**/*.test.ts', 'packages/**/*.test.ts'],
    environment: 'node',
  },
});
