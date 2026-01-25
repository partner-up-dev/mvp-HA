import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';

interface ParsedPartnerRequest {
  scenario: string;
  time: string | null;
  location: string | null;
  peopleCount: number | null;
  budget: string | null;
  preferences: string[];
  notes: string | null;
}

interface UpdateContentInput {
  id: string;
  parsed: ParsedPartnerRequest;
  pin: string;
}

export const useUpdatePRContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, parsed, pin }: UpdateContentInput) => {
      const res = await client.api.pr[':id'].content.$patch({
        param: { id },
        json: { parsed, pin },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || 'Failed to update content');
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner-request', variables.id] });
    },
  });
};
