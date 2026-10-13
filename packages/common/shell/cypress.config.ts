import react from '@vitejs/plugin-react';
import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: { plugins: [react()] },
    },
    specPattern: 'src/**/*.cy.tsx',
    supportFile: 'cypress/support/component.tsx',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
});
