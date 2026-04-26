import { bigint, pgTable, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { anchorEvents } from "./anchor-event";
import { partnerRequests } from "./partner-request";

export const anchorEventPRAttachments = pgTable("anchor_event_pr_attachments", {
  prId: bigint("pr_id", { mode: "number" })
    .primaryKey()
    .references(() => partnerRequests.id, { onDelete: "cascade" }),
  anchorEventId: bigint("anchor_event_id", { mode: "number" })
    .notNull()
    .references(() => anchorEvents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnchorEventPRAttachmentSchema = createInsertSchema(
  anchorEventPRAttachments,
);
export const selectAnchorEventPRAttachmentSchema = createSelectSchema(
  anchorEventPRAttachments,
);

export type AnchorEventPRAttachment = typeof anchorEventPRAttachments.$inferSelect;
export type NewAnchorEventPRAttachment =
  typeof anchorEventPRAttachments.$inferInsert;
