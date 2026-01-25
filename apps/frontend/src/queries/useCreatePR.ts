import { useMutation } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';

interface CreatePRInput {
  rawText: string;
  pin: string;
}

export const useCreatePR = () => {
  return useMutation({
    mutationFn: async (input: CreatePRInput) => {
      const res = await client.api.pr.$post({
        json: input,
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || 'Failed to create request');
      }

      return await res.json();
    },
  });
};
