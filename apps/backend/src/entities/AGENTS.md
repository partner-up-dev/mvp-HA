# Entity Layer Guidelines

## Overview

- 定义 Drizzle Schema。  
- 使用 pgTable (PostgreSQL) 或对应数据库的定义函数。  
- 必须 导出 Zod Schema 以供 RPC 和前端使用（推荐使用 drizzle-zod）。

## Example

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
