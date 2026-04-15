import type { AnchorEventDemandCardsResponse } from "@/domains/event/model/types";

type TimeWindow = [string | null, string | null];

export type DemandCardViewModel = {
  cardKey: string;
  batchId: number;
  timeWindow: TimeWindow;
  batchStartTimestamp: number;
  timeLabel: string;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  candidateCount: number;
  coverImage: string | null;
};

type PoiGalleryResolver = (location: string | null) => string | null;

const PRODUCT_TIME_ZONE = "Asia/Shanghai";

const productLocalTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formatCardTimeLabel = (timeWindow: TimeWindow): string => {
  const [start] = timeWindow;
  if (start) {
    try {
      const date = new Date(start);
      if (!Number.isNaN(date.getTime())) {
        return productLocalTimeFormatter.format(date);
      }
    } catch {
      // fall through to fallback
    }
  }

  return "";
};

export const toDemandCardViewModels = ({
  cards,
  eventCoverImage,
  resolveCoverImage,
}: {
  cards: AnchorEventDemandCardsResponse;
  eventCoverImage: string | null;
  resolveCoverImage: PoiGalleryResolver;
}): DemandCardViewModel[] =>
  cards.map((card) => ({
    cardKey: card.cardKey,
    batchId: card.batchId,
    timeWindow: card.timeWindow,
    batchStartTimestamp: card.batchStartTimestamp,
    timeLabel: formatCardTimeLabel(card.timeWindow),
    displayLocationName: card.displayLocationName,
    preferenceFingerprint: card.preferenceFingerprint,
    preferenceTags: card.preferenceTags,
    notes: card.notes,
    detailPrId: card.detailPrId,
    candidateCount: card.candidateCount,
    coverImage:
      resolveCoverImage(card.displayLocationName) ?? eventCoverImage ?? null,
  }));
