# Exyconn App Boilerplate

A reusable starting point for new products: an API server, an admin portal and a mobile app that share one authentication system, one design-token set and one set of common packages.

## What is in the repository

| Path                 | What it is                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `server/`            | Node.js + Express + GraphQL API on MongoDB. Authentication lives here.                   |
| `portals/admin/`     | Admin portal (React, MUI, Vite). Sign-in and a dashboard.                                |
| `app/mobile-app/`    | Mobile app (Expo, React Native, Tamagui). Sign-in and a home screen.                     |
| `packages/common/*`  | Shared `@common/*` packages. See [packages/common/README.md](packages/common/README.md). |
| `.github/workflows/` | CI (tests, coverage, browser tests, Docker) and the Android APK build.                   |
| `docker-compose.yml` | The API server and MongoDB for a staging or production host.                             |

## Requirements

- Node.js 24 and pnpm 12 (`npm install --global pnpm`)
- Docker, to run MongoDB and the server the way they are deployed. Without Docker, use the in-memory database described below.

## Run it locally

```bash
pnpm install
```

### 1. API server

Copy `server/.env.example` to `server/.env` and fill in at least `JWT_ACCESS_SECRET` and the three `SEED_ADMIN_*` values. The seed admin is the account you sign in to the portal with; it is created once, at startup.

```bash
# With a MongoDB at MONGODB_URI
pnpm dev:server

# Without MongoDB or Docker: uses a throwaway in-memory database
pnpm dev:server:memory
```

The API is at `http://localhost:4000/graphql` and the health check at `http://localhost:4000/health`.

### 2. Admin portal

Copy `portals/admin/.env.example` to `portals/admin/.env`, then:

```bash
pnpm dev:admin
```

Open `http://localhost:5173` and sign in with the seed admin.

### 3. Mobile app

Set `EXPO_PUBLIC_API_URL` to the GraphQL URL as the phone or emulator reaches it (the Android emulator reaches your machine at `http://10.0.2.2:4000/graphql`), then:

```bash
pnpm dev:mobile
```

## Checks

| Command                     | What it does                                                   |
| --------------------------- | -------------------------------------------------------------- |
| `pnpm lint`                 | ESLint, including SonarJS rules and accessibility rules        |
| `pnpm format:check`         | Prettier                                                       |
| `pnpm typecheck`            | TypeScript in every workspace                                  |
| `pnpm test`                 | Server, package and portal tests (Vitest)                      |
| `pnpm test:unit:coverage`   | The same, with coverage                                        |
| `pnpm test:mobile:coverage` | Mobile app tests (Jest), with coverage                         |
| `pnpm coverage:check`       | Merges both reports and fails below 85% line coverage          |
| `pnpm test:component`       | Cypress component tests of the forms, in a real browser        |
| `pnpm test:e2e`             | Cypress end-to-end sign-in against a running server and portal |
| `pnpm codegen`              | Regenerates GraphQL types after a schema or operation change   |

`pnpm test:e2e` needs the server and the portal running, and `CYPRESS_ADMIN_EMAIL` and `CYPRESS_ADMIN_PASSWORD` set to the seed admin.

## How authentication works

- **Sign-in** returns a short-lived access token (15 minutes by default) and a refresh token (30 days).
- **Web** keeps the access token in memory only. The refresh token is an `httpOnly` cookie that page scripts cannot read.
- **Native** keeps the refresh token in the device's secure storage.
- **Refresh tokens rotate**: each one can be redeemed once, and only its hash is stored in the database.
- **Passwords** are hashed with scrypt.
- **Roles** are read from the database on every request, so disabling a user or removing a role takes effect immediately.
- **Rate limits** apply to every request, with a stricter limit on sign-in, registration and token refresh.

Not built yet: OTP sign-in, Google and Apple sign-in, password reset. These need provider credentials (MSG91, SMTP, Google, Apple).

## Branches and CI

There are two branches. Work is pushed to `staging`; a pull request from `staging` to `main` is the release. Every push runs:

- **CI**: generated-code check, formatting, lint, types, all tests, the 85% coverage gate, builds, Cypress component and end-to-end tests, and a Docker Compose smoke test.
- **Android APK**: builds a release APK and uploads it as the `app-release-apk` artifact of the workflow run.

### Repository settings the workflows read

| Kind     | Name                  | Purpose                                                                         |
| -------- | --------------------- | ------------------------------------------------------------------------------- |
| Variable | `EXPO_PUBLIC_API_URL` | GraphQL URL baked into the APK. Without it the app shows a configuration error. |
| Secret   | `SONAR_TOKEN`         | Enables the SonarQube scan and quality gate.                                    |
| Secret   | `SONAR_HOST_URL`      | URL of the SonarQube server.                                                    |

The APK is signed with the debug key, which is fine for testing but not for the Play Store. A store release needs an upload keystore, and an iOS build needs an Apple Developer account and signing certificates.

## Deploy the server

On a host with Docker:

```bash
cp .env.example .env   # then fill it in
docker compose up -d --build
```

MongoDB is reachable only from the server container, and its data is kept in the `mongo-data` volume. Put a reverse proxy with HTTPS in front of the server: with `NODE_ENV` set to `staging` or `production`, the refresh cookie is marked `Secure` and browsers only send it over HTTPS.

Rate-limit counters are held in memory, which is correct for one server instance. Running several instances needs a shared store.
