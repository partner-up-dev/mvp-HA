import { useMutation } from "@tanstack/vue-query";
import type {
  PartnerRequestFields,
  PRId,
  WeekdayLabel,
} from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

interface CreateDraftResult {
  id: PRId;
}

interface CreatePRFromNaturalLanguageInput {
  rawText: string;
  nowIso: string;
  nowWeekday: WeekdayLabel;
}

interface CreatePRFromStructuredInput {
  fields: PartnerRequestFields;
}

export const useCreatePRFromNaturalLanguage = () => {
  return useMutation<CreateDraftResult, Error, CreatePRFromNaturalLanguageInput>({
    mutationFn: async (input) => {
      const res = await client.api.pr.natural_language.$post({
        json: input,
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.createRequestFailed"),
        );
      }

      return await res.json();
    },
  });
};

export const useCreatePRFromStructured = () => {
  return useMutation<CreateDraftResult, Error, CreatePRFromStructuredInput>({
    mutationFn: async (input) => {
      const res = await client.api.pr.$post({
        json: input.fields,
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.createRequestFailed"),
        );
      }

      return await res.json();
    },
  });
};
