import { pgTable, serial, timestamp, integer, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blockedSignalsTable = pgTable("blocked_signals", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  deviceId: text("device_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.questionId, t.deviceId)]);

export const insertBlockedSignalSchema = createInsertSchema(blockedSignalsTable).omit({ id: true, createdAt: true });
export type InsertBlockedSignal = z.infer<typeof insertBlockedSignalSchema>;
export type BlockedSignal = typeof blockedSignalsTable.$inferSelect;
