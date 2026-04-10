# AGENTS.md for Controllers

- 职责：定义路由路径、校验输入（Zod / `@hono/zod-validator`）、调用 domain use-case 或受控兼容 facade、返回 JSON。
- 控制器只做 HTTP / 协议转换，不拥有业务规则。
- 新的业务动作优先调用 `src/domains/*/use-cases/*`，不要把 controller 重新变成 service-centric 入口。
- Hono RPC 关键点：
  - 必须使用 Hono 实例的 `.route()` 或链式调用。
  - 必须显式定义输入类型，否则前端无法获得稳定的类型提示。
  - 控制器文件应导出一个构建好的 Hono 实例（通常命名为 `route` 或 `app`）。
- [Canonical File](./canonical.controller.ts)
