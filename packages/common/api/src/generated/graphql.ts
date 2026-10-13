/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type ClientErrorInput = {
  appVersion?: string | null | undefined;
  componentStack?: string | null | undefined;
  location?: string | null | undefined;
  message: string;
  name: string;
  stack?: string | null | undefined;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  name: string;
  password: string;
};

export type TranslationsQueryVariables = Exact<{
  locale: string;
}>;


export type TranslationsQuery = { translations: Array<{ key: string, value: string }> };

export type ReportClientErrorMutationVariables = Exact<{
  input: ClientErrorInput;
}>;


export type ReportClientErrorMutation = { reportClientError: boolean };

export type AdminDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminDashboardQuery = { adminDashboard: { totalUsers: number } };

export type AuthUserFragment = { id: string, email: string, name: string, roles: Array<string> };

export type AuthSessionFragment = { accessToken: string, accessTokenExpiresAt: string, refreshToken: string | null, user: { id: string, email: string, name: string, roles: Array<string> } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { login: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string | null, user: { id: string, email: string, name: string, roles: Array<string> } } };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { register: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string | null, user: { id: string, email: string, name: string, roles: Array<string> } } };

export type RefreshSessionMutationVariables = Exact<{
  refreshToken?: string | null | undefined;
}>;


export type RefreshSessionMutation = { refreshSession: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string | null, user: { id: string, email: string, name: string, roles: Array<string> } } };

export type LogoutMutationVariables = Exact<{
  refreshToken?: string | null | undefined;
}>;


export type LogoutMutation = { logout: boolean };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const AuthUserFragmentDoc = new TypedDocumentString(`
    fragment AuthUser on User {
  id
  email
  name
  roles
}
    `, {"fragmentName":"AuthUser"}) as unknown as TypedDocumentString<AuthUserFragment, unknown>;
export const AuthSessionFragmentDoc = new TypedDocumentString(`
    fragment AuthSession on AuthPayload {
  accessToken
  accessTokenExpiresAt
  refreshToken
  user {
    ...AuthUser
  }
}
    fragment AuthUser on User {
  id
  email
  name
  roles
}`, {"fragmentName":"AuthSession"}) as unknown as TypedDocumentString<AuthSessionFragment, unknown>;
export const TranslationsDocument = new TypedDocumentString(`
    query Translations($locale: String!) {
  translations(locale: $locale) {
    key
    value
  }
}
    `) as unknown as TypedDocumentString<TranslationsQuery, TranslationsQueryVariables>;
export const ReportClientErrorDocument = new TypedDocumentString(`
    mutation ReportClientError($input: ClientErrorInput!) {
  reportClientError(input: $input)
}
    `) as unknown as TypedDocumentString<ReportClientErrorMutation, ReportClientErrorMutationVariables>;
export const AdminDashboardDocument = new TypedDocumentString(`
    query AdminDashboard {
  adminDashboard {
    totalUsers
  }
}
    `) as unknown as TypedDocumentString<AdminDashboardQuery, AdminDashboardQueryVariables>;
export const LoginDocument = new TypedDocumentString(`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    ...AuthSession
  }
}
    fragment AuthUser on User {
  id
  email
  name
  roles
}
fragment AuthSession on AuthPayload {
  accessToken
  accessTokenExpiresAt
  refreshToken
  user {
    ...AuthUser
  }
}`) as unknown as TypedDocumentString<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = new TypedDocumentString(`
    mutation Register($input: RegisterInput!) {
  register(input: $input) {
    ...AuthSession
  }
}
    fragment AuthUser on User {
  id
  email
  name
  roles
}
fragment AuthSession on AuthPayload {
  accessToken
  accessTokenExpiresAt
  refreshToken
  user {
    ...AuthUser
  }
}`) as unknown as TypedDocumentString<RegisterMutation, RegisterMutationVariables>;
export const RefreshSessionDocument = new TypedDocumentString(`
    mutation RefreshSession($refreshToken: String) {
  refreshSession(refreshToken: $refreshToken) {
    ...AuthSession
  }
}
    fragment AuthUser on User {
  id
  email
  name
  roles
}
fragment AuthSession on AuthPayload {
  accessToken
  accessTokenExpiresAt
  refreshToken
  user {
    ...AuthUser
  }
}`) as unknown as TypedDocumentString<RefreshSessionMutation, RefreshSessionMutationVariables>;
export const LogoutDocument = new TypedDocumentString(`
    mutation Logout($refreshToken: String) {
  logout(refreshToken: $refreshToken)
}
    `) as unknown as TypedDocumentString<LogoutMutation, LogoutMutationVariables>;