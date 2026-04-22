import { useMutation } from "@tanstack/vue-query";
import type {
  PartnerRequestFields,
  PRId,
  WeekdayLabel,
} from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

type CreateDraftResult = { id: PRId };

type CreatePRFromNaturalLanguageInput = {
  rawText: string;
  nowIso: string;
  nowWeekday: WeekdayLabel;
};

type CreatePRFromStructuredInput = {
  fields: PartnerRequestFields;
};

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const useCreatePRFromNaturalLanguage = () => {
  return useMutation<
    CreateDraftResult,
    Error,
    CreatePRFromNaturalLanguageInput
  >({
    mutationFn: async (input) => {
      const res = await client.api.pr.new.nl.$post({
        json: input,
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.createRequestFailed"),
          ),
        );
      }

      return await res.json();
    },
  });
};

export const useCreatePRFromStructured = () => {
  return useMutation<CreateDraftResult, Error, CreatePRFromStructuredInput>({
    mutationFn: async (input) => {
      const res = await client.api.pr.new.form.$post({
        json: input.fields,
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.createRequestFailed"),
          ),
        );
      }

      return await res.json();
    },
  });
};
