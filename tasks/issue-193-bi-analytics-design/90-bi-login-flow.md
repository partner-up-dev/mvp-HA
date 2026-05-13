# `/bi?code=...` Login Flow

## Design Goal

Provide a lightweight route for analytics viewers to enter `/admin/analytics` through a short code.

## Route

```text
/bi?code=...
```

## Confirmed Flow

1. User opens `/bi?code=...`.
2. The `/bi` page reads `code` from query.
3. The page calls `POST /api/auth/admin/login`.
4. Request body uses:

```json
{
  "userId": "<hard-coded analytics seed user id>",
  "password": "<code>"
}
```

5. On successful login:
   - frontend stores the returned token and `roles` in the existing admin session storage shape
   - frontend redirects to `/admin/analytics`
   - code is scrubbed by leaving `/bi?code=...`
6. On failed login:
   - frontend stays on `/bi`
   - page shows a simple error explanation
   - page shows a button back to home

## Frontend Notes

- Analytics seed user id is hard-coded in the `/bi` page implementation.
- The page should use existing admin login mutation/client path if practical.
- The page uses a compact login status UI.
- The page should avoid rendering the raw code in visible UI.

## Backend Notes

- `POST /api/auth/admin/login` should accept users whose role array includes `service` or `analytics`.
- Login response should include `roles`.
- Route authorization still decides actual access:
  - `/admin/analytics` requires `analytics`
  - service-owned admin routes require `service`

## Failure UI

Minimum UI:

- concise error text
- home button

Potential error labels:

- missing code
- invalid code
- login service unavailable
