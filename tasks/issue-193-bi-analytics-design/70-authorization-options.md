# Authorization Options

## Confirmed Direction

- Upgrade `users.role` from one text value to a text array.
- Treat user roles as a capability set.
- Seed admin user receives both `service` and `analytics`.
- Seed analytics user receives `analytics`.
- `/admin/analytics` accepts `analytics` role.
- Existing admin management routes accept `service` role.
- JWT carries `roles`.
- Frontend route meta uses `requiredRoles`.
- Backend uses generic `requireRoles(...)`.
- Frontend keeps admin session naming to align with the existing admin domain.
- `/bi` reuses `/api/auth/admin/login` with the analytics seed user id and code-as-password.
- `/bi` scrubs code after successful login and redirect.

## Role Set

Recommended role values:

- `anonymous`
- `authenticated`
- `service`
- `analytics`

Recommended user role examples:

```text
anonymous visitor: ["anonymous"]
authenticated user: ["authenticated"]
admin operator: ["service", "analytics"]
analytics viewer: ["analytics"]
```

## Option A: JWT Carries Roles Array

Shape:

```ts
{
  sub: userId,
  roles: ["service", "analytics"]
}
```

Pros:

- Frontend route guards can evaluate analytics access locally.
- Backend middleware can check roles directly from token claims.
- Token semantics align with `users.role text[]`.

Tradeoffs:

- Role changes take effect after token refresh or relogin.
- JWT helpers and session storage types need a coordinated update.

Recommended use:

- Good default for this codebase because current auth already relies on role claims.

## Option B: JWT Keeps Primary Role And Backend Loads Roles

Shape:

```ts
{
  sub: userId,
  role: "service"
}
```

Backend checks the database role array for protected routes.

Pros:

- Role changes take effect on the next request.
- Token payload changes stay smaller.

Tradeoffs:

- Every protected request needs a user lookup or cache.
- Frontend learns access through a backend session/access probe.

Recommended use:

- Useful later if role revocation speed becomes a product requirement.

## Option C: Dedicated Capability Table

Shape:

```text
users
user_capabilities
```

Pros:

- Fine-grained permission growth becomes easy.
- Auditing role assignment can become a first-class table.

Tradeoffs:

- Current need is small.
- More joins, migrations, seed code, and tests.

Recommended use:

- Better for a later operations-console expansion.

## Route Guard Options

### Option 1: Route Meta Uses Required Roles

Frontend route meta:

```ts
meta: {
  requiredRoles: ["analytics"]
}
```

Admin management routes use `["service"]`.

Pros:

- One guard pattern covers admin and analytics routes.
- Frontend routing stays declarative.

Tradeoffs:

- Existing `requiresAdminAuth` meta changes to a role-based shape.

### Option 2: Separate Admin And Analytics Guards

Frontend keeps `requiresAdminAuth` and adds `requiresAnalyticsAuth`.

Pros:

- Small local change around `/admin/analytics`.
- Existing admin route declarations stay familiar.

Tradeoffs:

- Two guard branches duplicate logic.
- Future roles add more route meta flags.

## Frontend Session Storage Options

### Option 1: Rename To Backoffice Session

Storage concept:

```text
backoffice_user_id
backoffice_access_token
backoffice_roles
```

Pros:

- One session store represents both `service` and `analytics`.
- `/admin/*` can remain the route family while role checks decide page access.
- Future operator-facing roles fit the same vocabulary.

Tradeoffs:

- Existing `admin-session-storage` and `admin-rpc` naming needs a coordinated rename.

### Option 2: Keep Admin Session Naming

Storage concept:

```text
admin_user_id
admin_access_token
admin_roles
```

Pros:

- Smaller frontend rename.
- Existing admin client code stays familiar.

Tradeoffs:

- `analytics` access is stored in variables named `admin`.
- The route family and storage vocabulary become less precise as roles grow.

## Backend Middleware Options

### Option 1: Generic `requireRoles(...)`

Example:

```ts
app.use("*", requireRoles(["analytics"]))
```

Pros:

- Same middleware family covers service and analytics routes.
- Easy to test with role arrays.

Tradeoffs:

- Existing admin middleware needs a compatibility wrapper or replacement.

### Option 2: Keep `adminAuthMiddleware` And Add `analyticsAuthMiddleware`

Pros:

- Minimal conceptual change for existing admin routes.
- Analytics route has a dedicated guard.

Tradeoffs:

- Authorization logic spreads across two middleware modules.

## `/bi?code=...` Login Options

### Option 1: Dedicated Analytics Login Endpoint

Route:

```text
POST /api/auth/analytics/login
```

Request:

```json
{ "code": "..." }
```

Backend uses the seeded analytics user id and verifies the code as that user's pin.

Pros:

- Frontend never hardcodes the analytics user id.
- Endpoint expresses the `/bi` use case directly.
- Response can return a token with `analytics` role.

Tradeoffs:

- Adds one auth endpoint.

### Option 2: Reuse Admin Login Endpoint With User Id

Route:

```text
POST /api/auth/admin/login
```

Request:

```json
{ "userId": "...analytics seed id...", "password": "..." }
```

Pros:

- Uses existing endpoint shape.

Tradeoffs:

- Frontend carries a seed user id or fetches it through config.
- Endpoint name suggests admin semantics while issuing analytics access.

## `/bi` Code Scrubbing Options

### Option 1: Scrub Before Network Request

Flow:

1. Read `code` from URL.
2. Store it in memory.
3. `router.replace("/bi")`.
4. Submit login request.
5. Redirect to `/admin/analytics`.

Pros:

- Browser history and page telemetry avoid raw code.
- Debug tools see a scrubbed route quickly.

Tradeoffs:

- In-memory code handling needs careful component flow.

### Option 2: Scrub After Successful Login

Flow:

1. Read `code`.
2. Submit login request.
3. Redirect to `/admin/analytics`.

Pros:

- Simpler component flow.

Tradeoffs:

- Raw code lives in history and route telemetry for longer.

## Decided Initial Combination

- `users.role text[]`
- JWT carries `roles`
- frontend route meta uses `requiredRoles`
- backend uses generic `requireRoles(...)`
- frontend keeps admin session naming
- `/bi` reuses `POST /api/auth/admin/login`
- `/bi` scrubs code after successful login and redirect

## Implementation Implications

- `POST /api/auth/admin/login` should accept a service user or analytics user when credentials match.
- The login response should return `roles`.
- Existing admin management route guards should require `service`.
- `/admin/analytics` route guard should require `analytics`.
- Existing admin seed user should be migrated to `["service", "analytics"]`.
- New analytics seed user should be seeded as `["analytics"]`.
- Admin session storage can keep its domain naming while storing `roles`.
