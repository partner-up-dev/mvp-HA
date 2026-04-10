# Entity Layer Guidelines

## Overview

- Define Drizzle schema.
- Use `pgTable` (or the matching database definition helper) for persistence structure.
- Export Zod schema for RPC and frontend reuse when the boundary contract needs it. `drizzle-zod` is the preferred path when it fits.

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
