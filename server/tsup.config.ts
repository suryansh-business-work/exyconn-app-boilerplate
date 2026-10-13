import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript sources, so they are compiled into the bundle.
  noExternal: [/^@common\//],
});
