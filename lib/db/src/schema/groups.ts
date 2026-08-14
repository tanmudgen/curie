import { pgTable, serial, timestamp, integer, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionGroupsTable = pgTable("question_groups", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull(),
  title: text("title").notNull(),
  createdByTa: text("created_by_ta").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionGroupMembersTable = pgTable("question_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  questionId: integer("question_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.groupId, t.questionId)]);

export const groupRepliesTable = pgTable("group_replies", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().unique(),
  body: text("body").notNull(),
  taName: text("ta_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionGroupSchema = createInsertSchema(questionGroupsTable).omit({ id: true, createdAt: true });
export type InsertQuestionGroup = z.infer<typeof insertQuestionGroupSchema>;
export type QuestionGroup = typeof questionGroupsTable.$inferSelect;

export const insertGroupReplySchema = createInsertSchema(groupRepliesTable).omit({ id: true, createdAt: true });
export type InsertGroupReply = z.infer<typeof insertGroupReplySchema>;
export type GroupReply = typeof groupRepliesTable.$inferSelect;
