const CN_MAINLAND_MOBILE_REGEX = /^1\d{10}$/;
const CN_E164_MOBILE_REGEX = /^\+861\d{10}$/;

export type NormalizedMainlandChinaMobile = {
  phoneE164: string;
  phoneMasked: string;
};

export const maskMainlandChinaMobilePhone = (
  phoneE164: string | null | undefined,
): string | null => {
  if (!phoneE164 || !CN_E164_MOBILE_REGEX.test(phoneE164)) {
    return null;
  }

  const local = phoneE164.slice(3);
  return `${local.slice(0, 3)}****${local.slice(-4)}`;
};

export const normalizeMainlandChinaMobilePhone = (
  phone: string,
): NormalizedMainlandChinaMobile | null => {
  const trimmed = phone.trim();
  const local = trimmed.startsWith("+86") ? trimmed.slice(3) : trimmed;
  if (!CN_MAINLAND_MOBILE_REGEX.test(local)) {
    return null;
  }

  const phoneE164 = `+86${local}`;
  return {
    phoneE164,
    phoneMasked: maskMainlandChinaMobilePhone(phoneE164) ?? "",
  };
};
