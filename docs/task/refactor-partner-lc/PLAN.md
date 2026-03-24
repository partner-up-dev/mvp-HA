# Partner 生命周期模型重构计划（PLAN）

## 背景与目标

当前实现中，`RELEASED` 槽位可被后续用户复用（通过覆盖 `userId`），导致：

- 历史参与关系不稳定（用户是否“曾参与并被释放”会丢失）
- 生命周期语义混杂（slot 复用与用户状态复用耦合）
- 状态判定复杂度高（`PENDING` / `userId = null` 语义不直观）

本次重构目标：

1. **Join 一律创建新的 partner 行**，状态为 `JOINED`
2. **Exit / Release 仅更新该行状态**（如 `EXITED` / `RELEASED`）
3. **partner.user_id 永远非空**（移除 `PENDING` 及 `user_id = null` 语义）
4. 统一“当前有效参与人数”口径，持续通过 PR service 单一方法输出

---

## 设计原则

- **Append-only 生命周期**：参与记录是历史事实，不做“换人覆盖”
- **状态与容量解耦**：容量由“active rows”统计，不依赖可复用槽位
- **服务层单一口径**：Fetch APR、Fetch Event Batch PR List、Admin 视图都走同一计数/派生逻辑
- **先兼容、后收敛**：分阶段迁移，最后再收紧 DB 约束（`NOT NULL`）

---

## 生命周期模型（目标态）

### 状态建议

- Active: `JOINED`, `CONFIRMED`, `ATTENDED`
- Inactive: `EXITED`, `RELEASED`

> `PENDING` 移除；`user_id` 不再允许空值。

### 状态流转

- Join: 创建新行 `JOINED`
- Confirm: `JOINED -> CONFIRMED`
- Check-in: `CONFIRMED -> ATTENDED`
- Exit: `JOINED|CONFIRMED -> EXITED`
- Release: `JOINED|CONFIRMED -> RELEASED`

不再存在“把 RELEASED 行重新 assign 给新用户”的路径。

---

## 分阶段实施计划

### Phase 1：统一服务口径并冻结契约

- 在 PR service/slot-management 中明确并复用唯一人数方法（active-only）
- 清点并替换所有绕过此方法的调用点：
  - Fetch APR detail
  - Fetch Event Batch PR List
  - Admin Anchor workspace/list
- 明确 API 语义文档：`partnerCount` 仅统计 active 状态

**产出**

- 服务层单一计数入口（已在当前修复 PR 奠定基础）
- 调用点清单与替换完成记录

### Phase 2：移除“释放槽位复用”能力

- 停用/删除 `findFirstReleasedSlot`、`assignSlot` 这类复用路径
- Join use case 改为“永远新增 partner row”
- 校验重复加入规则（同一用户同一 PR 下是否允许二次加入）并显式定义

**产出**

- Join 行为可预测：无覆盖写
- RELEASED 历史记录可追溯

### Phase 3：容量与可加入判断改造

- 将“可加入”判断统一为：`activeCount < maxPartners`
- 所有容量判断逻辑改为基于 active rows
- 清理依赖“空槽位存在”的分支逻辑

**产出**

- 容量模型与生命周期模型一致

### Phase 4：关联业务逻辑迁移

梳理并改造与 partner 行 identity 强耦合的逻辑：

- booking 触发/锁定
- contact exchange
- reminder 绑定与取消
- temporal refresh 自动状态机

统一策略：依赖“用户最近的 active participation”或明确的状态筛选，不依赖可复用 slot id。

**产出**

- 下游流程不再受 slot 复用语义影响

### Phase 5：数据库迁移与约束收敛

- 数据清理脚本：处理历史 `user_id IS NULL` 行
- 增加/调整索引与约束，最终收敛到：
  - `partner.user_id NOT NULL`
  - 必要的唯一性/查询性能索引（按 `pr_id`,`user_id`,`status` 等）

**产出**

- 模型层面对目标语义强约束

### Phase 6：前后端视图与交互对齐

- `slotState`/viewer state 语义与新模型一致
- `RELEASED` 展示从“可能瞬时丢失”变为“基于历史记录可稳定判定”
- 文案和状态提示更新（必要时补充 i18n）

**产出**

- 用户可稳定感知“曾被释放”与“从未加入”差异

---

## 兼容性与风险

1. **历史数据风险**：旧数据存在 `user_id = null`
   - 通过迁移脚本分批修复，再上 `NOT NULL`

2. **行为变化风险**：原有“释放后复用槽位”不再可用
   - 需要覆盖回归：满员后释放、重新加入、人数统计、详情展示

3. **下游耦合风险**：booking/reminder/contact 可能隐式依赖旧 slot identity
   - 迁移前先做调用点审计与契约测试

---

## 验收标准（DoD）

- Join 始终新增 partner row，且 `user_id` 非空
- Exit/Release 仅更新状态，不覆盖他人历史记录
- 所有 partnerCount 均由统一服务方法产出，且只统计 active
- 关键查询与流程不再依赖“released slot 复用”
- DB 约束收敛为 `user_id NOT NULL` 并通过构建验证

---

## 预估实施顺序（建议）

1. Phase 1（统一口径）
2. Phase 2（停止复用）+ Phase 3（容量改造）
3. Phase 4（下游迁移）
4. Phase 5（DB 收敛）
5. Phase 6（前端态与文案收口）

