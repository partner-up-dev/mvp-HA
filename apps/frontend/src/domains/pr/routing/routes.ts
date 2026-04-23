import type { PartnerRequestSummary, PRId, PRKind } from "@partner-up-dev/backend";

export const prCreatePath = (): string => "/pr/new";
export const prDetailPath = (id: PRId): string => `/pr/${id}`;
export const prMessagesPath = (id: PRId): string => `/pr/${id}/messages`;
export const prBookingSupportPath = (id: PRId): string =>
  `/pr/${id}/booking-support`;
export const prPartnerProfilePath = (
  id: PRId,
  partnerId: number,
): string => `/pr/${id}/partners/${partnerId}`;

export const communityPRCreatePath = (): string => prCreatePath();

export const communityPRDetailPath = (id: PRId): string => prDetailPath(id);

export const anchorPRDetailPath = (id: PRId): string => prDetailPath(id);

export const anchorPRBookingSupportPath = (id: PRId): string =>
  prBookingSupportPath(id);

export const anchorPRMessagesPath = (id: PRId): string =>
  prMessagesPath(id);

export const communityPRPartnerProfilePath = (
  id: PRId,
  partnerId: number,
): string => prPartnerProfilePath(id, partnerId);

export const anchorPRPartnerProfilePath = (
  id: PRId,
  partnerId: number,
): string => prPartnerProfilePath(id, partnerId);

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
