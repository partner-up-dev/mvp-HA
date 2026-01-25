# AGENTS.md for Controllers

- 职责：定义路由路径、校验参数 (Zod)、调用 Service、返回 JSON。  
- Hono RPC 关键点：  
  - 必须使用 Hono 实例的 `.route()` 或链式调用。  
  - 必须 使用 `@hono/zod-validator` 显式定义输入类型，否则前端无法获得类型提示。  
  - 控制器文件应导出一个构建好的 Hono 实例（通常命名为 route 或 app）。
- [Canonical File](./canonical.controller.ts)
