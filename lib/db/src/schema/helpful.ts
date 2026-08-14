import { pgTable, serial, timestamp, integer, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const helpfulMarksTable = pgTable("helpful_marks", {
  id: serial("id").primaryKey(),
  replyId: integer("reply_id").notNull(),
  deviceId: text("device_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.replyId, t.deviceId)]);

export const insertHelpfulMarkSchema = createInsertSchema(helpfulMarksTable).omit({ id: true, createdAt: true });
export type InsertHelpfulMark = z.infer<typeof insertHelpfulMarkSchema>;
export type HelpfulMark = typeof helpfulMarksTable.$inferSelect;
