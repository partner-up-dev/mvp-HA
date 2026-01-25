import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';

export const useExitPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.pr[':id'].exit.$post({
        param: { id },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || 'Failed to exit partner request');
      }

      return await res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['partner-request', id] });
    },
  });
};
