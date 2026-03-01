# 搭子请求过期（Expire PartnerRequest）

## 目标

当搭子请求的时间窗口结束后，自动将状态从 `OPEN` / `READY` / `FULL` / `LOCKED_TO_START` / `ACTIVE` 变为 `EXPIRED`，避免过期请求继续被加入或传播。

## 规则

- 只对 `OPEN` / `READY` / `FULL` / `LOCKED_TO_START` / `ACTIVE` 状态的请求做过期判断。
- 过期时间取时间窗口的 `end_at`。
- 若 `end_at` 为空且 `start_at` 存在，则默认 `end_at = start_at + 12h`。
- 若 `start_at` / `end_at` 都为空，则不自动过期。
- 过期判定为懒触发：仅在读取 PR 时检查并更新状态，无后台定时任务。

## 数据来源与存储

- 过期判定基于时间窗口 `time` 字段（`[start_at, end_at]`）。
- 不再使用单独的 `expiresAt` 字段或数据库列。

## 触发点

- `GET /api/pr/:id`：读取时进行过期判断。
- 其他读取场景（如分享生成、批量读取）依赖该接口或同一服务逻辑。

## 例子

- `time = ["2026-02-08T09:00:00.000Z", "2026-02-08T12:00:00.000Z"]`
 	- 过期时间为 `2026-02-08T12:00:00.000Z`。
- `time = ["2026-02-08T09:00:00.000Z", null]`
 	- 过期时间为 `2026-02-08T21:00:00.000Z`。
- `time = [null, null]`
 	- 不自动过期。
