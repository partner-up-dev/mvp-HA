# PartnerUp Cold Start Minimal PRD Gap (Code Snapshot: 2026-02-25)

## 已实现基线（代码确认）
- PR 创建双路径：自然语言 + 结构化（`apps/backend/src/controllers/partner-request.controller.ts`）。
- 基础状态与流转：`DRAFT/OPEN/ACTIVE/CLOSED/EXPIRED`，并支持 join/exit（`apps/backend/src/services/PartnerRequestService.ts`）。
- 分享链路：链接分享、微信卡片、小红书文案/海报（前后端 share 相关文件）。
- 联系作者入口与公共配置读取（`/contact-author` + `/api/config/public/:key`）。

## 主要 GAP（相对 `docs/plan/final-step-to-MVP/partner-up-h5-cold-start_prd_minimal.md`）

### P0（核心机制未落地）
- 状态机不一致：PRD 需要 `READY/FULL` 语义；当前仍是 `ACTIVE`，且状态枚举无 `READY/FULL`（`entities/partner-request.ts`、`PRStatusBadge.vue`）。
- 缺少 Slot 状态层：PRD 要求 `JOINED/CONFIRMED/RELEASED/ATTENDED`；当前仅有 `partners=[min,current,max]` 聚合计数，无参与者级别记录。
- Anchor PR 登录约束未落地：PRD 要求 Anchor 参与必须 OpenID 绑定；当前虽已有 `/api/wechat/oauth/*` 会话能力，但尚未与 join/confirm 等业务鉴权绑定，无法执行 Anchor 强制规则。
- 确认与释放机制缺失：无 T-24h/T-2h 提醒、T-1h 未确认释放、T-30min 锁定逻辑。
- Check-in/到场回传缺失：无现场签到或事后“是否参加/是否愿再来”数据结构与 API。
- Anchor Event + Batch 能力缺失：无 Anchor Event 实体、无批次扩容/同类异地推荐模型。
- 经济模型缺失：无 `payment_model`、`discount_rate`、`subsidy_cap`、`resource_booking_deadline` 等字段与页面展示。
- 报销最小闭环缺失：无 slot 级 `reimbursement_*` 字段、无“申请报销”入口与状态追踪。

### P1（L1 稳定性与 L2 预埋不足）
- 安全基线不完整：无“举报”入口/表单；无“公共场地限制”规则约束与提示。
- 指标埋点缺失：未见 PV、join 转化、min 达成率、确认率、到场率、14 天复参与等埋点/统计通路。
- 运维结构化日志缺失：未见 PR 级 `operation_log` 抽象（仅常规服务日志）。

## 简短结论
当前代码更接近“可创建/可分享/可加入的 PR MVP”，尚未进入 PRD 定义的“Anchor 密度实验 + 可靠性控制 + 经济层最小闭环”阶段。下一步应先补齐 `READY/FULL + Slot 状态 + 登录确认/释放` 三件套，再推进经济模型与报销链路。

## 拆分展开
- Frontend 详版：`docs/plan/final-step-to-MVP/frontend-gap.md`
- Backend 详版：`docs/plan/final-step-to-MVP/backend-gap.md`
