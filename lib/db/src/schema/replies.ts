import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const repliesTable = pgTable("replies", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  body: text("body").notNull(),
  authorLabel: text("author_label").notNull().default("Anonymous"),
  deviceId: text("device_id").notNull(),
  isTa: boolean("is_ta").notNull().default(false),
  taName: text("ta_name"),
  isFlagged: boolean("is_flagged").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReplySchema = createInsertSchema(repliesTable).omit({ id: true, createdAt: true, isFlagged: true });
export type InsertReply = z.infer<typeof insertReplySchema>;
export type Reply = typeof repliesTable.$inferSelect;
