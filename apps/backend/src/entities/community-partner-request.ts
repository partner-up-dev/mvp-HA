import { bigint, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  partnerRequests,
  type PRId,
} from "./partner-request";

export const communityPRCreationSourceSchema = z.enum([
  "STRUCTURED",
  "NATURAL_LANGUAGE",
  "LEGACY",
]);
export type CommunityPRCreationSource = z.infer<
  typeof communityPRCreationSourceSchema
>;

export const communityPartnerRequests = pgTable("community_partner_requests", {
  prId: bigint("pr_id", { mode: "number" })
    .$type<PRId>()
    .primaryKey()
    .references(() => partnerRequests.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  budget: text("budget"),
  creationSource: text("creation_source")
    .$type<CommunityPRCreationSource>()
    .notNull(),
});

export const insertCommunityPartnerRequestSchema = createInsertSchema(
  communityPartnerRequests,
  {
    creationSource: communityPRCreationSourceSchema,
  },
);

export const selectCommunityPartnerRequestSchema = createSelectSchema(
  communityPartnerRequests,
  {
    creationSource: communityPRCreationSourceSchema,
  },
);

export type CommunityPartnerRequest =
  typeof communityPartnerRequests.$inferSelect;
export type NewCommunityPartnerRequest =
  typeof communityPartnerRequests.$inferInsert;
