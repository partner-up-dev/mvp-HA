# GAPC-01 PLAN：供给扩展引擎（Anchor Batching + Template + Auto-hide）

对应 GAP：`G07`、`G15`、`G17`  
依赖：`INFRA-PLAN.md`（事件总线、任务执行器、领域拆分）

## 目标

1. 把 Anchor Event 从“单条 PR”升级为“模板驱动 + 批次驱动”的供给单元。
2. 满员后可自动开新批次，并给出同类型异地候选。
3. 对 0 join 且过时的低质量供给自动隐藏，降低负反馈。

## 方案范围

后端：

1. 新增实体：
   - `anchor_event_templates`
   - `anchor_events`
   - `anchor_event_batches`
2. `partner_requests` 增加关联字段：
   - `prKind` (`ANCHOR`/`COMMUNITY`)
   - `anchorEventId`、`batchId`
   - `visibilityStatus` (`VISIBLE`/`HIDDEN`)
   - `autoHideAt`
3. 新增批次服务：
   - 批次满员自动创建下一批
   - 同类型异地推荐查询
4. 新增自动隐藏任务：
   - 定时扫描 `0 join` 且超时 PR，更新 `visibilityStatus=HIDDEN`

前端：

1. PR 页新增“附近同类场次”区域（仅 Anchor）。
2. 列表页过滤 `visibilityStatus=HIDDEN`。
3. 管理视图保留“已隐藏”检索（仅内部调试入口，MVP 可简化）。

## 分阶段实施

### Phase 1：数据建模与迁移

1. 建立模板、事件、批次三层表结构。
2. 迁移现有 Anchor 样例到新模型（MVP 可一次性重灌）。
3. 为 PR 增加 `prKind/anchorEventId/batchId/visibilityStatus/autoHideAt`。

### Phase 2：批次自动化

1. 实现“当前批次 FULL 时自动开下一批”。
2. 实现同类型异地推荐 API。
3. 追加幂等保护，防止并发下重复开批。

### Phase 3：低质量供给治理

1. 实现 `autoHideAt` 计算规则（按 PR 类型可配置）。
2. 上线自动隐藏后台任务。
3. 前端默认隐藏低质量 PR。

## 验收标准

1. Anchor Event 可稳定生成多批次 PR，批次编号连续。
2. 当批次满员后，页面可看到“同类异地”或“下一批”入口。
3. 0 join PR 到达配置时长后自动隐藏，不再出现在默认列表。
4. 所有批次动作有结构化事件记录（对接 `INFRA` 事件总线）。

## 风险与决策

1. 不做向后兼容：允许迁移时重建历史 Anchor 数据。
2. 推荐策略先走规则引擎（type + time window + distance），不引入算法模型。
