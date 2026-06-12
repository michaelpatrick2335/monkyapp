import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profile — single user app (local), stores progress
export const user = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("Seeker"),
  email: text("email"), // used for login lookup
  tier: text("tier").notNull().default("newbie"), // newbie | experienced | enlightened
  level: integer("level").notNull().default(1),
  bananas: integer("bananas").notNull().default(0),
  totalSessions: integer("total_sessions").notNull().default(0),
  totalSecondsMediated: integer("total_seconds_meditated").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastSessionDate: text("last_session_date"), // ISO date string
  isPremium: integer("is_premium", { mode: "boolean" }).notNull().default(false),
  freeSessionsUsed: integer("free_sessions_used").notNull().default(0),
  profilePic: text("profile_pic"), // path to uploaded profile image
  activeMusicTrack: text("active_music_track"), // id of selected music track (null = use synth)
});

export const insertUserSchema = createInsertSchema(user).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof user.$inferSelect;

// Meditation sessions log
export const meditationSession = sqliteTable("meditation_session", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  level: integer("level").notNull(),
  tier: text("tier").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  completedAt: text("completed_at").notNull(), // ISO datetime string
  bananasEarned: integer("bananas_earned").notNull().default(1),
});

export const insertSessionSchema = createInsertSchema(meditationSession).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type MeditationSession = typeof meditationSession.$inferSelect;
