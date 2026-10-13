/** Paths the shell itself owns. Portals add their own pages around these. */
export const SHELL_ROUTES = {
  home: '/',
  login: '/login',
} as const;

/** `id` of the main content region, the target of the "skip to content" link. */
export const MAIN_CONTENT_ID = 'main-content';

interface RedirectState {
  from?: unknown;
}

/**
 * Where to send the user after signing in. Only same-site paths are accepted,
 * so a crafted link cannot bounce a freshly signed-in user to another site.
 */
export function resolveRedirect(state: unknown): string {
  const from = typeof state === 'object' && state !== null ? (state as RedirectState).from : null;
  const isLocalPath =
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !from.includes('\\') &&
    from !== SHELL_ROUTES.login;
  return isLocalPath ? from : SHELL_ROUTES.home;
}
