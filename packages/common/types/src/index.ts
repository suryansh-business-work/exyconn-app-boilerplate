/** Contract values shared by the server and every client. */

export const ROLES = { admin: 'admin', user: 'user' } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const CLIENT_PLATFORMS = ['web', 'native'] as const;
export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

/** Request header a client uses to tell the server which platform it is. */
export const CLIENT_PLATFORM_HEADER = 'x-client-platform';
