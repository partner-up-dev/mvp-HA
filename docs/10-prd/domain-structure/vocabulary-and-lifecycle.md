# 词汇与生命周期

## 核心词汇

- H-A MVP：协作效率产品假设的最小验证版本。
- 协作触发器：嵌入对话与行为中的轻量协作承载方式。
- PartnerRequest（搭子请求）：一次性协作单元，可被加入并自然结束。
- Community PR：社区场景搭子请求，对外页面为 `/cpr/:id`。
- Anchor PR：活动锚点场景搭子请求，对外页面为 `/apr/:id`，可扩展到 `/apr/:id/booking-support`。
- Partner：Community PR 与 Anchor PR 共用的参与槽位机制。
- User PIN：本地轻身份的 4 位数字 PIN，用于创建者所有权校验与会话恢复。

## 关键辅助词汇

- PartnerRequestStatus：搭子请求生命周期状态集合。
- Time Window：搭子请求的开始/结束时间语义。
- Capacity：最小/最大人数阈值。
- Confirmation Window：Anchor PR 特有的确认时序窗口。
- Check-in Signal：Anchor PR 活动后的签到与回流信号。
- UserNotificationOpts：围绕剩余发送次数建模的用户通知偏好。
- Booking Support：Anchor PR 相关的预订与资助说明领域。
- POI：活动地点与图库语义载体。

## PartnerRequest 生命周期

1. 发起意图出现
2. 形成 `DRAFT`（Community PR 用户路径）
3. 发布并进入可加入状态
4. 随人数阈值、时间窗口和场景规则流转
5. 自然结束、关闭或过期

Anchor PR 在此基础上额外经过：

- 确认窗口
- 提醒与新搭子通知
- 签到回流

## 用户关系生命周期

1. 匿名浏览
2. 本地账户创建或恢复
3. authenticated 会话建立
4. 可选绑定微信 openid
5. 在需要更强可信度的场景中参与 Anchor 流程

## 参与槽位生命周期

1. 槽位可加入
2. 用户加入后进入活跃状态
3. Anchor 场景可进一步确认
4. 可退出、被释放、或签到完成
5. 不再活跃时不应继续被视为当前参与者
