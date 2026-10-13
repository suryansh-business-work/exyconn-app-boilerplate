export const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    email: String!
    name: String!
    roles: [String!]!
  }

  type AuthPayload {
    accessToken: String!
    "ISO 8601 time at which the access token stops working."
    accessTokenExpiresAt: String!
    "Only returned to native clients. Web clients receive it as an httpOnly cookie."
    refreshToken: String
    user: User!
  }

  type Translation {
    key: String!
    value: String!
  }

  type AdminDashboard {
    totalUsers: Int!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ClientErrorInput {
    name: String!
    message: String!
    stack: String
    componentStack: String
    location: String
    appVersion: String
  }

  type Query {
    "The signed-in user, or null when the request carries no valid access token."
    me: User
    "Server-managed translations for a locale. Clients fall back to their bundled copy for missing keys."
    translations(locale: String!): [Translation!]!
    "Requires the admin role."
    adminDashboard: AdminDashboard!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    "Exchanges a refresh token (argument for native, cookie for web) for a new session."
    refreshSession(refreshToken: String): AuthPayload!
    logout(refreshToken: String): Boolean!
    "Records an error caught by a client error boundary."
    reportClientError(input: ClientErrorInput!): Boolean!
  }
`;
