# Repository Layer Guidelines

## Responsibilities

- 职责：仅负责单纯的 CRUD 操作，不包含业务逻辑。  
- 输入/输出：接收 Entity 或部分字段，返回 Entity 或 null。  
- 命名：XxxRepository (Class 或 Module 均可，推荐 Class 配合依赖注入或单例)。

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
