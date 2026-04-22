import type {
  PartnerRequestSummary,
  PRId,
  PRKind,
} from "@partner-up-dev/backend";

export const communityPRCreatePath = (): string => "/cpr/new";
export const prCreatePath = (): string => "/pr/new";
export const prDetailPath = (id: PRId): string => `/pr/${id}`;

export const communityPRDetailPath = (id: PRId): string => `/cpr/${id}`;

export const anchorPRDetailPath = (id: PRId): string => `/apr/${id}`;

export const anchorPRBookingSupportPath = (id: PRId): string =>
  `/apr/${id}/booking-support`;

export const anchorPRMessagesPath = (id: PRId): string =>
  `/apr/${id}/messages`;

export const communityPRPartnerProfilePath = (
  id: PRId,
  partnerId: number,
): string => `/cpr/${id}/partners/${partnerId}`;

export const anchorPRPartnerProfilePath = (
  id: PRId,
  partnerId: number,
): string => `/apr/${id}/partners/${partnerId}`;

export const resolvePRCompatibilityDetailPath = (input: {
  id: PRId;
  prKind: PRKind;
}): string =>
  input.prKind === "ANCHOR"
    ? anchorPRDetailPath(input.id)
    : communityPRDetailPath(input.id);

export const resolvePRDetailPath = (input: {
  id: PRId;
  prKind: PRKind;
}): string => prDetailPath(input.id);

export const resolvePRSummaryPath = (
  summary: Pick<PartnerRequestSummary, "id" | "prKind" | "canonicalPath">,
): string => prDetailPath(summary.id);

export const parsePRIdFromPathname = (
  pathname: string,
): number | null => {
  const matched = pathname.match(/^\/(?:pr|cpr|apr)\/(\d+)(?:\/|$)/);
  if (!matched) return null;

  const id = Number.parseInt(matched[1], 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
};
