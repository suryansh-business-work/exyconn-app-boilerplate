/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query Translations($locale: String!) {\n  translations(locale: $locale) {\n    key\n    value\n  }\n}\n\nmutation ReportClientError($input: ClientErrorInput!) {\n  reportClientError(input: $input)\n}\n\nquery AdminDashboard {\n  adminDashboard {\n    totalUsers\n  }\n}": typeof types.TranslationsDocument,
    "fragment AuthUser on User {\n  id\n  email\n  name\n  roles\n}\n\nfragment AuthSession on AuthPayload {\n  accessToken\n  accessTokenExpiresAt\n  refreshToken\n  user {\n    ...AuthUser\n  }\n}\n\nmutation Login($input: LoginInput!) {\n  login(input: $input) {\n    ...AuthSession\n  }\n}\n\nmutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    ...AuthSession\n  }\n}\n\nmutation RefreshSession($refreshToken: String) {\n  refreshSession(refreshToken: $refreshToken) {\n    ...AuthSession\n  }\n}\n\nmutation Logout($refreshToken: String) {\n  logout(refreshToken: $refreshToken)\n}": typeof types.AuthUserFragmentDoc,
};
const documents: Documents = {
    "query Translations($locale: String!) {\n  translations(locale: $locale) {\n    key\n    value\n  }\n}\n\nmutation ReportClientError($input: ClientErrorInput!) {\n  reportClientError(input: $input)\n}\n\nquery AdminDashboard {\n  adminDashboard {\n    totalUsers\n  }\n}": types.TranslationsDocument,
    "fragment AuthUser on User {\n  id\n  email\n  name\n  roles\n}\n\nfragment AuthSession on AuthPayload {\n  accessToken\n  accessTokenExpiresAt\n  refreshToken\n  user {\n    ...AuthUser\n  }\n}\n\nmutation Login($input: LoginInput!) {\n  login(input: $input) {\n    ...AuthSession\n  }\n}\n\nmutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    ...AuthSession\n  }\n}\n\nmutation RefreshSession($refreshToken: String) {\n  refreshSession(refreshToken: $refreshToken) {\n    ...AuthSession\n  }\n}\n\nmutation Logout($refreshToken: String) {\n  logout(refreshToken: $refreshToken)\n}": types.AuthUserFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Translations($locale: String!) {\n  translations(locale: $locale) {\n    key\n    value\n  }\n}\n\nmutation ReportClientError($input: ClientErrorInput!) {\n  reportClientError(input: $input)\n}\n\nquery AdminDashboard {\n  adminDashboard {\n    totalUsers\n  }\n}"): typeof import('./graphql').TranslationsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment AuthUser on User {\n  id\n  email\n  name\n  roles\n}\n\nfragment AuthSession on AuthPayload {\n  accessToken\n  accessTokenExpiresAt\n  refreshToken\n  user {\n    ...AuthUser\n  }\n}\n\nmutation Login($input: LoginInput!) {\n  login(input: $input) {\n    ...AuthSession\n  }\n}\n\nmutation Register($input: RegisterInput!) {\n  register(input: $input) {\n    ...AuthSession\n  }\n}\n\nmutation RefreshSession($refreshToken: String) {\n  refreshSession(refreshToken: $refreshToken) {\n    ...AuthSession\n  }\n}\n\nmutation Logout($refreshToken: String) {\n  logout(refreshToken: $refreshToken)\n}"): typeof import('./graphql').AuthUserFragmentDoc;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
