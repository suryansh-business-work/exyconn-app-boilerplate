/** Locale of the bundled fallback text below. */
export const DEFAULT_LOCALE = 'en';

/**
 * Fallback text shipped with every client. It is also what the server seeds its
 * translation store from, so the server copy can be edited without a release.
 */
export const fallbackMessages = {
  'app.name': 'Exyconn Boilerplate',

  'common.loading': 'Loading…',
  'common.retry': 'Try again',

  'auth.login.title': 'Sign in',
  'auth.login.subtitle': 'Use your account to continue.',
  'auth.login.email': 'Email address',
  'auth.login.password': 'Password',
  'auth.login.showPassword': 'Show password',
  'auth.login.hidePassword': 'Hide password',
  'auth.login.submit': 'Sign in',
  'auth.login.submitting': 'Signing in…',
  'auth.logout': 'Sign out',
  'auth.session.checking': 'Checking your session…',
  'auth.forbidden.title': 'You do not have access',
  'auth.forbidden.body': 'Your account is not allowed to use this portal.',

  'validation.emailRequired': 'Enter your email address.',
  'validation.emailInvalid': 'Enter a valid email address.',
  'validation.passwordRequired': 'Enter your password.',
  'validation.passwordTooShort': 'Use at least 8 characters.',
  'validation.passwordTooLong': 'Use 128 characters or fewer.',
  'validation.passwordNeedsUppercase': 'Add at least one uppercase letter.',
  'validation.passwordNeedsLowercase': 'Add at least one lowercase letter.',
  'validation.passwordNeedsDigit': 'Add at least one number.',
  'validation.nameRequired': 'Enter your name.',
  'validation.nameTooLong': 'Use 100 characters or fewer.',
  'validation.nameInvalid': 'Use letters, spaces, apostrophes, dots and hyphens only.',
  'validation.localeInvalid': 'This language is not supported.',

  'errors.BAD_USER_INPUT': 'Some details are not valid. Check them and try again.',
  'errors.INVALID_CREDENTIALS': 'The email or password is incorrect.',
  'errors.EMAIL_TAKEN': 'An account with this email already exists.',
  'errors.UNAUTHENTICATED': 'Your session has ended. Sign in again.',
  'errors.FORBIDDEN': 'You are not allowed to do that.',
  'errors.RATE_LIMITED': 'Too many attempts. Wait a few minutes and try again.',
  'errors.NETWORK_ERROR': 'Could not reach the server. Check your connection and try again.',
  'errors.INTERNAL_SERVER_ERROR': 'Something went wrong on our side. Try again shortly.',

  'errorBoundary.title': 'This page ran into a problem',
  'errorBoundary.body':
    'The rest of the app is still working. You can try again or report the issue.',
  'errorBoundary.retry': 'Try again',
  'errorBoundary.report': 'Report an issue',
  'errorBoundary.reporting': 'Sending report…',
  'errorBoundary.reported': 'Thanks. The issue has been reported.',
  'errorBoundary.reportFailed': 'The report could not be sent. Try again.',

  'shell.skipToContent': 'Skip to main content',
  'shell.openNavigation': 'Open navigation',
  'shell.navigation': 'Main navigation',
  'shell.signedInAs': 'Signed in as {name}',

  'nav.dashboard': 'Dashboard',

  'dashboard.title': 'Dashboard',
  'dashboard.welcome': 'Welcome back, {name}',
  'dashboard.totalUsers': 'Total users',
  'dashboard.loadFailed': 'The dashboard could not be loaded.',

  'home.title': 'Home',
  'home.welcome': 'Welcome, {name}',
  'home.signedInAs': 'Signed in as {email}',
} as const;

export type MessageKey = keyof typeof fallbackMessages;
