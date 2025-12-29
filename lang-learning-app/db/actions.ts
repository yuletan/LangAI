import { db } from "./client";
import { phrases, userStats, conversations, achievements, challenges, userProfile, lessonCache, apiCache } from "./schema";
import { eq, lte, and, desc, sql } from "drizzle-orm";
import { calculateNextReview } from "../services/srsAlgorithm";
import { calculateLevel } from "../services/gamification";

// --- Cache Functions ---

export const checkCache = async (key: string) => {
  try {
    const result = await db.select().from(apiCache).where(eq(apiCache.hashKey, key)).limit(1);
    if (result.length > 0) {
      return JSON.parse(result[0].responseJson);
    }
    return null;
  } catch (e) {
    console.error("Cache check error:", e);
    return null;
  }
};

export const saveToCache = async (key: string, data: any) => {
  try {
    await db.insert(apiCache).values({
      hashKey: key,
      responseJson: JSON.stringify(data),
      timestamp: Date.now(),
    }).onConflictDoUpdate({
      target: apiCache.hashKey,
      set: {
        responseJson: JSON.stringify(data),
        timestamp: Date.now(),
      }
    });
  } catch (e) {
    console.error("Cache save error:", e);
  }
};

// --- SRS Phrase Functions ---

export const addPhrase = async (
  original: string,
  translated: string,
  pronunciation: string = ""
) => {
  try {
    const now = Date.now();
    const nextReview = now + 24 * 60 * 60 * 1000;

    const result = await db.insert(phrases).values({
      original,
      translated,
      pronunciation,
      nextReview,
      createdAt: now,
    }).returning({ id: phrases.id });

    return result[0]?.id || null;
  } catch (e) {
    console.error("Add phrase error:", e);
    return null;
  }
};

export const getPhrasesForReview = async () => {
  try {
    const now = Date.now();
    return await db.select().from(phrases).where(lte(phrases.nextReview, now)).orderBy(phrases.nextReview);
  } catch (e) {
    console.error("Get phrases for review error:", e);
    return [];
  }
};

export const getAllPhrases = async () => {
  try {
    return await db.select().from(phrases).orderBy(desc(phrases.createdAt));
  } catch (e) {
    console.error("Get all phrases error:", e);
    return [];
  }
};

export const updatePhraseReview = async (
  id: number,
  quality: 1 | 2 | 3 | 4 | 5
) => {
  try {
    const phraseResults = await db.select().from(phrases).where(eq(phrases.id, id)).limit(1);
    if (phraseResults.length === 0) return;

    const phrase = phraseResults[0];
    const { nextReview, easeFactor, interval } = calculateNextReview(
      quality,
      phrase.easeFactor ?? 2.5,
      phrase.interval ?? 1
    );

    await db.update(phrases)
      .set({ nextReview, easeFactor, interval })
      .where(eq(phrases.id, id));
  } catch (e) {
    console.error("Update phrase review error:", e);
  }
};

export const deletePhrase = async (id: number) => {
  try {
    await db.delete(phrases).where(eq(phrases.id, id));
  } catch (e) {
    console.error("Delete phrase error:", e);
  }
};

// --- User Stats Functions ---

export const recordActivity = async (
  type: "prediction" | "chat" | "review" | "correction",
  score: number = 0
) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    await db.insert(userStats).values({
      date: today,
      type,
      score,
    });
  } catch (e) {
    console.error("Record activity error:", e);
  }
};

export const getActivityByDate = async () => {
  try {
    return await db.select({
      date: userStats.date,
      count: sql<number>`count(*)`,
    })
    .from(userStats)
    .groupBy(userStats.date)
    .orderBy(desc(userStats.date))
    .limit(30);
  } catch (e) {
    console.error("Get activity by date error:", e);
    return [];
  }
};

export const getStatsByType = async () => {
  try {
    return await db.select({
      type: userStats.type,
      avg_score: sql<number>`avg(${userStats.score})`,
      count: sql<number>`count(*)`,
    })
    .from(userStats)
    .groupBy(userStats.type);
  } catch (e) {
    console.error("Get stats by type error:", e);
    return [];
  }
};

// --- Conversation Functions ---

export const saveConversation = async (
  scenario: string,
  language: string,
  messages: any[]
) => {
  try {
    const result = await db.insert(conversations).values({
      scenario,
      language,
      messagesJson: JSON.stringify(messages),
      createdAt: Date.now(),
    }).returning({ id: conversations.id });
    
    return result[0]?.id || null;
  } catch (e) {
    console.error("Save conversation error:", e);
    return null;
  }
};

export const getConversations = async () => {
  try {
    return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  } catch (e) {
    console.error("Get conversations error:", e);
    return [];
  }
};

export const updateConversation = async (
  id: number,
  messages: any[]
) => {
  try {
    await db.update(conversations)
      .set({
        messagesJson: JSON.stringify(messages),
        createdAt: Date.now(),
      })
      .where(eq(conversations.id, id));
    return true;
  } catch (e) {
    console.error("Update conversation error:", e);
    return false;
  }
};

// --- Achievement Functions ---

export const unlockAchievement = async (badgeId: string) => {
  try {
    await db.insert(achievements).values({
      badgeId,
      unlockedAt: Date.now(),
    }).onConflictDoNothing();
    return true;
  } catch (e) {
    console.error("Unlock achievement error:", e);
    return false;
  }
};

export const getUnlockedAchievements = async () => {
  try {
    return await db.select().from(achievements).orderBy(desc(achievements.unlockedAt));
  } catch (e) {
    console.error("Get achievements error:", e);
    return [];
  }
};

// --- XP & Profile Functions ---

export const getUserProfile = async () => {
  try {
    const result = await db.select().from(userProfile).where(eq(userProfile.id, 1)).limit(1);
    if (result.length > 0) return result[0];
    
    // Initialize if not exists
    const initial = {
      id: 1,
      totalXp: 0,
      currentLevel: 1,
      longestStreak: 0,
      languagesUsed: "",
      updatedAt: Date.now(),
    };
    await db.insert(userProfile).values(initial).onConflictDoNothing();
    return initial;
  } catch (e) {
    console.error("Get user profile error:", e);
    return null;
  }
};

export const trackLanguageUsed = async (language: string) => {
  try {
    const profile = await getUserProfile();
    if (!profile) return;
    const languages = (profile.languagesUsed ?? "").split(",").filter(l => l.length > 0);
    
    if (!languages.includes(language)) {
      languages.push(language);
      await db.update(userProfile)
        .set({
          languagesUsed: languages.join(","),
          updatedAt: Date.now(),
        })
        .where(eq(userProfile.id, 1));
    }
  } catch (e) {
    console.error("Track language error:", e);
  }
};

export const getWeakAreas = async () => {
  try {
    const stats = await db.select({
      type: userStats.type,
      avg_score: sql<number>`avg(${userStats.score})`,
    })
    .from(userStats)
    .groupBy(userStats.type);
    
    const areas = stats.map(s => ({
      area: s.type === "prediction" ? "Translation" : 
            s.type === "chat" ? "Conversation" :
            s.type === "review" ? "Vocabulary" : "Grammar",
      score: Math.round(s.avg_score || 0),
    }));
    
    return areas.sort((a, b) => a.score - b.score);
  } catch (e) {
    console.error("Get weak areas error:", e);
    return [];
  }
};

export const getAccuracyTrend = async (days: number = 7) => {
  try {
    const result = await db.select({
      date: userStats.date,
      avg_score: sql<number>`avg(${userStats.score})`,
    })
    .from(userStats)
    .where(sql`${userStats.date} >= date('now', '-' || ${days} || ' days')`)
    .groupBy(userStats.date)
    .orderBy(userStats.date);

    return result.map(r => ({ date: r.date, accuracy: Math.round(r.avg_score || 0) }));
  } catch (e) {
    console.error("Get accuracy trend error:", e);
    return [];
  }
};

export const saveLessonToCache = async (
  topic: string,
  language: string,
  level: string,
  lessonData: any
) => {
  try {
    await db.insert(lessonCache).values({
      topic,
      language,
      level,
      lessonJson: JSON.stringify(lessonData),
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error("Save lesson to cache error:", e);
  }
};

export const getRandomCachedLesson = async (
  topic: string,
  language: string,
  level: string
) => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const result = await db.select()
      .from(lessonCache)
      .where(and(
        eq(lessonCache.topic, topic),
        eq(lessonCache.language, language),
        eq(lessonCache.level, level),
        sql`${lessonCache.createdAt} > ${sevenDaysAgo}`
      ))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (result.length > 0) {
      return JSON.parse(result[0].lessonJson);
    }
    return null;
  } catch (e) {
    console.error("Get cached lesson error:", e);
    return null;
  }
};

export const addXP = async (amount: number) => {
  try {
    const profile = await getUserProfile();
    if (!profile) return null;

    const oldLevel = profile.currentLevel ?? 1;
    const newXP = (profile.totalXp ?? 0) + amount;
    const newLevel = calculateLevel(newXP);

    await db.update(userProfile)
      .set({
        totalXp: newXP,
        currentLevel: newLevel,
        updatedAt: Date.now(),
      })
      .where(eq(userProfile.id, 1));

    return {
      newXP,
      leveledUp: newLevel > oldLevel,
      newLevel,
    };
  } catch (e) {
    console.error("Add XP error:", e);
    return null;
  }
};
