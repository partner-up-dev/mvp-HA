import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { PRId } from '@partner-up-dev/backend';
import { client } from '@/lib/rpc';

export const useJoinPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: PRId) => {
      const res = await client.api.pr[':id'].join.$post({
        param: { id },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || 'Failed to join partner request');
      }

      return await res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['partner-request', id] });
    },
  });
};
