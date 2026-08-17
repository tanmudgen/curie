import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  authorLabel: text("author_label").notNull().default("Anonymous"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  deviceId: text("device_id").notNull(),
  tags: text("tags").array().notNull().default([]),
  isFlagged: boolean("is_flagged").notNull().default(false),
  isInLiveQueue: boolean("is_in_live_queue").notNull().default(false),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true, isFlagged: true, isInLiveQueue: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
