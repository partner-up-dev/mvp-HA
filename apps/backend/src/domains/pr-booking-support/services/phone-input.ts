const CN_MAINLAND_MOBILE_REGEX = /^1\d{10}$/;

export type NormalizedMainlandChinaMobile = {
  phoneE164: string;
  phoneMasked: string;
};

export const normalizeMainlandChinaMobilePhone = (
  phone: string,
): NormalizedMainlandChinaMobile | null => {
  const trimmed = phone.trim();
  if (!CN_MAINLAND_MOBILE_REGEX.test(trimmed)) {
    return null;
  }

  return {
    phoneE164: `+86${trimmed}`,
    phoneMasked: `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`,
  };
};
