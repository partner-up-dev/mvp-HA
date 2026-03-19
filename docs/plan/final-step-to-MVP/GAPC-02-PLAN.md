# GAPC-02 PLAN：可靠性与触达（JobRunner + Polling + 公众号提醒）

对应 GAP：`G04`、`G14`、`G19`  
依赖：`INFRA-PLAN.md`（INFRA-02 已完成，INFRA-03 需扩展删除待执行任务能力）

## 本次调整结论

1. JobRunner 在现有能力（延迟执行、租约、重试、dedupe、外部 tick + request-tail 补偿）基础上，需新增“删除待执行任务”能力，承载提醒任务全生命周期（创建/删除/执行）。
2. PRD 5.2 明确要求“可选订阅公众号通知”，L1 必须在 GAPC-02 内补齐通知通道，不再后置。
3. 可靠性数据仍不新增 `user_reliability_scores`，继续收敛到 `users`。
4. 公众号提醒订阅偏好先做 `users` 级别内聚；提醒履约使用独立 `notification_deliveries` 表，不与 `operation_logs` 混用。
5. 实时人数信号继续采用 PR 详情页 1s 轮询（每轮最多 20 次，用户动作后重置），不做 SSE。

## 范围

后端：

1. 保持 `users` 可靠性字段聚合：
   - `reliability_join_count`
   - `reliability_confirm_count`
   - `reliability_attend_count`
   - `reliability_release_count`
   - `join_to_confirm_ratio`
   - `confirm_to_attend_ratio`
   - `release_frequency`
2. 在 `join / confirm / check-in / exit / T-1h 自动释放` 路径持续更新上述指标。
3. 新增公众号提醒订阅偏好（用户级）：
   - `wechatReminderOptIn`（boolean，默认 `false`）
   - `wechatReminderOptInAt`（timestamp，可空）
4. 新增提醒订阅接口（需微信登录态）：
   - `GET /api/wechat/reminders/subscription`（查询当前用户提醒开关）
   - `POST /api/wechat/reminders/subscription`（开启/关闭提醒）
5. 提醒任务编排（JobRunner）：
   - 在用户加入后（仍处于可提醒时窗）调度 T-24h / T-2h 任务；
   - 使用 `dedupeKey` 防止重复插入；
   - 用户退出/槽位释放/关闭提醒时，删除对应待执行任务（仅 `PENDING/RETRY`）；
   - 任务执行时二次校验 `PR` 与 slot 状态（已退出/已释放/活动已失效则跳过发送）。
6. 新增公众号发送通道（模板消息）：
   - 基于公众号 access token 调用模板消息发送接口；
   - 新增模板 ID 环境变量（确认提醒模板）；
   - 失败重试由 JobRunner 承担，最终失败写错误日志。
7. JobRunner 新增删除能力：
   - 提供按 `jobType + dedupeKey`（或等价唯一键）删除待执行任务的能力；
   - 删除范围限定为 `PENDING/RETRY`，不影响已执行完成和运行中任务；
   - 返回删除数量用于业务侧断言与监控。
8. 提醒发送结果记录：
   - 新增 `notification_deliveries` 表（独立于 `operation_logs`）；
   - 记录 `prId/userId/reminderType(T-24h|T-2h)/scheduledAt/sentAt/result/errorCode/errorMessage/jobId`。

前端：

1. PR 详情页新增“公众号提醒”开关（仅微信内 + 已登录可操作）。
2. 非微信环境或未登录时展示降级提示（需在微信内登录后开启）。
3. 保持现有 1s 轮询策略：
   - 单轮最多 20 次自动停止；
   - 加入/退出/确认/签到成功后重置轮询并重新开始。

## 分阶段实施

### Phase 1：订阅偏好与接口

1. `users` 增加 `wechatReminderOptIn` / `wechatReminderOptInAt` 字段与迁移。
2. 落地订阅开关查询/更新 API（鉴权复用现有微信会话）。
3. 前端接入订阅开关与状态展示。

### Phase 2：提醒任务与发送通道

1. 在加入路径接入 T-24h / T-2h 任务调度（含 dedupeKey）。
2. 在退出/自动释放/关闭提醒路径接入待执行任务删除（调用 JobRunner 删除能力）。
3. 注册 JobRunner handler，执行模板消息发送与状态二次校验。
4. 增加 `notification_deliveries` 记录发送结果。

### Phase 3：稳定性与可观测

1. 失败重试与错误码分类（未关注公众号、模板参数错误、token 失效等）。
2. 补齐提醒链路测试（调度、跳过、重试、最终失败）。
3. 输出最小运营核对口径（发送成功率、失败原因 TopN）。

## 实施状态（更新后）

1. 已完成：`users` 可靠性字段落库（schema + migration）。
2. 已完成：可靠性指标写入接入关键动作路径（含自动释放）。
3. 已完成：PR 详情页轮询策略替换（1s、20 次上限、动作后重置）。
4. 已完成：公众号提醒订阅偏好字段与 API。
5. 已完成：JobRunner “删除待执行任务”能力（按 jobType + dedupeKey）。
6. 已完成：T-24h / T-2h 任务调度、删除与公众号模板消息发送 handler。
7. 已完成：`notification_deliveries` 表落库与查询口径，并在前端提供订阅开关交互。

## 验收标准

1. 不存在 `user_reliability_scores` 表，可靠性指标可直接从 `users` 查询。
2. PR 详情页打开后会开始轮询；达到 20 次后停止；执行加入/退出/确认/签到后会重新开始轮询。
3. 用户可在 PR 详情页开启/关闭“公众号提醒”，并可查询当前开关状态。
4. 对“已开启提醒 + 已加入且未失效”的用户，系统可创建 T-24h / T-2h 延迟任务（具备 dedupe 防重）。
5. 对退出/自动释放/关闭提醒的用户，系统会删除尚未执行的提醒任务（`PENDING/RETRY`），且可返回删除计数。
6. 任务执行时会调用公众号模板消息发送；成功/失败均写入 `notification_deliveries`。
7. 对极端并发下未被及时删除的任务，执行时二次校验会安全跳过，不产生无效触达。

## 风险与决策

1. H5 侧无法保证用户已关注公众号，发送可能因“未关注”失败；L1 先记录失败并在前端提示用户重新关注/开启。
2. scale-to-0 下任务触发存在分钟级抖动；提醒定义为“准点附近触达”，通过 JobRunner tolerance 吸收抖动。
3. 删除能力仅覆盖 `PENDING/RETRY`，对已 `RUNNING` 的任务仍需依赖执行时二次校验保障幂等与安全。
4. `notification_deliveries` 会引入额外存储与治理成本，需要同步定义清理策略与最小索引集。
