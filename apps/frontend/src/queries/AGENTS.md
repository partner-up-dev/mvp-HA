# AGENTS.md for Frontend Queries

This directory contains Vue Query hooks for data fetching and mutations.

## Data Fetching Norms (Vue Query Integration)

### Core Principles

* Do not call `client.api...` directly in components for data fetching (Mutations are excepted, but hooks are recommended).
* Must use `useQuery` or `useMutation` to wrap API calls.
* Query Keys must be managed uniformly, following the array format `['resource', 'id', params]`.

### Query Example (Reading Data)

All API requests should be encapsulated in Composables (Hooks).

```ts
// src/queries/useUser.ts
import { useQuery } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';

export const useUser = (id: number) => {
  return useQuery({
    queryKey: ['users', id], // Reactive Key
    queryFn: async () => {
      // Hono RPC Call
      const res = await client.api.users[':id'].$get({
        param: { id: id.toString() }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }

      // Automatic type inference
      return await res.json();
    },
    enabled: !!id, // Only request when id exists
  });
};
```

### Mutation Example (Modifying Data)

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
      // Invalidate user list cache, trigger re-render
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};
```
