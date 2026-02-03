# L1 Plan — High-level Solution

## Summary

Introduce a unified **"LLM → HTML" poster spec** and a frontend **"HTML → iframe → html2canvas → PNG"** rendering pipeline. Provide two presets:

- **XHS Poster preset**: 2:3, large text + simple shapes
- **WeChat Thumb preset**: 1:1, simple shapes and ≤ 3 characters

Backend will only call LLM and return **structured output** (no image rendering). Frontend will render and snapshot, and will upload the resulting PNG when a URL is required (e.g., WeChat share card).

Key product constraints:

- Keep generating a separate XHS caption for clipboard; the caption also guides XHS poster HTML generation.
- Avoid marketing/advertising tone; posters should feel trust-worthy and user-authored.
- Keep the existing template-based poster generator as a fallback when HTML generation/rendering fails.

## Architecture

### Backend (apps/backend)

Add two standalone share endpoints (proposed, share service):

- `POST /api/share/xiaohongshu/poster-html`
- `POST /api/share/wechat-card/thumbnail-html`

Request (Zod):

XHS poster html:

- `prId`: number
- `style`: optional number (cycles styles like current styleIndex)
- `caption`: string (required; poster content is driven by caption)

WeChat card thumbnail html:

- `prId`: number
- `style`: optional number

Response (Zod / generateObject schema):

- `html`: string (single HTML document string, includes inline CSS)
- `width`: number
- `height`: number
- `backgroundColor`: optional string (used as html2canvas background fallback)
- Optional: `meta` (e.g., chosenKeyText for WeChat ≤3 chars or emoji)

Prompt strategy:

- Hard-code **dimension + constraints** in system prompt.
- Force **inline CSS only** and **no external resources**.
- Forbid `<script>`, event handlers, external URLs. Require:
  - One root container element with fixed size (width/height)
  - Use system fonts only
  - Use only simple shapes: divs with border-radius, gradients, borders

Data source:

- Backend resolves `prId` → parsed PR via `PartnerRequestService`/repository.
- Backend does not require frontend to send `prData`.

XHS caption interplay:

- `/api/llm/xiaohongshu-caption` remains (for clipboard).
- For `target=XHS_POSTER`, the poster HTML prompt must incorporate the caption text (conceptually: “poster content is <caption>”).

Safety:

- Return JSON via `generateObject` to avoid free-form.
- Backend can do minimal validation (reject if html contains `<script` or `onload=` etc). Frontend will still sandbox.

Note: Current `/api/llm/xiaohongshu-caption` can stay for clipboard copy UX.

### Frontend (apps/frontend)

Create a new rendering utility/composable (proposed):

- `useRenderHtmlPoster()` or `renderPosterHtmlToPng()`

Pipeline:

1. Create a hidden container and a sandboxed iframe.
2. Use `iframe.srcdoc = htmlWithCspInjected`.
3. Wait for iframe DOM ready + fonts (best-effort `document.fonts.ready`).
4. Select the poster root element in iframe and call `html2canvas(element, { width, height, scale, backgroundColor })`.
5. Convert canvas to blob.

Sandboxing & CSP:

- Use `<iframe sandbox="allow-same-origin">` (no scripts allowed).
- Inject CSP in srcdoc:
  - `default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:;`
- Additionally strip/deny `<script>` and `javascript:` URLs before setting `srcdoc`.

Integration points:

- Xiaohongshu share:
  - keep calling `/api/llm/xiaohongshu-caption` for clipboard text
  - call backend `/api/share/xiaohongshu/poster-html` with `prId` + `caption`
  - render HTML to PNG via iframe + html2canvas
  - keep existing upload behavior in WeChat browser (already uploads)
  - fallback: if HTML generation/rendering fails, use existing template-based `useGeneratePoster()`
- WeChat share:
  - call backend `/api/share/wechat-card/thumbnail-html` with `prId`
  - render HTML to PNG
  - upload and set `imgUrl` for JS-SDK
  - fallback: if HTML generation/rendering fails, use existing template-based `useGeneratePoster()` (but adjust it to 1:1 if needed)

### Style variants

Keep the existing “styleIndex cycles” UX:

- Pass `style` to backend; backend selects among **3** style prompt variants.
- Style prompts must be configurable through the existing config table (similar to how `xiaohongshu_style_prompt` is stored).

## Migration strategy

- Keep existing template-based poster generator temporarily behind an internal flag (or just switch directly).
- Ensure `useCloudStorage` stays unchanged: image upload is still required for WeChat share `imgUrl`.

## Acceptance criteria

- XHS posters are generated as PNG with aspect ratio 2:3 and readable large text.
- WeChat thumbnails are generated as PNG with aspect ratio 1:1 and contain only simple graphics or ≤3 characters.
- No server-side rendering/browser dependencies added.
- The same render pipeline (iframe + html2canvas) is used for both.
- Frontend never sends `prData` to LLM endpoints; it sends `prId`.
- On failures, app falls back to the existing template-based poster generator.

## Risks / mitigations

- LLM output might contain unsafe HTML: mitigate with structured output + deny-list + iframe sandbox + CSP.
- html2canvas rendering differences: keep CSS simple, avoid unsupported features.
- Performance: use reasonable dimensions + `scale=2` rather than extremely large canvases.
