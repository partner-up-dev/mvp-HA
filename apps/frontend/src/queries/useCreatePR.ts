import { useMutation } from "@tanstack/vue-query";
import type {
  CreatePRStructuredStatus,
  PartnerRequestFields,
  PRId,
} from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

interface CreatePRResult {
  id: PRId;
}

interface CreatePRFromNaturalLanguageInput {
  rawText: string;
  pin: string;
  nowIso: string;
}

interface CreatePRFromStructuredInput {
  fields: PartnerRequestFields;
  pin: string;
  status: CreatePRStructuredStatus;
}

export const useCreatePRFromNaturalLanguage = () => {
  return useMutation<CreatePRResult, Error, CreatePRFromNaturalLanguageInput>({
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
  return useMutation<CreatePRResult, Error, CreatePRFromStructuredInput>({
    mutationFn: async (input) => {
      const res = await client.api.pr.$post({
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
