# Boilerplate — Project Instructions

Reusable boilerplate. Given a reference app, it produces a working product (Android, iOS, mWeb), its backend and portals, a website, and the marketing assets to launch it.

## Critical Rules

1. **Resource Safety:** Before writing or executing any code, check CPU temperature, CPU utilization, RAM usage, and storage usage. If any reaches a level that could hang, crash, or shut down the system, pause all workflows, wait until levels are safe, then resume automatically from where the work paused. The user must never have to type "continue". Run heavy jobs (video renders, native builds, full test suites) one at a time, never in parallel.

2. **Branches & PRs:** Only two branches exist: `staging` and `main`. Never create any other branch. Commit and push all work to `staging`. After every push, open a PR from `staging` → `main` (or update the existing one) and monitor it until every CI/CD check, GitHub Action, test, build, lint, and security check is green. If a check fails, find the root cause, fix it, push to `staging` again, and recheck. Repeat until everything is green; work is not complete while any required check is failing or pending. Never push directly to `main`, and never merge the PR or deploy to production without explicit user approval.

3. **Error Boundaries:** In mWeb, Portals, and React Native, every page/screen must be wrapped in the shared `@common/error-boundary` with Retry and Report an Issue options. Log errors with useful debugging detail and no sensitive user data. One page failing must never crash the whole application.

4. **SonarQube:** The Quality Gate must always pass: zero Blocker, High, Medium, or Low actionable issues across Security, Reliability, and Maintainability, cognitive complexity ≤ 15, and coverage above 85%. Fix issues, push, and recheck until green. Never bypass, suppress, or disable a valid rule to pass the gate. If analysis needs a token, ask for it instead of skipping the check.

5. **Tests:** Never write false-positive, dummy, or coverage-only tests in Unit, Integration, or E2E suites. Every test must assert real expected behavior, covering success, failure, validation, boundary, and relevant edge cases. Tests must be deterministic. Testing is complete only when all required tests and coverage checks pass.

6. **Clean-Room Reverse Engineering:** Recreate a reference app's features, flows, and behavior from its public surface only (store listing, screenshots, public website, using the app). Never decompile it, and never copy its code, assets, logo, name, copy text, or trademarks. Every product gets its own brand kit.

## Product Pipeline

**Input:** reference app name or store URL, plus the new product's name, target market, and languages. Ask for anything missing before starting.

Each stage must be verified before the next starts. Stages marked **(approval)** stop for user sign-off.

| # | Stage | Output | Verification |
|---|---|---|---|
| 1 | Analysis **(approval)** | PRD, feature matrix, screen inventory, user flows, data model, API contract | Every reference feature is mapped as in scope, later, or out |
| 2 | Brand kit **(approval)** | Name, logo, colors, typography, app icon, splash, written into `@common/design-tokens` | Tokens build; contrast meets WCAG 2.2 AA |
| 3 | Backend & portals | GraphQL server, microservices, portals, seed data, Docker compose, Terraform | Tests, Sonar, and CI green |
| 4 | Apps | mWeb and React Native app | Tests, Sonar, and CI green; every screen has an error boundary |
| 5 | Builds | APK (testing), AAB (Play Store), IPA (App Store), mWeb build | Artifacts produced by GitHub Actions and install on a device |
| 6 | Website | Astro site: landing, privacy policy, terms, delete-account page | SEO checks pass; pages are crawlable |
| 7 | Store listing | Title, descriptions, keywords, screenshots, feature graphic, data-safety answers | Meets current Play Store and App Store size and content requirements |
| 8 | Marketing **(approval)** | 20 promotional reels, 50 marketing banners, 30-day content calendar, ad copy variants | Every asset renders, uses brand tokens, and shows the real app |
| 9 | Communications | Email, WhatsApp, SMS, and push templates in the Communications Portal | Templates send in staging |
| 10 | Handover | README, runbook, env template, architecture doc, credentials checklist | A fresh clone runs by following the README |

### Builds
- All native builds run in GitHub Actions; iOS builds on a GitHub macOS runner.
- Signing keys, keystores, certificates, and provisioning profiles live only in GitHub secrets.
- Submitting to Google Play or App Store Connect needs explicit user approval.

### Reels
- Built with Remotion. Format 9:16, 1080×1920, 30 fps, 15–30 seconds.
- Marketing style: hook → problem → real app screens in motion → benefit → call to action.
- Every reel combines app screens captured from the built app, motion graphics, voiceover, burned-in captions, and background music.
- Voiceover and captions are generated in each target language; captions must match the voiceover.
- Use only licensed or royalty-free music and stock footage (Pexels); record the source of each.
- Each reel ships with a caption, hashtags, and a cover image.

### Banners
- Built as Remotion stills from the same templates and brand tokens as the reels.
- The 50 banners cover store feature graphics, social posts and stories (Instagram, Facebook, Threads, X, LinkedIn), and ad sizes. Check current platform size requirements before rendering.

## Tech Stack

| Area | Stack |
|---|---|
| Backend | Node.js, Express, GraphQL |
| mWeb & Portals | React, MUI, React Hook Form + Zod |
| Native apps | React Native, Tamagui, React Hook Form + Zod |
| Website | Astro |
| Reels & banners | Remotion |
| API layer | GraphQL + GraphQL Code Generator |
| Quality | SonarQube |
| Observability | SigNoz |
| Infrastructure | Docker, Terraform |
| CI/CD & builds | GitHub Actions |

**Not yet decided — ask before assuming:** database and ORM, monorepo tool and package manager, hosting provider, voiceover (TTS) provider.

## Code Rules

### Approach
1. **Think Before Coding:** State assumptions, surface ambiguity and tradeoffs, ask when unclear, and suggest simpler approaches when appropriate.
2. **Search First, Code Second:** Inspect the entire relevant codebase before writing new code.
3. **Reuse First:** Reuse existing functions, utilities, hooks, components, services, helpers, types, modules, and common packages. Check `@common/*` documentation and exports before creating any helper, hook, constant, schema, regex, or component.
4. **Extend Before Creating:** Extend existing implementations before creating new files, abstractions, or parallel solutions.
5. **Avoid Duplication:** Never duplicate business logic; anything used in more than two places belongs in the appropriate `@common/*` package.
6. **Avoid Premature Abstraction:** Create abstractions only for clear, repeated, or genuinely shared responsibilities.
7. **Simplicity First:** Write the minimum code required; avoid speculative features, unnecessary configurability, and overengineering.
8. **Surgical Changes:** Change only what is necessary, preserve existing style and behavior, and avoid unrelated refactoring. Every changed line must directly support the requested task.
9. **Deep Analysis:** Understand the complete related business and data flow before implementing, and prevent regressions.
10. **Goal-Driven Execution:** Define clear success criteria and verify each step. For multi-step tasks use a brief plan: Step → Verification.
11. **Edge Cases:** Consider null/undefined, empty, duplicate, timeout, retry, pagination, timezone, permission, network-failure, and stale-data scenarios.
12. **Commit Discipline:** Keep unrelated tasks in separate commits with clear, task-specific messages.

### Code Quality
13. **File Size:** No `.tsx` file may exceed 200 lines; split growing logic into smaller reusable modules/components.
14. **Separation of Concerns:** Keep components, functions, and modules small, focused, and single-purpose.
15. **TypeScript:** Use strict, accurate types; avoid `any`, unnecessary assertions, redundant casts, and non-null assertions.
16. **Dynamic Data:** Never hardcode business or static data; use APIs, configs, environment variables, or dynamic sources.
17. **Async/API Practices:** Use `async/await`, environment-based configuration, and consistent project structure.
18. **Dependencies:** Before adding a dependency, verify that an existing package cannot solve the requirement.
19. **Performance:** Avoid unnecessary renders, API calls, expensive computations, and bundle growth.

### UI
20. **Design System:** Never hardcode colors, shadows, spacing, borders, typography, or radius; always use tokens from `@common/design-tokens`.
21. **Forms:** Use React Hook Form + Zod for all forms. mWeb/Portal forms follow the `.form.tsx`, `.form.cy.tsx`, `.types.tsx`, `index.tsx` structure.
22. **Regex:** Never hardcode regex in application code. Add and test new patterns in `@common/regex` first, then use them across mWeb, Portals, and Native.
23. **Accessibility:** Follow WCAG 2.2 AA: keyboard navigation, visible focus, screen-reader support, accessible forms, dialogs, tables, errors, and dynamic content.
24. **Icons:** Use `@mui/icons-material` for mWeb/Portals and `@expo/vector-icons` for Native; never use Unicode icons. Keep fallback icon manifests and local assets in sync with the fallback-icon system.
25. **Date & Time:** Use MUI X pickers with `date-fns` and admin-configured timezone/format settings; never hardcode date/time formats.
26. **Localization:** Never hardcode user-facing text. Use server-provided localization first and the local fallback bundle only when the server translation is unavailable. When adding or changing entries, follow the bundle, server seed, shipped-key generation, and copy-revision workflow.
27. **Alerts & Dialogs:** Never use browser `alert`, `confirm`, or `prompt`; use MUI-based UI for mWeb/Portals and Tamagui-based UI for Native.
28. **Tables:** Use `@common/datatable` for all Portal tables.
29. **Tabs:** Never render MUI `<Tabs>`/`<Tab>` directly; use `@common/tabs` with URL-based selection.
30. **UI States:** Handle loading, success, error, empty, disabled, and populated states.
31. **Responsive UI:** Verify mWeb and Portal experiences across relevant viewport sizes.
32. **mWeb & Native Parity:** Keep business logic identical and shared through framework-free common packages; keep MUI and Tamagui UI separate.
33. **SEO:** For Astro/website changes, verify semantic HTML, metadata, canonical URLs, structured data, and crawlability.

### API & Data
34. **GraphQL:** Use GraphQL + GraphQL Code Generator for all API interactions and use generated types. Reuse existing queries, mutations, and fragments; request only required fields; avoid duplicate requests and N+1 queries; use pagination and filtering; verify resolver and database performance.
35. **API Contracts:** When changing frontend or backend behavior, verify the schema, generated types, validation, and all affected consumers together.
36. **Backward Compatibility:** Do not unnecessarily break APIs, GraphQL contracts, database schemas, imports, exports, or user flows.
37. **Caching:** Understand existing caching and invalidation behavior before introducing or modifying caching.
38. **Database Safety:** Review query performance, indexes, migrations, destructive operations, data integrity, and rollback strategy before database changes.
39. **Data Integrity:** Protect financial, transactional, payment, order, and other critical data from partial, duplicate, or inconsistent writes.
40. **Concurrency:** Consider race conditions, duplicate requests, retries, parallel updates, and stale data.
41. **Idempotency:** Make payments, webhooks, notifications, migrations, and retryable operations idempotent.

### Security & Operations
42. **Security:** Never hardcode secrets, credentials, passwords, tokens, or IP addresses.
43. **Authorization:** Enforce permissions server-side; never rely only on hiding UI elements.
44. **Error Handling:** Handle API and validation errors with meaningful user-facing messages and developer diagnostics. Never swallow errors silently.
45. **Observability:** Use structured logging and monitoring; never expose secrets or sensitive user data in logs.
46. **Auditability:** Use existing audit and logging mechanisms for Finance, Payments, Admin overrides, permissions, and other sensitive operations.
47. **Environment Separation:** Never mix local, staging, and production configuration, credentials, or data.
48. **Rollback Awareness:** For production-impacting changes, understand the recovery and rollback path before implementation.
49. **Infrastructure:** Keep server infrastructure changes reproducible through Terraform and follow existing migration/runbook conventions.
50. **Versioning:** Keep a single app version across `app/mobile-app/app.json`, `app/mobile-app/package.json`, and `app/mweb/package.json`, following the version-bump/deployment flow.
51. **Documentation:** Whenever a shared `@common/*` package changes, update its documentation and runnable demo.
### Module-Specific Rules (apply when the product has the module)
52. **Critical Modules:** Apply extra scrutiny to Finance, Payments, Orders, Attendance, Authentication, Localization, and Admin functionality, including authorization, concurrency, idempotency, auditability, and data integrity.
53. **Finance:** Research deeply before changing anything: financial flows, business rules, calculations, data integrity, edge cases, dependencies, security, auditability, and backward compatibility.
54. **Attendance:** Use the existing attendance board, attendance service, OTP service, and attendance rules; never create parallel attendance or OTP flows.
55. **Email Templates:** Never create local MJML files; maintain email templates through the Communications Portal.
56. **WhatsApp:** Create and manage WhatsApp templates and campaigns only through the Communications Portal.
57. Use PNPM

## Common Packages

| Package | Purpose |
|---|---|
| `@common/shell` | Portal login, header, sidebar (microfrontend shell) |
| `@common/error-boundary` | Page/screen error boundary with Retry and Report an Issue |
| `@common/design-tokens` | Colors, spacing, typography, radius, shadows |
| `@common/regex` | All validation regex patterns |
| `@common/validators` | Shared Zod schemas and validators |
| `@common/error-handling` | Error parsing, user messages, logging helpers |
| `@common/types` | Shared types |
| `@common/datatable` | Server-side pagination, debounced search, filter, sorting |
| `@common/list` | List component |
| `@common/tabs` | Tabs with URL-based selection |

## Microservices
1. **Authentication:** Email/phone + password, email/phone + OTP, OAuth (Google, Apple)
2. **Logger**
3. **Communication:** Email (SMTP), SMS (MSG91), WhatsApp (AiSensy), Slack, Twilio, Vobiz
4. **Upload:** ImageKit

## Third-Party Integrations
Pexels, Google Maps, OpenAI, Gemini, Sarvam AI, Razorpay, Shiprocket, GitHub (app builds), Google Play (store release), App Store Connect, Google Drive, Cloudflare, GoDaddy, social platforms (Facebook, Instagram, Threads, X).

## Portals
- **Admin:** User Dashboard, User Management, Roles Management
- **Tech:** Environment Variables, Maintenance & Development, Feature Flags, SSL, Status
- **Others:** Finance, Support, CRM, Marketing, Legal, Website, AI, Communications, Logs, Analytics, Localization

## Below Key I will add in Actions Env Variables
SSH_KEY
SSH_USER
SSH_HOST
SSH_PORT
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN

## Use Certbot to manage SSL certificates. On every push, check the SSL certificate's validity and automatically renew it if fewer than 10 days remain before expiration. Also, configure scheduled automatic renewal as a fallback.