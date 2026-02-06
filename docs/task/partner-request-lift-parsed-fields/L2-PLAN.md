# L2 Plan (Low-Level Design)

## Data Model & Types

### Backend Entity Schema (apps/backend/src/entities/partner-request.ts)
- Replace `parsedPRSchema` with top-level field schemas:
  - `title`: `z.string().optional()`
  - `type`: `z.string()` (rename from scenario)
  - `time`: `z.tuple([z.string().nullable(), z.string().nullable()])` (time window; null entries mean no constraint)
  - `location`: `z.string().nullable()`
  - `expiresAt`: `z.string().datetime().nullable()`
  - `budget`: `z.string().nullable()`
  - `preferences`: `z.array(z.string())`
  - `notes`: `z.string().nullable()`
  - `partners`: `z.tuple([z.number().nullable(), z.number(), z.number().nullable()])` meaning `[min, current, max]`
- Update `partnerRequestSummarySchema` to include top-level `title` and `type` (no nested `parsed`).
- Remove `ParsedPartnerRequest` type; introduce `PartnerRequestFields` or similar for shared shape.

### DB Schema (Drizzle)
- Drop and recreate `partner_requests` table (dev reset strategy).
- New columns:
  - `title` text
  - `type` text not null
  - `time_window` text[] (size 2) (maps to `time` tuple; entries can be null)
  - `location` text nullable
  - `expires_at` timestamp nullable
  - `budget` text nullable
  - `preferences` text[] not null default empty
  - `notes` text nullable
  - `partners` integer[] not null (size 3) default `[null,0,null]`
  - `raw_text`, `status`, `pin_hash`, `created_at`, `xiaohongshu_poster`, `wechat_thumbnail` unchanged
- In Drizzle schema: use `text("time_window").array()` and `integer("partners").array()`.

### API Contracts
- Responses return top-level fields (no `parsed`).
- Update update-content endpoint schema to accept top-level fields + `pin`.

## Backend Logic Updates

### PartnerRequestService
- `createPR`:
  - `parsed` from LLM replaced by `fields`.
  - Persist top-level fields directly in create call.
- `getPRSummariesByIds`:
  - Return `title`, `type` from top-level fields.
- `updatePRContent`:
  - Accept top-level fields and update columns.
- `joinPR`/`exitPR`:
  - Replace `participants` with `partners` tuple.
  - `current = partners[1]`, `min = partners[0]`, `max = partners[2]`.
  - Join validation: if `max != null` and `current >= max` -> full.
  - On join: increment `current` to `current + 1` and update tuple.
  - On exit: decrement `current` (floor at 0).
  - Status transitions:
    - If `min != null` and new current >= min and status OPEN -> ACTIVE.
    - If `min != null` and new current < min and status ACTIVE -> OPEN.
- `expireIfNeeded`:
  - Use `expiresAt` column only; remove parsed fallback.
- Remove `normalizeParsedExpiresAt` helper.

### PartnerRequestRepository
- Replace `updateParsed` with `updateFields` that sets explicit columns.
- Replace `incrementParticipants`/`decrementParticipants` with `updatePartners` or `incrementCurrentPartner` that updates the array.
- Ensure all repository return types are updated to new `PartnerRequest` shape.

### LLMService
- Update `parsedPRSchema` usage to new top-level fields schema.
- Update prompt outputs and `parseRequest` return type to match new fields.
- Update share prompt builders to use `type` and `time` tuple, and `partners` min/max in place of previous fields.

## Frontend Updates

### Types & Validation
- Replace `parsedFieldsSchema` with `prFieldsSchema` matching new shape.
- Update `updateContentSchema` to accept top-level fields + `pin`.

### Components/Pages
- Replace all `data.parsed.*` with top-level fields:
  - `PRPage.vue`, `PRCard.vue`, `SharePR.vue`, `ShareToXiaohongshu.*`, `ShareToWechat.*`, `EditContentModal.vue`, list cards, etc.
- Update computed logic for join eligibility using `partners` tuple.

### Queries & Mocks
- Update mock RPC data to new shape.
- Update any query types that rely on `PartnerRequestSummary` or `ParsedPartnerRequest`.

## Migration Plan
- Create a new migration SQL in `apps/backend/drizzle/` that drops and recreates `partner_requests` with the new schema (dev reset).
- Ensure `drizzle` schema matches the new table definition.

## Docs
- Update:
  - `AGENTS.md`
  - `apps/backend/AGENTS.md`
  - `apps/frontend/AGENTS.md`
  to reflect top-level fields, renamed concepts (`type`, `time`, `partners`), and removal of `parsed`.

