export { createGraphqlClient } from './client';
export type { GraphqlClient, GraphqlClientOptions } from './client';
export { fetchTranslations, sendClientErrorReport } from './requests';
export {
  AdminDashboardDocument,
  LoginDocument,
  LogoutDocument,
  RefreshSessionDocument,
  RegisterDocument,
  ReportClientErrorDocument,
  TranslationsDocument,
} from './generated/graphql';
export type {
  AdminDashboardQuery,
  AuthSessionFragment,
  AuthUserFragment,
  ClientErrorInput,
  LoginInput,
  RegisterInput,
} from './generated/graphql';
