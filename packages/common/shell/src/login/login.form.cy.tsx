import { LoginForm } from './login.form';
import type { LoginValues } from './login.types';

const resolved = (): Promise<void> => Promise.resolve();

function mountForm(
  onSubmit: (values: LoginValues) => Promise<void> = resolved,
  errorMessage: string | null = null,
) {
  const submit = cy.stub().callsFake(onSubmit).as('submit');
  cy.mount(<LoginForm onSubmit={submit} errorMessage={errorMessage} />);
}

/** Finds an input through its visible label, which also proves the label is tied to the input. */
function field(label: string) {
  return cy
    .contains('label', label)
    .invoke('attr', 'for')
    .then((inputId) => cy.get('#' + String(inputId)));
}

const email = () => field('Email address');
const password = () => field('Password');
const submitButton = () => cy.contains('button', 'Sign in');

describe('LoginForm', () => {
  it('labels both fields and offers the right autofill hints', () => {
    mountForm();
    email().should('have.attr', 'type', 'email').and('have.attr', 'autocomplete', 'username');
    password()
      .should('have.attr', 'type', 'password')
      .and('have.attr', 'autocomplete', 'current-password');
    cy.get('form').should('have.attr', 'aria-label', 'Sign in');
  });

  it('shows a message under each empty field and does not submit', () => {
    mountForm();
    submitButton().click();

    cy.contains('Enter your email address.').should('be.visible');
    cy.contains('Enter your password.').should('be.visible');
    email().should('have.attr', 'aria-invalid', 'true');
    password().should('have.attr', 'aria-invalid', 'true');
    cy.get('@submit').should('not.have.been.called');
  });

  it('ties the validation message to its field for screen readers', () => {
    mountForm();
    email().type('not-an-email');
    submitButton().click();

    cy.contains('Enter a valid email address.')
      .invoke('attr', 'id')
      .then((messageId) => {
        email().should('have.attr', 'aria-describedby', messageId);
      });
  });

  it('clears a field error once the value is corrected', () => {
    mountForm();
    email().type('not-an-email');
    password().type('Str0ngPass');
    submitButton().click();
    cy.contains('Enter a valid email address.').should('be.visible');

    email().clear().type('asha@example.com');
    cy.contains('Enter a valid email address.').should('not.exist');
    email().should('have.attr', 'aria-invalid', 'false');
  });

  it('submits trimmed, lower-cased credentials exactly once', () => {
    mountForm();
    email().type('  Asha@Example.COM  ');
    password().type('Str0ngPass');
    submitButton().click();

    cy.get('@submit').should('have.been.calledOnce');
    cy.get('@submit').its('firstCall.args.0').should('deep.equal', {
      email: 'asha@example.com',
      password: 'Str0ngPass',
    });
  });

  it('submits when Enter is pressed in the password field', () => {
    mountForm();
    email().type('asha@example.com');
    password().type('Str0ngPass{enter}');
    cy.get('@submit').should('have.been.calledOnce');
  });

  it('disables the button and says so while signing in, then recovers', () => {
    let finish: () => void = () => undefined;
    mountForm(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    email().type('asha@example.com');
    password().type('Str0ngPass');
    submitButton().click();

    cy.contains('button', 'Signing in…')
      .should('be.disabled')
      .then(() => {
        finish();
      });
    submitButton().should('be.enabled');
    cy.get('@submit').should('have.been.calledOnce');
  });

  it('shows and hides the password, reporting the state to assistive technology', () => {
    mountForm();
    password().type('Str0ngPass');

    cy.get('button[aria-label="Show password"]')
      .should('have.attr', 'aria-pressed', 'false')
      .click();
    password().should('have.attr', 'type', 'text').and('have.value', 'Str0ngPass');

    cy.get('button[aria-label="Hide password"]')
      .should('have.attr', 'aria-pressed', 'true')
      .click();
    password().should('have.attr', 'type', 'password');
  });

  it('announces a sign-in error passed by the page', () => {
    mountForm(resolved, 'The email or password is incorrect.');
    cy.get('[role="alert"]').should('contain.text', 'The email or password is incorrect.');
  });

  it('shows no alert when there is no error', () => {
    mountForm();
    cy.get('[role="alert"]').should('not.exist');
  });

  it('moves focus through the fields in a logical order with the Tab key', () => {
    mountForm();
    email().focus().type('asha@example.com');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should('have.attr', 'autocomplete', 'current-password').type('Str0ngPass');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should('have.attr', 'aria-label', 'Show password');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should('have.attr', 'type', 'submit').and('contain.text', 'Sign in');
  });

  it('stays usable on a narrow phone screen', () => {
    cy.viewport(320, 568);
    mountForm();
    submitButton().should('be.visible');
    email().should('be.visible');
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
    });
  });
});
