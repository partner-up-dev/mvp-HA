# AGENTS.md of PartnerUp MVP-HA's frontend

> Vue 3 + Hono RPC

## 1. 项目概览与架构

本项目是一个基于 Vue 3 的前端应用，使用 Hono RPC Client 与后端通信，并利用 TanStack Vue Query 进行服务端状态管理。

### 核心技术栈

* Framework: Vue 3 (Script Setup)  
* API Client: Hono RPC Client (hc)  
* Async State: TanStack Vue Query (v5)  
* Language: TypeScript (Strict Mode)

## 2. RPC Client 配置 (src/lib/rpc.ts)

我们不使用传统的 axios 或 fetch 手动封装。必须通过后端导出的 AppType 创建类型安全的客户端。

```ts
// src/lib/rpc.ts  
import { hc } from 'hono/client';  
// 假设这是 monorepo 内部引用，或者相对路径引用  
import type { AppType } from '@packages/backend';

const API_URL = import.meta.env.VITE_API_URL || '<http://localhost:3000>';

// 创建强类型客户端  
export const client = hc<AppType>(API_URL);
```

## 3. Data Fetching 规范 (Vue Query Integration)

### 3.1 核心原则

* 禁止 在组件内直接调用 client.api... 进行数据获取（Mutations 除外，但推荐用 hook）。  
* 必须 使用 useQuery 或 useMutation 封装 API 调用。  
* Query Keys 必须统一管理，遵循 ['resource', 'id', params] 的数组格式。

### 3.2 Query 示例 (读取数据)

所有的 API 请求应该封装在 Composables (Hooks) 中。

```ts
// src/queries/useUser.ts  
import { useQuery } from '@tanstack/vue-query';  
import { client } from '@/lib/rpc';

export const useUser = (id: number) => {  
  return useQuery({  
    queryKey: ['users', id], // 响应式 Key  
    queryFn: async () => {  
      // Hono RPC 调用  
      const res = await client.api.users[':id'].$get({  
        param: { id: id.toString() }  
      });  

      if (!res.ok) {  
        throw new Error('Failed to fetch user');  
      }  
        
      // 自动获得类型推断  
      return await res.json();  
    },  
    enabled: !!id, // 只有 id 存在时才请求  
  });  
};
```

### 3.3 Mutation 示例 (修改数据)

```ts
// src/queries/useCreateUser.ts  
import { useMutation, useQueryClient } from '@tanstack/vue-query';  
import { client } from '@/lib/rpc';

export const useCreateUser = () => {  
  const queryClient = useQueryClient();

  return useMutation({  
    mutationFn: async (newUser: { name: string; email: string }) => {  
      const res = await client.api.users.$post({  
        json: newUser  
      });  

      if (!res.ok) throw new Error('Creation failed');  
      return await res.json();  
    },  
    onSuccess: () => {  
      // 使得用户列表缓存失效，触发重绘  
      queryClient.invalidateQueries({ queryKey: ['users'] });  
    }  
  });  
};
```

## 4. 组件开发规范

### 4.1 Script Setup

始终使用 `<script setup lang="ts">`。

### 4.2 使用 RPC 数据

在组件中解构 Vue Query 的返回值（data, isLoading, error）。

```vue
<template>  
  <div v-if="isLoading">Loading...</div>  
  <div v-else-if="error">Error: {{ error.message }}</div>  
  <div v-else-if="user">  
    <h1>{{ user.name }}</h1> <!-- 这里会有自动补全 -->  
    <p>{{ user.email }}</p>  
  </div>  
</template>

<script setup lang="ts">  
import { useUser } from '@/queries/useUser';  
import { useRoute } from 'vue-router';

const route = useRoute();  
// 假设路由参数 id  
const { data: user, isLoading, error } = useUser(Number(route.params.id));  
</script>
```

## 5. 类型安全注意事项

1. RPC Infer Type: 不要手动定义 API 返回的 Interface，应该让 TypeScript 根据 Hono Client 自动推断。  
2. Request Params: 如果后端使用了 zValidator，前端在调用 client.api... 时如果参数类型不匹配（例如传了 string 给 number），IDE 会直接报错，请不要使用 as any 绕过。

## 6. Monorepo 依赖说明

由于没有 packages/contract，前端需要在 package.json 中把后端包作为 devDependencies 引入（如果是在同一 workspace 下），或者通过 TS Path Alias 引用，以确保 import type { AppType } 生效。

```json
// packages/frontend/package.json  
{  
  "devDependencies": {  
    "@my-project/backend": "workspace:*"  
  }  
}  
```
