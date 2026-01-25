import { useQuery } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';
import type { Ref } from 'vue';

export const usePR = (id: Ref<string>) => {
  return useQuery({
    queryKey: ['partner-request', id],
    queryFn: async () => {
      const res = await client.api.pr[':id'].$get({
        param: { id: id.value },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch request');
      }

      return await res.json();
    },
    enabled: () => !!id.value,
  });
};
