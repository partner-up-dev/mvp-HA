import { assertPartnerBoundsValid } from "../../pr-core/services/slot-management.service";

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
  minPartners: number | null;
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

  assertPartnerBoundsValid(minPartners, maxPartners, 0);

  return {
    minPartners,
    maxPartners,
  };
};

