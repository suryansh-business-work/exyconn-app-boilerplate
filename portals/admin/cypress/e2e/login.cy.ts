/**
 * End-to-end sign-in against a real server and database.
 * Needs CYPRESS_ADMIN_EMAIL and CYPRESS_ADMIN_PASSWORD: the admin the server was seeded with.
 */

interface AdminCredentials {
  email: string;
  password: string;
}

/** Reads the seeded admin from Cypress env and runs the steps with it. */
function withAdmin(steps: (admin: AdminCredentials) => void): void {
  cy.env(['ADMIN_EMAIL', 'ADMIN_PASSWORD']).then((values: Record<string, unknown>) => {
    const email = values.ADMIN_EMAIL;
    const password = values.ADMIN_PASSWORD;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new Error('Set CYPRESS_ADMIN_EMAIL and CYPRESS_ADMIN_PASSWORD to the seeded admin');
    }
    steps({ email, password });
  });
}

function field(label: string) {
  return cy
    .contains('label', label)
    .invoke('attr', 'for')
    .then((inputId) => cy.get('#' + String(inputId)));
}

function signIn(email: string, password: string) {
  field('Email address').type(email);
  field('Password').type(password, { log: false });
  cy.contains('button', 'Sign in').click();
}

describe('admin portal sign-in', () => {
  it('sends a signed-out visitor to the login page', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
    cy.contains('h1', 'Sign in').should('be.visible');
  });

  it('refuses a wrong password with a clear message and stays on the login page', () => {
    cy.visit('/login');
    withAdmin(({ email }) => {
      signIn(email, 'Definitely-Wr0ng');
    });

    cy.get('[role="alert"]').should('contain.text', 'The email or password is incorrect.');
    cy.location('pathname').should('eq', '/login');
  });

  it('signs the admin in, loads live data, survives a reload and signs out', () => {
    cy.visit('/');
    withAdmin(({ email, password }) => {
      signIn(email, password);
    });

    cy.location('pathname').should('eq', '/');
    cy.contains('h1', 'Dashboard').should('be.visible');
    cy.contains('Total users')
      .parent()
      .invoke('text')
      .should('match', /Total users\s*[1-9]\d*/);

    // The refresh token is an httpOnly cookie that page scripts cannot read.
    cy.getCookie('refresh_token').should('have.property', 'httpOnly', true);
    cy.document().its('cookie').should('not.contain', 'refresh_token');

    cy.reload();
    cy.contains('h1', 'Dashboard').should('be.visible');

    cy.contains('button', 'Sign out').click();
    cy.location('pathname').should('eq', '/login');
    cy.getCookie('refresh_token').should('not.exist');

    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });
});
