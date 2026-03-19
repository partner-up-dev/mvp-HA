import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userIdSchema = z.string().uuid();

export type UserId = z.infer<typeof userIdSchema>;

export const userStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userRoleSchema = z.enum([
  "anonymous",
  "authenticated",
  "service",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSexSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type UserSex = z.infer<typeof userSexSchema>;

export const users = pgTable("users", {
  id: uuid("id").$type<UserId>().primaryKey(),
  openId: text("open_id").unique(),
  pinHash: text("pin_hash"),
  role: text("role").$type<UserRole>().notNull().default("authenticated"),
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
