import { and, desc, eq } from "drizzle-orm";
import {
  partners,
  prBookingContacts,
  type PartnerId,
  type PartnerStatus,
  type UserId,
} from "../../../../src/entities";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export type PartnerSlotProbe = {
  id: PartnerId;
  status: PartnerStatus;
};

export type BookingContactProbe = {
  ownerUserId: UserId;
  ownerPartnerId: PartnerId | null;
  phoneMasked: string;
};

export async function probeLatestPartnerSlot(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<PartnerSlotProbe | null> {
  const [slot] = await getTestDb()
    .select({
      id: partners.id,
      status: partners.status,
    })
    .from(partners)
    .where(
      and(
        eq(partners.prId, input.pr.id),
        eq(partners.userId, input.user.user.id),
      ),
    )
    .orderBy(desc(partners.id));

  return slot ?? null;
}

export async function probeBookingContact(
  pr: ScenarioPartnerRequest,
): Promise<BookingContactProbe | null> {
  const [contact] = await getTestDb()
    .select({
      ownerUserId: prBookingContacts.ownerUserId,
      ownerPartnerId: prBookingContacts.ownerPartnerId,
      phoneMasked: prBookingContacts.phoneMasked,
    })
    .from(prBookingContacts)
    .where(eq(prBookingContacts.prId, pr.id));

  return contact ?? null;
}
