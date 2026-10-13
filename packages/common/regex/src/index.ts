/**
 * Every regular expression used by the apps lives here. Patterns are written so
 * that adjacent parts cannot match the same character, which keeps matching
 * linear-time on hostile input.
 */

/** A full email address: local part, "@", then dot-separated domain labels. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** A person's name: starts with a letter; letters, marks, spaces, apostrophes, dots, hyphens after. */
export const PERSON_NAME_REGEX = /^\p{L}[\p{L}\p{M}' .-]*$/u;

export const UPPERCASE_LETTER_REGEX = /[A-Z]/;
export const LOWERCASE_LETTER_REGEX = /[a-z]/;
export const DIGIT_REGEX = /\d/;

/** A locale tag such as `en`, `hi` or `en-IN`. */
export const LOCALE_REGEX = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

/** The scheme part of a URL (without the colon) for plain or secure HTTP. */
export const HTTP_PROTOCOL_REGEX = /^https?$/;

/** `{name}` placeholders inside localized strings. */
export const MESSAGE_PLACEHOLDER_REGEX = /\{(\w+)\}/g;

/** Email addresses embedded in free text, for redacting logs. */
export const EMBEDDED_EMAIL_REGEX = /[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63})+/g;

/** JSON Web Tokens embedded in free text, for redacting logs. */
export const EMBEDDED_JWT_REGEX = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

/** `Bearer <token>` credentials embedded in free text, for redacting logs. */
export const EMBEDDED_BEARER_REGEX = /Bearer [\w.~+/-]+=*/gi;
