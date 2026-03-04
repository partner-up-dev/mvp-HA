import type { AnchorEventListResponse } from "@/queries/useAnchorEvents";

export const HOME_EVENT_UNIT_KEYS = [
  "badminton",
  "running",
  "teaTalk",
  "speaking",
] as const;

export type HomeEventUnitKey = (typeof HOME_EVENT_UNIT_KEYS)[number];

type HomeEventUnitConfig = {
  keywords: string[];
  fallbackLocation: string;
};

export const HOME_EVENT_UNIT_CONFIG: Record<
  HomeEventUnitKey,
  HomeEventUnitConfig
> = {
  badminton: {
    keywords: ["羽毛球", "badminton"],
    fallbackLocation: "校园球馆",
  },
  running: {
    keywords: ["慢跑", "夜跑", "跑步", "running"],
    fallbackLocation: "学校操场",
  },
  teaTalk: {
    keywords: ["茶话会", "茶会", "奶茶", "tea"],
    fallbackLocation: "校园奶茶店",
  },
  speaking: {
    keywords: ["口语", "英语", "english", "speaking"],
    fallbackLocation: "自习区",
  },
};

export type HomeEventUnitMatchedMap = Record<
  HomeEventUnitKey,
  AnchorEventListResponse[number] | null
>;

const createEmptyMatchMap = (): HomeEventUnitMatchedMap => ({
  badminton: null,
  running: null,
  teaTalk: null,
  speaking: null,
});

const toHaystack = (event: AnchorEventListResponse[number]): string => {
  return `${event.title} ${event.type} ${event.description ?? ""}`.toLowerCase();
};

const getMatchScore = (
  event: AnchorEventListResponse[number],
  keywords: string[],
): number => {
  const haystack = toHaystack(event);
  return keywords.reduce((score, keyword) => {
    return haystack.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
};

export const matchHomeEventUnits = (
  events: AnchorEventListResponse,
): HomeEventUnitMatchedMap => {
  if (!Array.isArray(events) || events.length === 0) {
    return createEmptyMatchMap();
  }

  const remainingEvents = [...events];
  const matchedMap = createEmptyMatchMap();

  for (const key of HOME_EVENT_UNIT_KEYS) {
    const config = HOME_EVENT_UNIT_CONFIG[key];

    let bestIndex = -1;
    let bestScore = 0;

    for (let index = 0; index < remainingEvents.length; index += 1) {
      const candidate = remainingEvents[index];
      if (!candidate) continue;

      const score = getMatchScore(candidate, config.keywords);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex >= 0) {
      const [pickedEvent] = remainingEvents.splice(bestIndex, 1);
      matchedMap[key] = pickedEvent ?? null;
    }
  }

  return matchedMap;
};
