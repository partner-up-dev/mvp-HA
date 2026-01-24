# Backend Development Guidelines (Hono RPC + Drizzle)

## 1. 项目概览与架构原则

本项目是一个基于 Hono (Server) 和 Drizzle ORM (Database) 的后端服务。

架构上采用了经典的 分层架构 (Layered Architecture)，但在路由层适配了 Hono RPC 的类型推断机制。

### 核心技术栈

* Runtime: Node.js / Bun (根据项目配置)  
* Framework: Hono (v4+)  
* ORM: Drizzle ORM  
* Validation: Zod + @hono/zod-validator  
* Architecture: Controller -> Service -> Repository -> Entity

## 2. 目录结构规范

所有源代码位于 src 目录下，严格遵守以下分层：

src/  
├── entities/       # Drizzle Schema 定义 (对应数据库表)  
├── repositories/   # 数据访问层 (直接操作 DB)  
├── services/       # 业务逻辑层 (处理复杂逻辑，事务)  
├── controllers/    # 路由与 HTTP 处理层 (定义 Hono 路由，参数校验)  
├── types/          # 全局类型定义  
├── lib/            # 工具库 (DB 连接, 通用工具)  
└── index.ts        # 入口文件，聚合所有路由并导出 AppType

## 3. 开发规范详解

### 3.1 Entity Layer (src/entities)

* 定义 Drizzle Schema。  
* 使用 pgTable (PostgreSQL) 或对应数据库的定义函数。  
* 必须 导出 Zod Schema 以供 RPC 和前端使用（推荐使用 drizzle-zod）。

```ts
// src/entities/users.ts  
import { pgTable, serial, text } from 'drizzle-orm/pg-core';  
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const users = pgTable('users', {  
  id: serial('id').primaryKey(),  
  name: text('name').notNull(),  
  email: text('email').notNull().unique(),  
});

export const insertUserSchema = createInsertSchema(users);  
export type User = typeof users.$inferSelect;
```

### 3.2 Repository Layer (src/repositories)

* 职责：仅负责单纯的 CRUD 操作，不包含业务逻辑。  
* 输入/输出：接收 Entity 或部分字段，返回 Entity 或 null。  
* 命名：XxxRepository (Class 或 Module 均可，推荐 Class 配合依赖注入或单例)。

```ts
// src/repositories/UserRepository.ts  
import { db } from '../lib/db';  
import { users } from '../entities/users';  
import { eq } from 'drizzle-orm';

export class UserRepository {  
  async findById(id: number) {  
    const result = await db.select().from(users).where(eq(users.id, id));  
    return result[0] || null;  
  }  
}
```

### 3.3 Service Layer (src/services)

* 职责：处理业务规则、事务管理、数据加工。  
* 调用关系：调用一个或多个 Repository。  
* 错误处理：如果业务逻辑失败，抛出特定的 HTTPException 或应用层 Error。

```ts
// src/services/UserService.ts  
import { UserRepository } from '../repositories/UserRepository';  
import { HTTPException } from 'hono/http-exception';

const userRepo = new UserRepository();

export class UserService {  
  async getUserProfile(id: number) {  
    const user = await userRepo.findById(id);  
    if (!user) {  
      throw new HTTPException(404, { message: 'User not found' });  
    }  
    return user;  
  }  
}
```

### 3.4 Controller Layer (src/controllers) - CRITICAL FOR RPC

* 职责：定义路由路径、校验参数 (Zod)、调用 Service、返回 JSON。  
* Hono RPC 关键点：  
  * 必须使用 Hono 实例的 .route() 或链式调用。  
  * 必须 使用 @hono/zod-validator 显式定义输入类型，否则前端无法获得类型提示。  
  * 控制器文件应导出一个构建好的 Hono 实例（通常命名为 route 或 app）。

```ts
// src/controllers/user.controller.ts  
import { Hono } from 'hono';  
import { zValidator } from '@hono/zod-validator';  
import { z } from 'zod';  
import { UserService } from '../services/UserService';

const app = new Hono();  
const userService = new UserService();

// 定义路由变量，用于导出类型  
export const userRoute = app  
  .get(  
    '/:id',  
    zValidator('param', z.object({ id: z.coerce.number() })),  
    async (c) => {  
      const { id } = c.req.valid('param');  
      const user = await userService.getUserProfile(id);  
      return c.json(user);  
    }  
  )  
  .post(  
    '/',  
    zValidator('json', z.object({ name: z.string(), email: z.string() })),  
    async (c) => {  
      // Create logic...  
      return c.json({ success: true });  
    }  
  );
```

### 3.5 Entry Point (src/index.ts)

* 职责：聚合所有 Controller，导出 AppType。

```ts
// src/index.ts  
import { Hono } from 'hono';  
import { userRoute } from './controllers/user.controller';

const app = new Hono();

// 挂载路由  
const routes = app.route('/api/users', userRoute);  
// .route('/api/posts', postRoute) ...

export default app;

// 导出供前端使用的 RPC 类型 
export type AppType = typeof routes;
```

## 4. 最佳实践检查清单

1. Strict Typing: 任何 c.req.param 或 c.req.json 必须通过 zValidator 验证。  
2. No Logic in Controllers: Controller 只负责 HTTP 协议转换，逻辑全部下沉到 Service。  
3. JSON Response: 所有的返回必须使用 c.json()，确保 RPC 能够推断返回类型。  
4. Error Handling: 使用全局 app.onError 捕获异常，确保返回格式统一。
