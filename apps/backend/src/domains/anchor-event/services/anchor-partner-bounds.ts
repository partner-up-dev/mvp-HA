import { normalizeAutomaticPartnerBounds } from "../../pr/services";

type EventPartnerBoundsDefaults = {
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
};

type ResolveAnchorPartnerBoundsInput = {
  defaults: EventPartnerBoundsDefaults;
  override?: {
    minPartners: number | null;
    maxPartners: number | null;
  } | null;
};

export const resolveAnchorPartnerBoundsFromEvent = ({
  defaults,
  override = null,
}: ResolveAnchorPartnerBoundsInput): {
  minPartners: number;
  maxPartners: number | null;
} => {
  const minPartners =
    override && override.minPartners !== null
      ? override.minPartners
      : defaults.defaultMinPartners;
  const maxPartners =
    override && override.maxPartners !== null
      ? override.maxPartners
      : defaults.defaultMaxPartners;

  return normalizeAutomaticPartnerBounds(minPartners, maxPartners, 0);
};
