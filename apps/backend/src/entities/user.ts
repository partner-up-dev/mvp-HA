import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export type UserId = z.infer<typeof userIdSchema>;

export const userStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSexSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type UserSex = z.infer<typeof userSexSchema>;

export const users = pgTable("users", {
  id: text("id").$type<UserId>().primaryKey(),
  openId: text("open_id").notNull().unique(),
  nickname: text("nickname"),
  sex: integer("sex").$type<UserSex>(),
  avatar: text("avatar"),
  status: text("status").$type<UserStatus>().notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
