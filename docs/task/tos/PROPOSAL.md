# Proposal: Terms of Service + Privacy Policy Consent Gate

## 1. Goal

Add Terms of Service (ToS) and Privacy Policy consent into the current auth flow with these product behaviors:

1. After local account is auto-created from **Community PR publish** or **Community PR join**, immediately ask user to agree ToS + Privacy.
2. If user disagrees, log out immediately.
3. Log out must still keep local `user_id` and `user_pin`.
4. Persist disagreement state (`DISAGREED`).
5. When user logs in again (manual or auto bootstrap), ask again on **`/me` page** until they agree.
6. Host final ToS + Privacy as static HTML under frontend `public/`.

## 2. Current Baseline

1. Session auto-restore exists via `POST /api/auth/session`.
2. Local account auto-creation already exists in:
   1. `POST /api/cpr/:id/publish`
   2. `POST /api/cpr/:id/join`
3. Frontend stores `user_id`, `user_pin`, `access_token`, `session_role` in localStorage.
4. No policy agreement model exists yet.

## 3. Proposed Design

### 3.1 Consent State Model

Introduce backend source-of-truth for policy agreement status.

Suggested table: `user_policy_consents`

1. `user_id` (PK, FK -> `users.id`)
2. `tos_version` (text, not null)
3. `privacy_version` (text, not null)
4. `status` (`PENDING | AGREED | DISAGREED`, not null)
5. `agreed_at` (timestamp, nullable)
6. `disagreed_at` (timestamp, nullable)
7. `updated_at` (timestamp, not null)

Version constants (backend env/config):

1. `LEGAL_TOS_VERSION` (e.g. `2026-03-18`)
2. `LEGAL_PRIVACY_VERSION` (e.g. `2026-03-18`)
3. `LEGAL_TOS_PATH` (e.g. `/legal/terms-of-service.html`)
4. `LEGAL_PRIVACY_PATH` (e.g. `/legal/privacy-policy.html`)

Agreement is valid only when:

1. `status = AGREED`
2. stored versions exactly match current legal versions

Otherwise `required = true`.

### 3.2 API Contract Changes

#### A. Extend auth-like payloads with policy snapshot

Extend these responses to include `policy`:

1. `POST /api/auth/session`
2. `POST /api/auth/register/local`
3. `POST /api/cpr/:id/publish` response `auth`
4. `POST /api/cpr/:id/join` response `auth`

Suggested shape:

```json
{
  "role": "authenticated",
  "userId": "uuid",
  "userPin": "1234",
  "accessToken": "token",
  "policy": {
    "status": "PENDING",
    "required": true,
    "tosVersion": "2026-03-18",
    "privacyVersion": "2026-03-18",
    "tosUrl": "/legal/terms-of-service.html",
    "privacyUrl": "/legal/privacy-policy.html"
  }
}
```

#### B. Add policy endpoints

1. `GET /api/policy/me`
   1. Auth required.
   2. Returns current policy state for logged-in user.
2. `POST /api/policy/me/decision`
   1. Auth required.
   2. Body: `{ "decision": "AGREE" | "DISAGREE" }`
   3. Server writes `user_policy_consents`.
   4. Returns latest `policy` snapshot.

### 3.3 Enforcement Rules

1. Policy prompt trigger points:
   1. Immediately after `publish` / `join` if response `policy.required = true`.
   2. After session bootstrap if `policy.required = true`.
2. `DISAGREE` action:
   1. Call `POST /api/policy/me/decision` with `DISAGREE`.
   2. Frontend performs **soft logout**:
      1. clear `access_token`
      2. set `session_role = anonymous`
      3. keep `user_id` and `user_pin`
      4. write local marker `partner_up_policy_status = DISAGREED`
3. Re-login / auto-login:
   1. `POST /api/auth/session` can still authenticate by local creds.
   2. If `policy.required = true`, frontend redirects to `/me` and displays blocking consent card.
4. Backend guard (recommended):
   1. For authenticated write actions, reject when policy not agreed with `403 POLICY_AGREEMENT_REQUIRED`.
   2. Exempt read-only endpoints + policy endpoints + `/me` profile read/update if needed for recovery UX.

## 4. Frontend UX Plan (`/me` as consent hub)

Add a new top card on `MePage` when `policy.required = true`:

1. Show short summary text.
2. Show two links:
   1. `/legal/terms-of-service.html`
   2. `/legal/privacy-policy.html`
3. Show actions:
   1. `Agree and Continue`
   2. `Disagree and Log Out`
4. If user disagrees, execute soft logout but do not clear `user_id`/`user_pin`.

After bootstrap:

1. If policy required and current route is not `/me`, redirect to `/me?policy=required`.
2. Keep route guard simple and centralized to avoid duplicated checks across pages.

## 5. Local Storage Changes

Current keys stay unchanged:

1. `partner_up_user_id`
2. `partner_up_user_pin`
3. `partner_up_access_token`
4. `partner_up_session_role`

Add:

1. `partner_up_policy_status` (`AGREED | DISAGREED | PENDING`)
2. `partner_up_policy_tos_version`
3. `partner_up_policy_privacy_version`

Add store method for soft logout:

1. `clearAuthOnlyKeepCredentials()`

Do not reuse full `clearSession()` for disagreement because full clear currently removes local credentials.

## 6. Static Legal Page Plan (`public/`)

Implement final static pages in frontend:

1. `apps/frontend/public/legal/terms-of-service.html`
2. `apps/frontend/public/legal/privacy-policy.html`

Version should be shown in each page header/footer and must match backend version constants.

## 7. Rollout Steps

1. Backend schema + migration (`user_policy_consents`).
2. Backend policy service + controller.
3. Extend auth/session and cpr publish/join payloads with `policy`.
4. Frontend session type/store update.
5. Frontend consent card on `/me`.
6. Frontend soft logout implementation.
7. Bootstrap redirect to `/me` when policy required.
8. Add static legal HTML pages.
9. Build verification for backend + frontend.

## 8. Acceptance Criteria

1. User auto-created by `publish` or `join` sees consent prompt immediately.
2. User choosing `DISAGREE` becomes anonymous immediately.
3. `user_id` + `user_pin` remain stored after disagreement logout.
4. Disagreement state is persisted and returned by backend on next login.
5. On next auto-login/bootstrap, user is guided to `/me` and asked to agree again.
6. On agree, user can continue normal authenticated actions without repeated prompt.
7. ToS/Privacy pages are reachable as static URLs under `public/legal`.
8. Frontend and backend build pass.

## 9. Trade-offs Requiring Confirmation

1. Scope of backend hard-block:
   1. Recommended: block all authenticated write operations until agreement.
   2. Alternative: only block `publish/join`.
2. `/api/auth/register/local` behavior:
   1. Recommended: same consent requirement as auto-created accounts (for consistency).
   2. Alternative: consent only for auto-create path (creates policy bypass gap).
3. Consent page interaction:
   1. Recommended: force action with two explicit buttons, no silent close.
   2. Alternative: dismissible prompt (higher risk of inconsistent state).

## 10. Out of Scope

1. Legal counsel review and jurisdiction-specific legal validation.
2. Multi-language legal page i18n rendering framework.
3. Policy change announcement/notification pipeline.

