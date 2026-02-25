# GAP 分析：现有代码 vs `partner-up-h5-cold-start_prd_minimal.md`

更新时间：2026-02-25  
对照范围：`apps/backend`、`apps/frontend` 当前主干代码（不含 `docs/plan` 历史草案）

## 结论总览

当前代码在「创建 / 基础状态流转 / 加入退出 / 分享 / 微信登录 / 基础确认与签到」上已有实现，但与 PRD 的 L1/L2 准备层仍有系统缺口，主要集中在：

1. 供给扩展与 Anchor 运营（批次化、模板化、弱曝光治理）。
2. 可靠性体系（提醒触达、实时感知、可靠性评分）。
3. 经济与报销闭环（模型 A/C、规则展示、运营动作留痕）。
4. 安全与增长观测（举报、指标体系、分线分析）。

## 状态变更记录

### 已回写为 PRD 决策（不再计入 GAP）

- G01：L1 统一要求参与动作登录（join/exit/confirm/check-in）。
- G02：L1 保留 `ACTIVE` 作为对象状态并对外展示。

### 已完成实现（不再计入 GAP）

- G05：已新增后台周期性时态维护（自动释放未确认槽位不再仅依赖读写惰性触发）。
- G06：前端签到已补充“是否愿意再参加”二次确认并回传 `wouldJoinAgain`。

### 已启动重构（进行中）

- FRONTEND-REFACTOR：`PRPage` 已完成容器化拆分（page + widgets + feature hook），并上线统一 query key 工厂（详见 `FRONTEND-REFACTOR.md`）。
- FRONTEND-REFACTOR：`PRCreatePage`、`HomePage` 已迁移到容器 + widgets，WeChat 参与动作鉴权已下沉到 `processes` 层。
- FRONTEND-REFACTOR：`PRPage` 分享面板已迁移到 `features/share + widgets/pr` 组合层（分享内部实现迁移仍进行中）。
- FRONTEND-REFACTOR：前端统一埋点 SDK（基础版）与分享 hooks 已落地；已覆盖 create/join/exit/confirm/check-in/share 关键事件，后端聚合能力待补齐。

## GAP Cluster 聚合

| Cluster | 聚合 GAP | 目标 | 计划文件 |
|---|---|---|---|
| GAPC-01 供给扩展引擎 | G07, G15, G17 | 让 Anchor Event 可批量复制、自动扩容、低质量供给自动收敛 | `GAPC-01-PLAN.md` |
| GAPC-02 可靠性与触达 | G04, G14, G19 | 建立提醒、实时人数信号、可靠性评分闭环 | `GAPC-02-PLAN.md` |
| GAPC-03 经济与报销闭环 | G08, G09, G10, G11, G18, G20 | 从数据模型到页面到运营动作，打通 A/C 经济层 | `GAPC-03-PLAN.md` |
| GAPC-04 观测与分析管线 | G13, G16, G21 | 建立可用于 L1 决策的指标与分线分析能力 | `GAPC-04-PLAN.md` |
| GAPC-05 安全基线 | G12 | 落地可见安全姿态与最小举报链路 | `GAPC-05-PLAN.md` |

## 共享 Infra（跨 Cluster）

多个 Cluster 共享基础设施重构，单独抽离为 `INFRA-PLAN.md`，重点是：

1. 事件驱动骨架（Domain Event + Outbox + Job Runner）。
2. 后端服务按领域拆分（替代单体 `PartnerRequestService` 持续膨胀）。
3. 统一观测埋点 SDK（前后端同一事件命名与上下文）。
4. 可中断的迁移策略（MVP 阶段可不兼容，允许 schema 重整与服务重编排）。

前端另外有专项重构蓝图：`FRONTEND-REFACTOR.md`（页面拆分、feature 化、查询/鉴权/分享体系收敛）。

## 详细 GAP 清单（含 Cluster）

| ID | Cluster | PRD 要求 | 现状证据（代码） | GAP 结论 | 优先级 |
|---|---|---|---|---|---|
| G04 | GAPC-02 | T-24h / T-2h 提醒 + 可选公众号订阅 | 代码中无 reminder/subscription 相关实体、任务、接口；仅有 OAuth 与分享能力 | 提醒机制未实现 | 高 |
| G07 | GAPC-01 | Anchor Event 批次化（同锚点多 batch）、满员后推荐同类型异地活动、可自动开新 batch | `apps/backend/src/entities` 仅有 `partner-request/partner/user/config`；无 `anchor_event`、`batch_id`；无相关推荐接口 | 6.2 批次化核心能力未实现 | 高 |
| G08 | GAPC-03 | PR 页面明确展示“场地由平台预定 / 折扣已应用 / 支付规则” | `apps/frontend/src/components/pr/PRCard.vue` 仅展示 type/time/location/partners/budget/preferences/notes | 运营责任与支付规则展示缺失 | 高 |
| G09 | GAPC-03 | Model C（≤12元免费）与 Model A（报销）的最小数据结构 | `apps/backend/src/entities/partner-request.ts`、`apps/backend/src/entities/partner.ts`、`apps/backend/drizzle/0000_outgoing_mongu.sql` 无 `payment_model/discount_rate/subsidy_cap/reimbursement_*` 字段 | 经济模型尚未建模 | 高 |
| G10 | GAPC-03 | Model C 需要 `resource_booking_deadline` 与取消策略展示 | 现有 schema 无 booking deadline 与取消窗口字段；前端无对应展示 | 运营约束字段与文案缺失 | 高 |
| G11 | GAPC-03 | Model A 需要“申请报销”入口（PR=CLOSED 可见）+ 跳转 WeCom + 最小状态跟踪 | 路由仅有 `/`, `/pr/:id`, `/pr/new`, `/contact-author`；后端无 reimbursement 相关接口 | 报销闭环未实现 | 高 |
| G12 | GAPC-05 | 安全基线：公开场地约束、明确规则、举报按钮 | 前端无举报入口页面；后端无举报接口；仅有联系作者入口 | 安全最小闭环未达标 | 高 |
| G13 | GAPC-04 | 指标埋点：PV、join 转化、成团率、确认率、到场率、14日复购 | 前端已新增 `shared/analytics/events.ts` + `track.ts` 并接入 create/join/exit/confirm/check-in/share；但后端无 ingest 落库与日聚合任务 | 指标体系仅完成前端采集起点，尚无法稳定产出 L1 指标 | 高 |
| G14 | GAPC-02 | “实时”人数变化信号 | `usePR` 无轮询/订阅；仅在本端 mutation 后 invalidate query | 跨端不具备实时性（近似“本端即时”） | 中 |
| G15 | GAPC-01 | 风险控制：0 join PR 可配置时长后自动隐藏 | 现有 PR 无 `hiddenAt/visibilityTTL` 等字段与任务 | 自动隐藏策略缺失 | 中 |
| G16 | GAPC-04 | Anchor 与 Community 分析管线分离 | 无 PR 分类字段 + 无指标埋点模块 | 无法做分线分析 | 中 |
| G17 | GAPC-01 | L2 预备：事件模板系统（type/capacity/booking/cost model） | 无 template 实体与模板管理接口 | 未做可复制运营抽象 | 中 |
| G18 | GAPC-03 | L2 预备：支付可扩展字段（`payment_model`、slot 级 `payment_status`） | `partner_requests`/`partners` 表均未预留相关字段 | 经济层扩展性不足 | 中 |
| G19 | GAPC-02 | L2 预备：可靠性评分（join→confirm、confirm→attend、release frequency） | 虽存储了 slot 行为，但无评分计算与持久化字段/任务 | 数据在，评分层未实现 | 中 |
| G20 | GAPC-03 | L2 预备：运营动作结构化日志（`operation_log`） | PR schema 无 `operation_log`，后端无 ops log 记录机制 | 后续迁移为运营后台风险高 | 中 |
| G21 | GAPC-04 | L2 预备：场景分类统计（type 频率、share→join、fill rate） | 无对应统计口径落库/任务 | 场景扩张依据不足 | 中 |

## 已有能力（避免误判为 GAP）

以下能力与 PRD 方向基本一致（或已部分对齐）：

- 双创建路径：自然语言与结构化创建（`/api/pr/natural_language`、`/api/pr`）。
- Slot 状态机基础：`JOINED/CONFIRMED/RELEASED/ATTENDED` 已落库。
- 加入时间窗口约束：`T-1h~T-30min` 自动确认、`T-30min` 后禁止加入。
- 可选签到基础能力：支持到场/未到场上报。
- 无全局广场/无推荐 feed：当前仅本地“我创建的 PR”列表。
