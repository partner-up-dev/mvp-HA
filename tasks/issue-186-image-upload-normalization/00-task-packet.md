# Issue 186 Image Upload Normalization

## Objective & Hypothesis

Implement purpose-scoped image uploads so different image workflows are stored under distinct backend-owned prefixes.

Hypothesis:

- Backend-generated UUID keys keep upload identity independent from client filenames.
- A single image upload contract can serve posters, POI images, Anchor Event cover images, and Anchor Event beta-group QR images.
- Reusing one image URL input component across compatible upload surfaces reduces drift while keeping each page responsible for its own domain copy and save behavior.

## Guardrails Touched

- Product PRD: POI application workflow and operator-maintained Anchor Event / POI media.
- Product TDD: typed upload API, purpose-scoped storage prefixes, and frontend RPC contract.
- Backend: upload controller and image storage infrastructure.
- Frontend: shared upload composable, image URL input component, POI application, Admin POI Gallery, Admin Anchor Event media fields, and share poster upload call sites.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --dir apps/backend exec tsx --test src/infra/storage/image-storage.service.test.ts`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `git diff --check`

## Execution Notes

- Input Type: Intent.
- Active Mode: Execute.
- Scope Decision:
  - Replace the legacy poster-only upload API with one purpose-scoped image API.
  - Use backend-generated UUID keys and UUID physical image filenames.
  - Store image bytes under allowlisted purpose prefixes.
  - Use image file headers plus stored bytes to serve the correct content type.
  - Migrate all frontend upload call sites in this slice.

## Outcome

- Added purpose-scoped image storage under backend `infra/storage`.
- Replaced the upload API with `POST /api/upload/images/:purpose` and `GET /api/upload/images/:purpose/:key`.
- Exported the shared `ImageUploadPurpose` type for frontend upload call sites.
- Migrated share poster uploads, POI application uploads, Admin POI Gallery uploads, and Admin Anchor Event cover / beta-group QR uploads to the new purpose contract.
- Added `ImageUrlInput` for manual URL entry, upload progress, upload error text, and image preview.
- Updated PRD capabilities, Product TDD upload contract, deployment env docs, and frontend component inventory.

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/backend typecheck`
- Passed: `pnpm --filter @partner-up-dev/backend exec tsx --test src/infra/storage/image-storage.service.test.ts`
- Passed: `pnpm --filter @partner-up-dev/backend build`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Passed: `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Passed: `git diff --check`
