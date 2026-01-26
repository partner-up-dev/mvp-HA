import { useQuery } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';
import type { Ref } from 'vue';
import type { PRId } from '@partner-up-dev/backend';

export const usePR = (id: Ref<PRId | null>) => {
  return useQuery({
    queryKey: ['partner-request', id],
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error('Missing partner request id');
      }

      const res = await client.api.pr[':id'].$get({
        param: { id: prId.toString() },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch request');
      }

      return await res.json();
    },
    enabled: () => id.value !== null,
  });
};
