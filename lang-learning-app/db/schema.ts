import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const apiCache = sqliteTable("api_cache", {
  hashKey: text("hash_key").primaryKey(),
  responseJson: text("response_json").notNull(),
  timestamp: integer("timestamp").notNull(),
});

export const userStats = sqliteTable("user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  type: text("type").$type<"prediction" | "chat" | "review" | "correction">().notNull(),
  score: integer("score").default(0),
});

export const phrases = sqliteTable("phrases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  original: text("original").notNull(),
  translated: text("translated").notNull(),
  pronunciation: text("pronunciation"),
  nextReview: integer("next_review").notNull(),
  easeFactor: real("ease_factor").default(2.5),
  interval: integer("interval").default(1),
  createdAt: integer("created_at").notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scenario: text("scenario"),
  language: text("language"),
  messagesJson: text("messages_json").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  badgeId: text("badge_id").unique().notNull(),
  unlockedAt: integer("unlocked_at").notNull(),
});

export const challenges = sqliteTable("challenges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  goal: integer("goal").notNull(),
  progress: integer("progress").default(0),
  xpReward: integer("xp_reward").default(50),
  type: text("type").$type<"translations" | "lessons" | "streak" | "chat">().notNull(),
  expiresAt: integer("expires_at").notNull(),
  completed: integer("completed").default(0),
});

export const userProfile = sqliteTable("user_profile", {
  id: integer("id").primaryKey().default(1),
  totalXp: integer("total_xp").default(0),
  currentLevel: integer("current_level").default(1),
  longestStreak: integer("longest_streak").default(0),
  languagesUsed: text("languages_used").default(""),
  updatedAt: integer("updated_at"),
});

export const lessonCache = sqliteTable("lesson_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  language: text("language").notNull(),
  level: text("level").notNull(),
  lessonJson: text("lesson_json").notNull(),
  createdAt: integer("created_at").notNull(),
});

// Infer types
export type UserStat = typeof userStats.$inferSelect;
export type Phrase = typeof phrases.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type UserProfile = typeof userProfile.$inferSelect;
