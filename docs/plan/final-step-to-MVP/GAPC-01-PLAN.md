# GAPC-01 PLAN：供给扩展引擎（Anchor Batching + Template + Auto-hide）

对应 GAP：`G07`、`G15`、`G17`  
依赖：`INFRA-PLAN.md`（事件总线、领域拆分）

> **部署约束**：后端部署在 scale-to-0 serverless 环境中，**禁止使用定时任务（setInterval / cron / JobRunner 周期扫描）**。所有需要时效性检查的逻辑（如过期 PR、低质量 PR 自动隐藏）均通过 **fire-and-forget**（在读取接口中触发，不阻塞响应）实现。

## 概念层级（对齐 PRD 6.2）

- **Anchor Event**：锁定活动类型（羽毛球、KTV、跑步…），提供一组可用的地点池和时间窗口池。
- **Anchor Event Batch**：锁定某个时间窗口；在该时间窗口内，可开设多个不同地点的 PR。Batch 满 = 该时间窗口下所有地点均已占满。
- **Anchor PR**：锁定地点 + 时间窗口，是用户最终加入的具体搭子请求。

关系：

```text
Anchor Event (type)
├── Batch (time window A)
│   ├── PR (location X)
│   └── PR (location Y)
├── Batch (time window B)
│   └── PR (location X)
└── ...
```

## 目标

1. 把 Anchor Event 从"单条 PR"升级为"Event → Batch → PR"三层供给单元。
2. Anchor PR 满员后可自动在同一批次下开新 PR（不同地点）；并建议用户查看同地点的其它时间窗口（不同批次）。
3. 当 Anchor Event 全部耗尽（无可用时间窗口 × 地点）时，引导用户关注公众号等待通知，或浏览其它类型活动。
4. 对 0 join 且过时的低质量供给自动隐藏，降低负反馈。

## 方案范围

后端：

1. 新增实体：
   - `anchor_event_templates`
   - `anchor_events`（含 `type`、location pool、time window pool）
   - `anchor_event_batches`（含 `anchorEventId`、`timeWindow`）
2. `partner_requests` 增加关联字段：
   - `prKind` (`ANCHOR`/`COMMUNITY`)
   - `anchorEventId`、`batchId`
   - `location`（从 Anchor Event 的 location pool 中选定）
   - `visibilityStatus` (`VISIBLE`/`HIDDEN`)
   - `autoHideAt`
3. 新增 Anchor PR 自动扩容服务：
   - 当 Anchor PR FULL 时，自动在**同一 Batch**（同时间窗口）下创建新 PR，分配不同可用地点。
   - 幂等保护，防止并发下重复创建。
4. 新增候选批次推荐查询：
   - 查询同地点（或附近地点）的**不同时间窗口批次**。
   - 若用户接受推荐：自动创建新 Batch（若不存在）→ 创建新 Anchor PR → 用户自动加入。
5. 新增 Anchor Event 耗尽检测：
   - 当所有 time window × location 组合均已占满时，标记事件为耗尽状态。
   - 返回引导信息：关注公众号获取通知 / 浏览 Event Plaza。
6. 低质量 PR 自动隐藏（fire-and-forget）：
   - **不使用定时任务**。在获取 PR 列表的接口中，对返回的 PR 做 fire-and-forget 检查：若 `0 join` 且已超过 `autoHideAt`，则异步更新 `visibilityStatus=HIDDEN`。
   - 下次查询时自然过滤掉已隐藏的 PR。

前端：

1. **Event Plaza Page**（`/events`）：
   - 展示所有 Anchor Event 列表（按类型分类）。
   - 每个卡片展示活动类型、可用场次数量、状态摘要。
2. **Anchor Event Page**（`/events/:eventId`）：
   - 展示单个 Anchor Event 下的所有 Anchor PR。
   - 按 Batch（时间窗口）分 Tab 组织，每个 Tab 显示该时间窗口下的 PR 列表。
   - Anchor Event 耗尽时展示引导（公众号订阅 + 返回 Event Plaza）。
3. PR 页满员后展示：
   - "同一时段其它场地"区域（Option B，同 Batch 下自动新建的 PR）。
   - "其它时段推荐"区域（Option C，不同 Batch 的候选）。
4. 列表页过滤 `visibilityStatus=HIDDEN`。
5. 管理视图保留"已隐藏"检索（仅内部调试入口，MVP 可简化）。

## 分阶段实施

### Phase 1：数据建模与迁移

1. 建立 Event → Batch → PR 三层表结构（含 location pool / time window pool）。
2. 迁移现有 Anchor 样例到新模型（MVP 可一次性重灌）。
3. 为 PR 增加 `prKind/anchorEventId/batchId/visibilityStatus/autoHideAt`。

### Phase 2：Anchor PR 自动扩容

1. 实现"当前 Anchor PR FULL 时，在同一 Batch 下自动创建新 PR（不同地点）"。
2. 追加幂等保护，防止并发下重复创建。
3. 前端展示"同一时段其它场地"入口。

### Phase 3：候选批次推荐 + 耗尽引导

1. 实现候选批次推荐 API（同地点 / 附近地点，不同时间窗口）。
2. 实现"用户接受推荐 → 创建 Batch → 创建 PR → 自动加入"一键流程。
3. 实现 Anchor Event 耗尽检测与引导（公众号订阅 + Event Plaza）。
4. 前端展示"其它时段推荐"区域与耗尽引导 UI。

### Phase 4：低质量供给治理

1. 实现 `autoHideAt` 计算规则（按 PR 类型可配置）。
2. 在获取 PR 列表的接口中实现 fire-and-forget 自动隐藏检查（非定时任务）。
3. 前端默认隐藏低质量 PR。

## 验收标准

1. Anchor Event 可稳定生成多层级 PR（Event → Batch → PR），批次与 PR 编号连续。
2. 当 Anchor PR 满员后，系统自动在同一 Batch 下创建新 PR（不同地点），前端可见"同一时段其它场地"入口。
3. 用户查看满员 PR 时，可看到"其它时段推荐"入口；接受推荐后自动创建 Batch + PR 并加入。
4. 当 Anchor Event 全部耗尽，前端展示公众号订阅引导与 Event Plaza 入口。
5. 0 join PR 到达配置时长后通过 fire-and-forget 自动隐藏，不再出现在默认列表（无定时任务依赖）。
6. 所有批次与 PR 自动创建动作有结构化事件记录（对接 `INFRA` 事件总线）。
7. Event Plaza 页面可展示所有 Anchor Event 列表。
8. Anchor Event 页面按 Batch（时间窗口）分 Tab 展示 PR。

## 风险与决策

1. 不做向后兼容：允许迁移时重建历史 Anchor 数据。
2. 推荐策略先走规则引擎（type + time window + location proximity），不引入算法模型。
3. "用户接受推荐 → 自动创建 Batch + PR + 加入"需原子化处理，失败时整体回滚。
