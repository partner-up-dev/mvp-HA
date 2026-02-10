import type { PartnerRequestFields } from "../../entities/partner-request";
import { toPromptJson, type PromptJsonObject } from "../../lib/prompt-variables";

type SharePromptPartnerRequest = Pick<
  PartnerRequestFields,
  "title" | "type" | "time" | "location" | "partners"
>;

type ParticipantSummary = {
  currentParticipants: number;
  minParticipants: number | null;
  stillNeededFromMin: number | null;
};

const buildParticipantSummary = (
  partners: PartnerRequestFields["partners"],
): ParticipantSummary => {
  const [minParticipants, currentParticipants] = partners;
  const stillNeededFromMin =
    minParticipants === null
      ? null
      : Math.max(minParticipants - currentParticipants, 0);

  return {
    currentParticipants,
    minParticipants,
    stillNeededFromMin,
  };
};

const buildSharePromptContext = (
  pr: SharePromptPartnerRequest,
): PromptJsonObject => {
  const [startTime, endTime] = pr.time;
  const participants = buildParticipantSummary(pr.partners);

  return {
    activity: {
      title: pr.title ?? null,
      type: pr.type,
    },
    time: {
      start: startTime,
      end: endTime,
    },
    location: pr.location,
    participants: {
      current: participants.currentParticipants,
      min: participants.minParticipants,
      stillNeededFromMin: participants.stillNeededFromMin,
    },
  };
};

export const buildXiaohongshuCaptionPromptVariablesJson = (
  pr: PartnerRequestFields,
): string => {
  return toPromptJson({
    context: buildSharePromptContext(pr),
  });
};

export const buildXhsPosterHtmlPromptVariablesJson = (
  pr: SharePromptPartnerRequest,
  caption: string,
): string => {
  return toPromptJson({
    caption,
    context: buildSharePromptContext(pr),
  });
};

export const buildWeChatThumbnailPromptVariablesJson = (
  pr: SharePromptPartnerRequest,
): string => {
  return toPromptJson({
    context: {
      title: pr.title ?? null,
      type: pr.type,
      location: pr.location,
    },
  });
};

export const buildPartnerRequestParsePromptVariablesJson = (
  rawText: string,
  nowIso: string,
): string => {
  const normalizedRawText = rawText.trim().length > 0 ? rawText.trim() : rawText;

  return toPromptJson({
    nowIso,
    userInput: normalizedRawText,
  });
};
