type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

type LocalizedProblemText = {
  zhCN: {
    title: string;
    detail: string;
  };
  enUS: {
    title: string;
    detail: string;
  };
};

export type ProblemDetailsPayload = {
  type: string;
  title: string;
  status: ProblemStatus;
  detail: string;
};

export class ProblemDetailsError extends Error {
  readonly status: ProblemStatus;

  readonly type: string;

  readonly localizedText: LocalizedProblemText;

  constructor(input: {
    status: ProblemStatus;
    type: string;
    localizedText: LocalizedProblemText;
  }) {
    super(input.localizedText.zhCN.detail);
    this.name = "ProblemDetailsError";
    this.status = input.status;
    this.type = input.type;
    this.localizedText = input.localizedText;
  }
}

const resolveProblemLocale = (
  acceptLanguageHeader: string | undefined,
): "zh-CN" | "en-US" => {
  const normalized = acceptLanguageHeader?.trim();
  if (!normalized) {
    return "zh-CN";
  }

  const preferences = normalized
    .split(",")
    .map((entry, index) => {
      const [languageTagRaw = "", ...parameterParts] = entry
        .trim()
        .split(";")
        .map((part) => part.trim());
      const qualityParameter = parameterParts.find((part) =>
        part.toLowerCase().startsWith("q="),
      );
      const parsedQuality =
        qualityParameter === undefined
          ? 1
          : Number(qualityParameter.slice(2));
      const quality =
        Number.isFinite(parsedQuality) && parsedQuality >= 0
          ? parsedQuality
          : 1;
      return {
        index,
        languageTag: languageTagRaw.toLowerCase(),
        quality,
      };
    })
    .filter((preference) => preference.languageTag.length > 0)
    .sort((left, right) => {
      if (left.quality !== right.quality) {
        return right.quality - left.quality;
      }
      return left.index - right.index;
    });

  for (const preference of preferences) {
    if (preference.languageTag.startsWith("zh")) {
      return "zh-CN";
    }
    if (preference.languageTag.startsWith("en")) {
      return "en-US";
    }
  }

  return "zh-CN";
};

export const buildProblemDetailsPayload = (
  error: ProblemDetailsError,
  acceptLanguageHeader: string | undefined,
): { payload: ProblemDetailsPayload; contentLanguage: "zh-CN" | "en-US" } => {
  const contentLanguage = resolveProblemLocale(acceptLanguageHeader);
  const text =
    contentLanguage === "en-US"
      ? error.localizedText.enUS
      : error.localizedText.zhCN;

  return {
    contentLanguage,
    payload: {
      type: error.type,
      title: text.title,
      status: error.status,
      detail: text.detail,
    },
  };
};
