# Common packages

Shared code for the server, the portals and the mobile app. Check here before writing a helper, hook, schema, regex or component: if it exists, reuse it; if it is needed in more than two places, add it here.

Every package ships TypeScript source and is consumed directly by the workspace that imports it.

| Package                  | Use it for                                                        | Runs on             |
| ------------------------ | ----------------------------------------------------------------- | ------------------- |
| `@common/types`          | Contract constants: roles, client platforms, the platform header  | Server, web, native |
| `@common/regex`          | Every regular expression. Never write one in application code.    | Server, web, native |
| `@common/validators`     | Zod schemas for forms and server input                            | Server, web, native |
| `@common/error-handling` | Error codes, `AppError`, user-message keys, log redaction         | Server, web, native |
| `@common/localization`   | Fallback text bundle, translate function, React provider          | Server, web, native |
| `@common/design-tokens`  | Colors, spacing, radius, typography, sizes                        | Web, native         |
| `@common/api`            | Typed GraphQL operations and the fetch-based client               | Web, native         |
| `@common/auth`           | Session manager, `AuthProvider`, `useAuth`, `useLoginSubmit`      | Web, native         |
| `@common/error-boundary` | Page and screen error boundaries with Retry and Report an issue   | Web, native         |
| `@common/shell`          | Portal frame: providers, login page, header, sidebar, route guard | Web                 |

## Examples

### Validate a form

Validation messages are localization keys. Translate them when you show them.

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginValues } from '@common/validators';

const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
```

### Show text

The server's translation wins. The bundled fallback in `@common/localization` is used only for keys the server does not have. To add text, add the key to `src/fallback/en.ts`; the server seeds it into its translation store at the next start.

```tsx
import { useTranslate } from '@common/localization/react';

const translate = useTranslate();
translate('dashboard.welcome', { name: user.name });
```

### Call the API

Add the operation to `packages/common/api/src/operations/*.graphql`, run `pnpm codegen`, and export the generated document from `src/index.ts`.

```tsx
import { useQuery } from '@tanstack/react-query';
import { AdminDashboardDocument } from '@common/api';
import { useApiClient } from '@common/auth/react';

const client = useApiClient();
const query = useQuery({
  queryKey: ['adminDashboard'],
  queryFn: () => client.execute(AdminDashboardDocument),
});
```

Every failure is an `AppError`. Turn it into a message with `translate(toMessageKey(error))`.

### Read the signed-in user

```tsx
import { useAuth } from '@common/auth/react';

const { status, user, logout } = useAuth();
```

### Wrap a page or screen in an error boundary

Pages rendered inside `AppShell` are already wrapped. Wrap anything else yourself.

```tsx
// Web
import { PageErrorBoundary } from '@common/error-boundary/web';

// Native
import { ScreenErrorBoundary } from '@common/error-boundary/native';
```

### Build a new portal

```tsx
import { AppShell, LoginPage, PortalProviders, RequireAuth, SHELL_ROUTES } from '@common/shell';
import { ROLES } from '@common/types';

<PortalProviders apiUrl={config.apiUrl} locale={locale}>
  <Routes>
    <Route path={SHELL_ROUTES.login} element={<LoginPage />} />
    <Route
      element={
        <RequireAuth requiredRole={ROLES.admin}>
          <AppShell navItems={navItems} />
        </RequireAuth>
      }
    >
      <Route index element={<DashboardPage />} />
    </Route>
  </Routes>
</PortalProviders>;
```

`portals/admin` is the working example of all of the above.

### Use a design token

```tsx
import { colors, spacing } from '@common/design-tokens';
```

In portals, prefer the MUI theme (`sx={{ p: 2, color: 'text.secondary' }}`), which `@common/shell` builds from the same tokens.
