# Identity And Session Dossier

## 1. What It Is

`Identity And Session` is the continuity boundary that lets a person return, authenticate, bind WeChat, and act as the same user across collaboration flows.

Its stable semantic center is:

- `User` as the durable actor record
- user role and active/disabled status
- anonymous browsing continuity
- local account plus PIN continuity
- authenticated access tokens
- WeChat `openid` binding and OAuth handoff
- current-user profile snapshot

Adjacent concepts with their own centers:

- `PartnerRequest Core` consumes identity to decide creator ownership and participant eligibility.
- `Notification` consumes `User.openId` and user notification options for deliverability.
- `Participation And Reliability` writes user reliability aggregates from participation outcomes.
- `Support And Operations` may expose help routes and admin tooling that require identity context.

Current smell: Identity exists in several technical locations rather than one clear bounded context.

## 2. Why It Exists

It exists because PartnerUp allows low-friction discovery while preserving enough continuity for collaboration.

Its responsibilities are:

- let anonymous users browse and later become durable users
- let local users recover through user id plus PIN
- let Anchor PR flows require WeChat-bound identity where product trust requires it
- let frontend preserve session continuity across visits
- keep user profile facts such as nickname and avatar attached to the same user
- separate admin/service sessions from normal user sessions

The product value is continuity with low upfront friction.

## 3. Lifecycle

User relationship lifecycle:

1. Visitor starts with anonymous request auth.
2. System may create an anonymous user and signed anonymous-session cookie.
3. User may create a local account with generated PIN.
4. Frontend stores access token, user id, role, and PIN where applicable.
5. User may bind WeChat through OAuth or profile flow.
6. Anonymous user may upgrade into authenticated user with WeChat profile.
7. User may update nickname and avatar.
8. User may become unavailable through disabled status.

Session lifecycle:

1. Request enters with optional bearer token.
2. Backend verifies token and resolves request auth.
3. Backend may issue or rotate `x-access-token`.
4. Frontend stores the latest token and role/user metadata.
5. Browser-side pending WeChat actions and OAuth handoff complete session restoration.
6. `/me` and `/pr/mine` use authenticated session state for revisit.

WeChat binding lifecycle:

1. User enters OAuth or bind flow.
2. Backend obtains `openid` and optional profile.
3. Existing user may bind openId if it is unoccupied.
4. Anonymous user may upgrade when the openId is unoccupied.
5. Bound openId becomes a deliverability and Anchor-action precondition.

## 4. Inputs And Outputs

Inputs:

- bearer access token
- anonymous-session signed cookie
- local user id and PIN
- admin login password/PIN
- WeChat OAuth callback and profile payload
- current-user nickname/avatar commands
- browser pending-action state for WeChat handoff

Outputs:

- `users`
- `user_reliability` seed row
- `user_notification_opts` seed row
- `x-access-token` response header
- anonymous-session signed cookie
- current-user profile snapshot
- local account credentials returned at creation/session restoration time
- profile avatar file and URL

## 5. External Conditions

Important external conditions:

- JWT secret and token expiry policy
- cookie signing secret through auth env
- browser local/session storage behavior
- WeChat OAuth availability and `openid` uniqueness
- avatar storage path and file-system write permissions
- frontend credential preservation for OAuth handoff and cookie-backed flows
- admin/service credential policy

Identity complexity is mainly session continuity plus external platform binding.

## 6. Invariants

Hard invariants:

- User id is the durable actor key.
- `openId` is unique across users.
- `role` determines normal authenticated user versus service/admin session.
- Disabled users cannot act through authenticated flows.
- Anonymous browsing can exist with user id or request-only auth.
- Local PIN is a recovery credential and should be returned only when the flow intentionally exposes it.
- WeChat-bound identity is required for key Anchor PR participation actions.
- New users should receive reliability and notification-opt companion rows.

Likely invariants to make more explicit:

- PIN lifecycle belongs to Identity.
- WeChat openId resolver belongs to Identity.
- Notification option rows belong to Notification from a semantic perspective, while user creation may seed them transactionally.
- User reliability rows belong to Participation/Reliability from a semantic perspective, while user creation may seed them transactionally.

## 7. How It Is Observed And Changed

Changed by:

- `/api/auth/register/anonymous`
- `/api/auth/register/local`
- `/api/auth/session`
- `/api/auth/admin/login`
- WeChat OAuth callback and bind flows
- `/api/users/me`
- `/api/users/me/avatar`
- user upgrade from anonymous to WeChat-bound authenticated user

Observed through:

- frontend `useUserSessionStore`
- `/me`
- `/pr/mine`
- PR creator/participant views
- notification eligibility and delivery checks
- admin session guards
- current-user profile queries

Event Storming view:

- Commands: register anonymous, register local, restore session, bind WeChat, upgrade anonymous, update profile, upload avatar, admin login.
- Events currently implicit: user registered, session restored, WeChat bound, anonymous upgraded, profile updated.
- Aggregates: `User`, `Session`, `WeChatBinding`.
- Policies: token renewal, PIN verification, openId uniqueness, active-user requirement, role-based access.

## 8. Boundaries With Other Concepts

With `PartnerRequest Core`:

- Identity supplies actor facts.
- PR Core decides creator mutation authority, local PIN validation for PR ownership, and participant action eligibility.

With `Notification`:

- Identity supplies active user and openId.
- Notification owns opt/quota policy and channel-specific deliverability decisions.

With `Participation And Reliability`:

- Identity supplies user key.
- Reliability owns participation outcome aggregates such as join/confirm/attend/release ratios.

With `Frontend App/Processes`:

- Backend owns token semantics and session authority.
- Frontend owns storage, pending action continuity, and route-level OAuth handoff orchestration.

With `Support And Operations`:

- Service users and admin sessions use the same user table role model.
- Admin capability policy should stay explicit when more roles appear.

## Evidence

- PRD identity rules: `docs/10-prd/behavior/rules-and-invariants.md`.
- PRD identity workflows: `docs/10-prd/behavior/workflows.md`.
- Product TDD session contract: `docs/20-product-tdd/cross-unit-contracts.md`.
- Backend user domain: `apps/backend/src/domains/user`.
- Backend auth middleware: `apps/backend/src/auth/middleware.ts`.
- Backend anonymous session cookie: `apps/backend/src/auth/anonymous-session.ts`.
- User entity and repository: `apps/backend/src/entities/user.ts`, `apps/backend/src/repositories/UserRepository.ts`.
- PIN and openId helpers currently under PR Core: `apps/backend/src/domains/pr-core/services/user-pin-auth.service.ts`, `apps/backend/src/domains/pr-core/services/user-resolver.service.ts`.
- Frontend session store: `apps/frontend/src/shared/auth/useUserSessionStore.ts`.
- Frontend user queries: `apps/frontend/src/domains/user/queries`.
- Frontend WeChat process: `apps/frontend/src/processes/wechat`.

## Current Smells

- `domains/user` owns a small slice of identity while `auth/*`, `pr-core` helpers, controllers, and WeChat services own other slices.
- PIN generation and verification live under `pr-core`, although local account continuity is an Identity concern.
- WeChat openId auto-create resolver lives under `pr-core`, although WeChat binding is an Identity concern.
- `UserRepository.create` seeds `user_reliability` and `user_notification_opts`; this is transactionally practical, but it couples User creation to Reliability and Notification storage.
- Admin login uses `User.role === "service"` and PIN/password verification, so admin identity and normal identity share mechanics with limited policy naming.
- Avatar file storage lives inside current-user use case, mixing identity profile mutation with storage concerns.

## Direction

Recommended next structural direction:

- Promote a backend `domains/identity` or strengthen `domains/user` into the Identity boundary.
- Move PIN lifecycle and WeChat openId resolver into that boundary.
- Keep `auth/*` as protocol/session infrastructure, with Identity use cases owning business meaning.
- Keep frontend `shared/auth` as storage/session infrastructure, while `domains/user` owns current-user/profile queries.
- Add explicit domain events later for `user.registered`, `user.wechat_bound`, and `user.profile_updated` when downstream consumers need durable reaction.
- Treat notification opts and reliability rows as companion records seeded by user creation until those domains need independent creation policy.

