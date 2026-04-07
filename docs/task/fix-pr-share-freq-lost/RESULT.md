# Result: PR WeChat Share Stabilization

## Task Name

`fix-pr-share-freq-lost`

## Delivered Outcome

本回合已把 PR WeChat share 從多處直接 imperative 寫入，收斂成 route-scoped 的單一 owner 流程，並完成 base/fallback/enrichment/replay/observability 的第一階段落地。

已完成的核心變化：

1. PR public detail routes 現在有 deterministic fallback share。
2. active share 的唯一寫入點已收斂到 `route-share-controller`。
3. backend detail response 提供 canonical share metadata，frontend head 與 WeChat active share 共用同一份 base truth。
4. rich thumbnail / AI desc 已降級為 enhancement，不再是 correctness prerequisite。
5. replay 已覆蓋 route lifecycle 與 SDK ready / `pageshow` / `visibilitychange`。
6. telemetry 已能區分 session start、descriptor submit、stale discard、apply success/failure、replay trigger。

## Key Implementation Notes

### 1. Canonical Base Share

- backend 新增 `pr-share-metadata.service.ts`
- APR / CPR detail response 現在回傳 `share.canonical`
- canonical metadata 包含：
  - `title`
  - `description`
  - `canonicalPath`
  - `defaultImagePath`
  - `revision`

### 2. Single Process Owner

- frontend 新增 `route-share-controller.ts`
- frontend 新增 `useRouteShareOrchestrator.ts`
- `AppRoot` 改為啟用新的 route share orchestrator
- 舊的 `useRouteWeChatShare.ts` 已移除，避免恢復第二條 writer path

### 3. Deterministic Fallback + Base Descriptor

- `/apr/:id`、`/cpr/:id` 的 router share policy 改為 `route`
- route entry 先提交 `FALLBACK` descriptor
- PR detail ready 後由 `usePRRouteShareDescriptor` 提交 `BASE` / cached `ENRICHED` descriptor
- `usePRDetailHead` 改為使用 canonical share metadata

### 4. Enrichment No Longer Owns Correctness

- `useShareToWechatChat` 不再直接呼叫 WeChat active share update
- WeChat thumbnail generation / description generation 現在只會提交 `ENRICHED` descriptor
- component props 改為 reactive refs，修正同 route param 切換不刷新的隱患
- late async result 會因 `routeSessionId + scopeVersion` 不匹配而被丟棄

### 5. Replay + Runtime Semantics

- WeChat runtime 現在分離：
  - `signatureUrl`
  - shared `targetUrl`
- SDK init 完成後會 replay current share card
- route orchestrator 在 `pageshow` / `visibilitychange` 會強制 replay 當前 descriptor
- descriptor apply 改為 queue/flush 模型，避免 fallback 晚到覆寫 base/enriched
- `useWeChatShare` 新增 runtime-level operation queue，讓 `wx.config`、share replay、share apply 進入同一條序列
- JS SDK capability 改為 union 模型；`openTagList` 不再被後續 share config 清空
- config callback 現在帶 init attempt fencing，避免舊的 `wx.ready` / `wx.error` 回調污染新一輪 config 狀態

### 6. Observability

已新增事件型別：

- `share_session_started`
- `share_descriptor_submitted`
- `share_descriptor_discarded_stale`
- `share_apply_fallback_success`
- `share_apply_base_success`
- `share_apply_enriched_success`
- `share_apply_failed`
- `share_replay_triggered`

frontend / backend telemetry taxonomy 已同步更新。

## Additional Log-Proven Fix

在後續真機日誌中，`Anchor PR Page` 被證實存在同頁兩次 `wx.config`：

- 一次帶 `openTagList`
- 一次不帶 `openTagList`

後者會覆蓋前者，說明 JS SDK config 在 runtime 層仍有多 owner。

本回合已補上：

1. 單一 runtime queue
2. capability union
3. share apply/config 原子化

因此現在不再依賴「哪個模組晚一點呼叫 `initWeChatSdk()`」來決定最終可用能力集合。

## Verification

已完成：

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/frontend build`

結果：

- backend typecheck: passed
- backend build: passed
- frontend build: passed

## Remaining Risks / Next Validation

這次已完成 architecture-level 收斂，但仍有兩類後續驗證需要在真機完成：

1. Android WeChat 手測
   - `/apr/:id` 首次進入
   - `/apr/:id -> /apr/:id`
   - 前背景切換後重新分享
2. CPR 與 APR 各驗證一次：
   - fallback 卡片不再退回首頁
   - previous page card 不再殘留

長期建議仍保留：

- Phase 6 Option B：把 rich thumbnail 從 client critical path 進一步遷到 backend pre-generation / read-through cache

## Done Assessment

對照 `PLAN.md` 的 definition of done：

1. deterministic fallback share：已完成
2. single process-level owner：已完成
3. UI preview 不再是 correctness 必要條件：已完成
4. late async result 不覆寫 current route：已完成第一階段保護
5. replay 覆蓋 route change / SDK ready / 頁面恢復：已完成
6. Android WeChat 真機穩定性：待手測確認
