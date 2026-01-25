import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';

interface UpdateStatusInput {
  id: string;
  status: 'OPEN' | 'ACTIVE' | 'CLOSED';
  pin: string;
}

export const useUpdatePRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, pin }: UpdateStatusInput) => {
      const res = await client.api.pr[':id'].status.$patch({
        param: { id },
        json: { status, pin },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || 'Failed to update status');
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner-request', variables.id] });
    },
  });
};
