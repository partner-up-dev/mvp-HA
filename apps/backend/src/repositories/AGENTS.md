# Repository Layer Guidelines

## Responsibilities

- Repositories own plain CRUD behavior only and must not contain business logic.
- Input and output should stay close to entity or persistence-shape semantics.
- Name repositories explicitly, for example `XxxRepository`. Class or module style is acceptable, but the API should stay narrow and persistence-focused.

## Example

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
