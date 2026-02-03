# L0 Plan — LLM HTML + iframe + html2canvas Poster Refactor

## Goal

Refactor poster generation to: **LLM generates HTML**, frontend renders HTML in an **iframe**, then uses **html2canvas** to snapshot into an image.

## Constraints

- No server-side headless browser (no Puppeteer/Playwright/Chromium rendering).
- Posters should stay clean/simple (no heavy CSS effects required).
- Both share channels must use the same technical pipeline, but with different requirements:
  - Xiaohongshu poster:
    - Aspect ratio **2:3** (w:h=2:3)
    - Text + simple shapes
    - Text must be **large enough**
  - WeChat share card thumbnail:
    - Aspect ratio **1:1**
    - Only simple shapes **or ≤ 3 characters**

## Current repo observations

- Frontend already generates posters via `html2canvas` using a Vue template component (`PosterTemplate.vue`) and `useGeneratePoster.ts`.
- Xiaohongshu share flow:
  - Calls backend `/api/llm/xiaohongshu-caption` to generate a short caption.
  - Generates poster image client-side (template + html2canvas), and in WeChat browser uploads to backend `/api/upload/poster` to get a public URL.
- WeChat share flow:
  - Generates caption (same endpoint), generates poster image (same client template), uploads, then configures WeChat JS-SDK share card (`imgUrl` must be a URL).

## Non-goals (for this task)

- No change to WeChat JS-SDK signature / auth flow.
- No server-side image generation.
- No complex animation / filter effects.

## Open questions

Resolved decisions:

1. Keep generating a separate “caption text for clipboard”. The existing `/api/llm/xiaohongshu-caption` stays.
2. XHS poster HTML generation should be guided by the caption, e.g. prompt conceptually like: “generate xiaohongshu poster in HTML, poster content is <caption>”.
3. WeChat thumbnail: allow LLM to pick 1–3 chars from PR or pick an emoji.
4. Output sizes: OK to proceed with the earlier proposed sizes.
5. Style variants: 3 variants are enough; avoid marketing/advertising tone; must feel trust-worthy; style remains configurable through the config table; cycle like current styleIndex.

Additional requirement:

- Frontend must NOT pass `prData` to LLM endpoints; pass `prId` instead.
- Keep the template-based poster generator as a fallback if HTML generation/rendering fails.
