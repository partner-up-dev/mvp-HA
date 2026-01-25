# Service Layer Guidelines

## Responsibilities

- 职责：处理业务规则、事务管理、数据加工。  
- 调用关系：调用一个或多个 Repository。  
- 错误处理：如果业务逻辑失败，抛出特定的 HTTPException 或应用层 Error。

## Example

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
