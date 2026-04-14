## 📑 Summary

新增一个面向 Anchor PR 的短路径检索入口，让用户先选择一个已知 Anchor Event，再表达“我哪几天可参加”，然后看到该活动下匹配的可行动 Anchor PR 列表，并从结果进入既有 `/apr/:id` 详情与加入流程。

本 issue 目标是缩短从进入产品到找到可行动 Anchor PR 的路径；它不改变 Anchor PR 仍由 Anchor Event / Batch / Location 上下文承载的产品边界，也不新增脱离活动上下文的通用 Anchor PR 创建入口。

## 🤔 Rationale

当前 Anchor collaboration 的主要路径是：

1. 用户进入 `/events`；
2. 选择某个 Anchor Event；
3. 在 `/events/:eventId` 中理解活动、批次、地点、偏好、列表/卡片模式；
4. 再进入某个 `/apr/:id`。

这个路径适合“浏览活动”，但对冷启动用户来说，进入产品后的前几个决策点太多。用户通常先有的是更轻的意图：我想参加哪个活动，以及我哪几天有空。新入口应把用户的主动意图前置，用更少的信息输入换到可行动的 Anchor PR 列表，减少在活动、批次、地点、偏好之间被动浏览造成的信息过载。

成功信号应围绕“路径更短”验证：从入口到首次进入 `/apr/:id`，或到首次触发 Anchor PR 加入意图，所需步骤比现有 event browsing path 更少。

## 📏 Specification

### Entry And Route

- 新增 Anchor PR Search 页面，暂定路由 `/events/search`，route name 可为 `anchor-pr-search`。
- 页面可从首页活动入口、活动广场，或后续营销入口进入；具体入口位置可以在实现时按当前首页 IA 决定。
- 浏览和检索不要求 upfront login；点击结果进入 `/apr/:id` 后，加入、确认、退出、签到等动作继续沿用现有 Anchor PR 身份与 WeChat 绑定规则。
- 搜索条件是用户意图，应可被刷新、返回、分享时恢复。建议使用 route query 保存 `eventId` 与离散 `date` 条件；`spm` 继续只承担 attribution，不承担 UI state。

### Search Page IA Wireframe

```text
+------------------------------------------------+
| PageHeader                                     |
| < 返回                                         |
| 找活动搭子                                     |
| 先选你想参加的活动和可参加日期                 |
+------------------------------------------------+
| Section: 活动                                  |
| [ Anchor Event Card ] [ Anchor Event Card ] -> |
|   周末羽毛球局       夜跑小队                  |
+------------------------------------------------+
| Section: 可参加日期                            |
| Calendar 4-week view                           |
| [今] [明] [后] [ ] [ ] ...                     |
| disabled: past dates, dates outside 4-week window |
+------------------------------------------------+
| Footer actions                                 |
| [ 返回首页 ]                    [ 检索 ]       |
+------------------------------------------------+
```

Wireframe 只表达信息架构，不限定最终视觉样式。

### Search Form

页面初始态展示一个轻量表单，核心问题只有两个：

1. 活动
2. 可参加日期

活动控件：

- 使用 horizontal scroll 的 Radio Cards，并复用 Event Plaza Page 一致的 Anchor Event Card 信息架构。
- 选项来自 ACTIVE Anchor Events，即每张卡对应一个 Anchor Event，而不是抽象 event type，也不是从已有 PR 的 `partner_requests.type` 反推。
- `GET /api/events` 应返回足够完整的 ACTIVE event object list，供页面渲染 Anchor Event Cards、默认选项与显示顺序。如果当前 `GET /api/events` 只返回 event ids，应升级它，而不是新增一个 event-card-only endpoint。
- 活动排序 / showIndex：当前代码里没有 `show-index` / display order 字段。实现前要明确它由 #149 提供、由本 issue 补充，还是暂时沿用后端返回顺序；不要在前端硬编码一个不可维护的排序真相。
- 默认值优先级：
  1. URL query 中合法且仍 ACTIVE 的 `eventId`
  2. 后端返回顺序中的第一个 Anchor Event
- 若没有任何 ACTIVE Anchor Event，页面展示 empty state，不展示不可用表单。

日期控件：

- 使用 Calendar Picker。
- 视图范围为当前周起的四周窗口。
- 以离散多选表达日期，不要求用户选择连续范围。
- 可选日期范围为当前四周窗口内、且不早于今天的日期。
- 过去日期与四周窗口外的日期禁用。
- 默认选中今天、明天、后天。
- 日期在 URL/API 中使用 `YYYY-MM-DD` 的产品本地日期，不直接暴露 ISO datetime。

日期匹配口径：

- 搜索结果建议按 Anchor PR root `time[0]` 的产品本地日期匹配，因为用户关心的是实际协作发生日；batch timeWindow 作为 event context 返回。
- 没有可判定 start date 的 Anchor PR 不应进入日期搜索结果，除非后续产品明确它们应该如何被匹配。
- 若 #151 调整 APR 时间窗口权威来源，本搜索 API 必须跟随同一个口径。

表单底部操作：

- `检索`
- `返回首页`
- 两个操作使用 1 row / 2 columns 布局。
- `返回首页` 回到 `/`，不触发检索。

### Search Result Page IA Wireframe

```text
+------------------------------------------------+
| PageHeader                                     |
| < 返回  活动搭子结果              修改条件     |
| 条件：周末羽毛球局 · 4/11、4/12、4/13          |
+------------------------------------------------+
| Result summary                                 |
| 找到 6 个可加入的活动搭子                      |
+------------------------------------------------+
| Result List                                    |
| +--------------------------------------------+ |
| | Anchor PR Card                             | |
| | OPEN                                      | |
| | 4/12 19:00 · 五角场 · 2/4 人               | |
| +--------------------------------------------+ |
| +--------------------------------------------+ |
| | Anchor PR Card                             | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Empty state                                   |
| 没有找到匹配结果                              |
| [ 修改条件 ] [ 去活动广场看看 ]               |
+------------------------------------------------+
| BottomDrawer: 修改条件                        |
| 活动                                          |
| 日期                                          |
| [ 取消 ]                         [ 应用 ]     |
+------------------------------------------------+
```

Wireframe 只表达信息架构，不限定最终视觉样式。

### Search Result Page

提交检索后，页面进入结果态；可以是同一路由的结果状态，也可以是同 route 下 query-driven state，但必须能刷新后恢复同一组条件与结果。

结果页行为：

- 使用与 Anchor Event Page list mode 语义一致的列表和卡片呈现 Anchor PR。
- 默认只返回可行动候选，即可进入详情并可能加入的 visible Anchor PR。建议状态范围为 `OPEN` / `READY`，最终加入资格仍由 `/apr/:id` 详情页和 join API 的后端规则决定。
- 每个结果至少展示：
  - status
  - participant count / maxPartners
  - location
  - PR time
- Search Result Page 必然属于一个特定且用户已知的 Anchor Event；结果卡片不重复展示 Event、Batch、Type 信息。
- 如果 Anchor PR 有自定义 title，可以展示；没有 title 时不应退回重复 event type，而应让时间、地点、人数组成主要识别信息。
- 点击结果进入既有 `/apr/:id`。
- 如果搜索结果只有 1 条，Search Result Page 不停留在列表态，直接二次跳转到唯一结果的 `/apr/:id`。这次跳转应避免制造重复的用户决策点；若实现埋点，需要保留“由搜索命中后跳转”的可观察来源。
- 唯一结果自动跳转必须避免浏览器返回时再次进入自动跳转循环；建议使用 `replace` 或等效的 replay guard。
- 结果应按实际时间从近到远排序；同时间下使用稳定的 event display order / batch order / PR createdAt 作为 tie-breaker。
- Loading、empty、error 状态必须有可理解文案。
- Empty state 可以引导用户返回活动广场或调整条件；若提供创建引导，只能导向对应 Anchor Event 页面中的受控创建流程，不能新增 standalone Anchor PR create route。

结果页右上角：

- `PageHeader` 右侧提供 text button：`修改条件`。
- 点击后打开 `BottomDrawer`。
- Drawer 内容复用同一组搜索表单字段，并回填当前条件。
- Drawer footer 提供 `取消` 与 `应用`。
- `取消` 关闭 Drawer，不改变当前结果。
- `应用` 更新 URL query 并重新检索。

### API Contract Candidate

`GET /api/events` 继续作为 event catalog read contract，并应返回完整 ACTIVE event object list，至少足够支持：

- event id
- title
- type
- description
- cover image / fallback image data
- location pool display data
- status
- createdAt
- display order / showIndex，如果该字段在 #149 或本 issue 中被固化

Anchor PR 搜索应是另一个独立接口，不挂在 `/api/events` 下面。候选 endpoint：

```http
GET /api/apr/search?eventId=<anchorEventId>&date=YYYY-MM-DD&date=YYYY-MM-DD
```

Query 语义：

- `eventId` 必填，必须指向一个 ACTIVE Anchor Event。
- `date` 可重复，至少 1 个，最多 28 个。
- 每个 `date` 必须是 `YYYY-MM-DD`，且必须落在当前四周 calendar window 内，且不早于今天。

Response 语义：

```ts
type AnchorPRSearchResponse = {
  criteria: {
    eventId: number;
    dates: string[];
  };
  results: Array<{
    pr: {
      id: number;
      canonicalPath: string;
      title: string | null;
      location: string | null;
      preferences: string[];
      notes: string | null;
      time: [string | null, string | null];
      status: "OPEN" | "READY";
      minPartners: number | null;
      maxPartners: number | null;
      partnerCount: number;
      createdAt: string;
    };
    anchor: {
      eventId: number;
      batchId: number;
    };
  }>;
};
```

实现时应继续让 frontend 通过 Hono RPC client 推导类型，不手写重复 DTO。

### Measurement

若本 issue 同时补充埋点，建议至少覆盖：

- 搜索页面曝光
- 搜索提交
- 搜索结果点击
- 搜索命中唯一结果后的自动跳转
- 从搜索入口进入 `/apr/:id` 后的 primary CTA impression/click

如果只做 MVP UI/API，可先复用现有 `page_view` 与 Anchor PR primary CTA 事件，但验收时需要说明如何判断“更短路径”。

### Acceptance Criteria

- [ ] 用户可以进入 Anchor PR Search 页面，并在无登录状态下看到可用的活动卡片与默认日期。
- [ ] 活动 Radio Cards 复用 Event Plaza Page 一致的 Anchor Event Card 信息架构，只展示 ACTIVE Anchor Events；query 中合法 `eventId` 会被回填，非法 `eventId` 会 fallback 到默认 event。
- [ ] `GET /api/events` 返回足够完整的 ACTIVE event object list，页面无需通过硬编码构造活动卡片或默认选项。
- [ ] Calendar Picker 支持离散多选，只允许选择当前四周窗口内、且不早于今天的日期，并默认选中今天、明天、后天。
- [ ] 点击 `返回首页` 会回到 `/`，不会触发检索。
- [ ] 点击 `检索` 会用当前 eventId + dates 更新 route query，并请求独立的 Anchor PR search API。
- [ ] 后端搜索结果只来自 backend-authoritative Anchor Event / Batch / Anchor PR 状态；前端不自行发明 eligibility、status、timing 或 identity 规则。
- [ ] 结果默认只包含符合所选 Anchor Event、日期条件、visible、batch 未过期、状态为 `OPEN` / `READY` 的 Anchor PR。
- [ ] 如果结果只有 1 条，页面直接二次跳转到唯一结果的 `/apr/:id`。
- [ ] 如果结果多于 1 条，结果卡片展示 PR 的时间、地点、人數、状态；不重复展示 Event、Batch、Type 信息。
- [ ] 点击任一结果进入对应 `/apr/:id`；详情页既有 join/exit/confirm/check-in/booking-support/share 行为不改变。
- [ ] `修改条件` 打开 BottomDrawer，Drawer 表单回填当前条件。
- [ ] Drawer 中点击 `取消` 不改变当前结果；点击 `应用` 更新条件并重新检索。
- [ ] loading、empty、error 状态均有明确文案；无结果时不自动创建 Anchor PR。
- [ ] 既有 `/events`、`/events/:eventId?mode=card|list`、`/apr/:id` 行为不发生回归。
- [ ] 若新增 telemetry event，frontend event type 与 backend accepted taxonomy 同步更新，且搜索结果点击 / 唯一结果自动跳转能被观察到。

## 🚧 Technical Constraints

- 不新增 standalone / generic Anchor PR create route 或 API。Anchor PR 创建仍只能发生在 Anchor Event / Batch / Location 的受控上下文内。
- 不使用 admin workspace API 作为公开搜索数据源。
- 不让前端通过 N+1 拉取所有 event detail 后自行筛选跨 event / date 的 Anchor PR 结果。
- Anchor PR search API 不挂在 `/api/events` 下；`GET /api/events` 只承担 event catalog，不承担 PR search。
- 如果最终采用 `/api/apr/search`，backend static route 必须注册在 `/api/apr/:id` 之前；frontend 的 `/events/search` 也必须注册在 `/events/:eventId` 之前。
- 日期匹配必须定义产品本地日历口径；不要直接用 ISO 字符串前缀或浏览器本地时区各自比较导致跨日错误。
- 搜索读取必须考虑 temporal status refresh；返回给用户前的状态口径要和现有 Anchor PR detail/list 语义一致。
- frontend 新增 read path 必须放在 domain-owned query hook 中，query key 必须包含 `eventId` 与完整 `dates`，避免不同条件共用 cache。
- frontend 必须继续使用 Hono RPC client，不直接 `fetch`。
- 不使用 `any`，不手写可由 Hono RPC 推导的 response type。
- 如果本 issue 固化新 route/API，PRD workflow 与 Product TDD stable route / cross-unit contract 需要随实现同步更新。

## ⏪ Backward Compatibility

这是 additive feature。

- 既有 `/events` 活动广场不改变，但其数据 contract 可以向“完整 ACTIVE event object list”扩展。
- 既有 `/events/:eventId` list/card mode 不改变。
- 既有 `/apr/:id` 详情、加入、确认、退出、签到、booking support、share 行为不改变。
- `spm` 继续只承担 attribution，不作为搜索 UI state。
- 不需要数据迁移，除非实现时为 event ordering / showIndex 或搜索性能新增持久字段或索引；若新增 schema，应按现有 forward-only migration 流程处理。

## 🔄 Alternatives Considered

- **把搜索挂在 `/api/events/anchor-pr-search`**：这会让 event catalog 和 Anchor PR search 的资源语义混在一起；更清晰的做法是升级 `GET /api/events` 支持 event catalog，并让 PR search 使用独立接口。
- **继续只优化 `/events/:eventId` list/card mode**：不能解决用户一开始并不知道该选哪个 event/batch/date 的问题，路径仍偏长。
- **前端用现有 `/api/events` + 多个 `/api/events/:eventId` 自行聚合**：实现看似快，但会制造 N+1 请求、重复缓存、性能和状态权威问题，且与 #130 的加载速度目标相冲突。
- **搜索结果直接一键加入 demand card**：后端已有 demand card join 能力，但首版若绕过 `/apr/:id`，用户会缺少活动、补贴、确认、booking support 等关键上下文；本 issue 先保持“搜索 -> 详情 -> 既有加入流程”，并在唯一结果时自动跳转到详情页。
- **无结果时直接创建 Anchor PR**：会破坏当前“Anchor PR 创建必须受 event/batch/location 约束”的产品规则；可作为 event-scoped create 引导，但不能成为 standalone create。

## 📚 References

- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/10-prd/behavior/claims.md`
- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/20-product-tdd/system-state-and-authority.md`
- Related: #129, #130, #149, #151
