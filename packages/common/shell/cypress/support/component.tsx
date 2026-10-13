import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { mount } from 'cypress/react';
import type { ReactNode } from 'react';
import { createAppTheme } from '../../src/theme';

const theme = createAppTheme();

/** Mounts a component inside the portal theme, as it renders in a real portal. */
function mountWithTheme(children: ReactNode) {
  return mount(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>,
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress declares its commands on this namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mountWithTheme;
    }
  }
}

Cypress.Commands.add('mount', mountWithTheme);
