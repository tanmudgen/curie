import { pgTable, serial, timestamp, integer, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taClaimsTable = pgTable("ta_claims", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  taName: text("ta_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.questionId)]);

export const insertTaClaimSchema = createInsertSchema(taClaimsTable).omit({ id: true, createdAt: true });
export type InsertTaClaim = z.infer<typeof insertTaClaimSchema>;
export type TaClaim = typeof taClaimsTable.$inferSelect;
