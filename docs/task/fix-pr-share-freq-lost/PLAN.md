# Plan: PR WeChat Share Stabilization Rollout

## Task Name

`fix-pr-share-freq-lost`

## Implementation Intent

本計畫不是為了快速補 1 個 bug，而是把整條 PR WeChat share pipeline 改造成：

- 有單一 owner
- 有可重放的狀態
- 有 deterministic fallback
- 有可丟棄的 async late result
- 有可觀測的 failure classes

## Phase 0: Freeze The System Shape

### Outcome

把目前 active share writers、route 入口、entity detail source、rich enrichment source 全部盤點清楚，避免實作時再擴散新 writer。

### Tasks

- 明確定義哪些模組可以提交 `ShareDescriptor`
- 明確禁止 UI component 直接呼叫 WeChat active share update
- 明確區分 `signatureUrl` 與 `targetUrl`

### Exit Criteria

- task packet 與 implementation scope 一致
- 沒有新增第二套 share apply path

## Phase 1: Extract A Single Process Owner

### Outcome

建立 route-scoped share orchestrator，讓 active share update 從多 writer imperative calls 收斂成單一流程。

### Target modules

- `src/processes/share/*`
- `src/shared/wechat/*`
- existing route bootstrap wiring in `AppRoot`

### Tasks

- 建立 `routeSessionId`
- 建立 `ShareDescriptor` 型別
- orchestrator 接受 descriptor submission
- runtime 只暴露 `applyDescriptor` 與 `replayCurrentDescriptor`

### Exit Criteria

- 所有 WeChat active share apply 只經過 orchestrator
- shared runtime 不再自己判斷 route truth

## Phase 2: Ship Deterministic Fallback Share

### Outcome

任何 public PR route 在 detail-ready 前，就能先配置一份正確 fallback share。

### Tasks

- 為 `/apr/:id`、`/cpr/:id` 建立 route fallback descriptor
- 確保 route entry 後先套用 fallback，再等待 detail
- 讓 route fallback 與 entity base share 使用同一資料模型

### Exit Criteria

- 不再出現「還沒生成 rich card 就只剩純連結」
- static route 與 PR route 全都走同一 orchestrator

## Phase 3: Promote Canonical Base Share Metadata

### Outcome

把 entity-backed share 的 base metadata 變成穩定 contract，而不是 scattered page assembly。

### Tasks

- backend 提供 canonical PR share metadata
- frontend domain adapter 從 detail response 轉出 BASE descriptor
- `usePRDetailHead` 與 active share descriptor 共享同一份 canonical base data

### Exit Criteria

- head metadata 與 WeChat runtime 不再各算各的
- PR detail route 的 share title/desc/link 有單一 canonical source

## Phase 4: Decouple Rich Enrichment From Correctness

### Outcome

rich image / AI desc 改成 enhancement，不再阻塞 correctness。

### Tasks

- 把 rich desc/rich image 寫回改為 `ENRICHED` phase
- 所有 enrichment task 都必須帶 `routeSessionId + revision`
- late result session mismatch 時直接 discard
- failure 只記 telemetry，不得破壞現有 BASE descriptor

### Exit Criteria

- rich generation 失敗時仍保留正確 BASE card
- 同 route param 切換時不會被舊 async 覆寫

## Phase 5: Add Replay Semantics

### Outcome

讓 share 狀態不依賴單次初始化成功。

### Tasks

- 在 SDK ready 後 replay current descriptor
- 在 `pageshow` replay
- 在 `visibilitychange` 回到 visible 時 replay
- route 完成切換後重新確認 current descriptor 已套用

### Exit Criteria

- Android WeChat 返回前景後仍能保持當前 route 的 share
- replay 不會重放過期 session

## Phase 6: Move Rich Asset Off The Client Critical Path

### Outcome

進一步降低平台差異與 browser timing 對 correctness 的影響。

### Options

#### Option A: staged

- 短期保留 client-side rich thumbnail
- 但只作 enhancement，不在 correctness critical path

#### Option B: long-term recommended

- backend pre-generation 或 read-through cache rich thumbnail
- frontend 只消費結果並提交 descriptor

### Recommendation

先完成 Option A 對 orchestration 的重構；穩定後再推進 Option B。

### Exit Criteria

- correctness 與 client-side poster generation 已完全解耦

## Test Matrix

### Core route cases

- `/apr/12` 首次進入
- `/cpr/12` 首次進入
- `/apr/12 -> /apr/13`
- `/cpr/12 -> /cpr/13`
- `home -> /apr/12 -> home -> /apr/12`

### Failure cases

- signature init fail
- detail slow but fallback available
- desc generation fail
- thumbnail generation fail
- upload fail
- late result arrives after route switch

### Lifecycle cases

- SDK ready after descriptor already submitted
- `pageshow`
- `visibilitychange` from hidden to visible

### Platform verification

- Android WeChat manual verification
- iOS WeChat manual verification
- non-WeChat browser degradation path

## Observability Plan

至少新增以下 telemetry / log classes：

- `share_session_started`
- `share_descriptor_submitted`
- `share_descriptor_discarded_stale`
- `share_apply_fallback_success`
- `share_apply_base_success`
- `share_apply_enriched_success`
- `share_apply_failed`
- `share_replay_triggered`

## Migration Safety Rules

1. 在 orchestrator 完成前，不要再新增新的直接 `updateAppMessageShareData` call site。
2. 在 fallback 路徑穩定前，不要把更多功能綁到 rich thumbnail generation。
3. 在 replay 語義完成前，不要假設一次 `init + apply` 就足夠穩定。

## Definition Of Done

只有滿足以下條件，這個 task 才能視為完成：

1. PR routes 擁有 deterministic fallback share。
2. active share 只有一個 process-level owner。
3. UI preview 不再是 correctness 的必要條件。
4. late async results 不能覆寫當前頁。
5. replay 覆蓋 route change、SDK ready、頁面恢復可見。
6. Android WeChat 手測不再出現首頁卡片或上一頁卡片殘留。
