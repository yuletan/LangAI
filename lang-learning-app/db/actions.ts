import { db } from "./client";
import { phrases, userStats, conversations, achievements, challenges, userProfile, lessonCache, apiCache, cefrProfile, Phrase as PhraseRow, Achievement as AchievementRow, Challenge as ChallengeRow, UserProfile as UserProfileRow, UserCEFRProfile as UserCEFRProfileRow } from "./schema";
export { PhraseRow, AchievementRow, ChallengeRow, UserProfileRow, UserCEFRProfileRow };
import { eq, lte, and, desc, sql, gt } from "drizzle-orm";
import { calculateNextReview } from "../services/srsAlgorithm";
import { calculateLevel, getXPForNextLevel } from "../services/gamification";
export { calculateLevel, getXPForNextLevel };

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
export const findCachedResponse = async (text: string, scenario: string, language: string) => {
  const key = await generateCacheKey(text, "User", language, scenario);
  return checkCache(key);
};

export const initDB = async () => {
  // Drizzle handles initialization via the client/provider.
  // However, we enforce the creation of the cefr_profile table to ensure it exists
  // even if migrations haven't run perfectly on the device.
  try {
    const rawDb = db.$client; // Access underlying Expo SQLite database
    await rawDb.execAsync(`
      CREATE TABLE IF NOT EXISTS cefr_profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        overall_level TEXT DEFAULT 'A1',
        skills_json TEXT NOT NULL,
        placement_history_json TEXT DEFAULT '[]',
        last_assessed INTEGER,
        updated_at INTEGER
      );
    `);
    console.log("🗄️ Database initialized & cefr_profile checked");
  } catch (e) {
    console.error("Manual table creation failed", e);
  }
  return true;
};

export const generateCacheKey = async (
  text: string,
  inputLang: string,
  outputLang: string,
  tone: string
) => {
  return `${text.trim().toLowerCase()}_${inputLang}_${outputLang}_${tone}`;
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

export const addPhraseWithDetails = async (
  original: string,
  translated: string,
  pronunciation: string = "",
  explanation: string = "",
  useCase: string = ""
) => {
  // Currently schema doesn't support explanation/useCase, 
  // so we log them and fallback to standard addPhrase.
  // We can add them to schema later if needed.
  console.log(`📝 Saving phrase with details (details currently ignored in DB): ${explanation}, ${useCase}`);
  return addPhrase(original, translated, pronunciation);
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

export const getTotalStats = async (): Promise<{
  totalActivities: number;
  totalDays: number;
  currentStreak: number;
}> => {
  try {
    const allStats = await db.select().from(userStats);
    const totalActivities = allStats.length;
    
    const uniqueDays = new Set(allStats.map(s => s.date));
    const totalDays = uniqueDays.size;
    
    // Streak calculation
    let currentStreak = 0;
    const sortedDates = Array.from(uniqueDays).sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    if (sortedDates.length > 0) {
      let checkDate = sortedDates[0] === today ? today : sortedDates[0] === yesterday ? yesterday : null;
      
      if (checkDate) {
        let i = 0;
        let dateToCheck = new Date(checkDate);
        while (true) {
          const dateStr = dateToCheck.toISOString().split("T")[0];
          if (uniqueDays.has(dateStr)) {
            currentStreak++;
            dateToCheck.setDate(dateToCheck.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return { totalActivities, totalDays, currentStreak };
  } catch (e) {
    console.error("Get total stats error:", e);
    return { totalActivities: 0, totalDays: 0, currentStreak: 0 };
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

// --- Challenge Functions ---

export const getActiveChallenges = async (): Promise<ChallengeRow[]> => {
  try {
    const now = Date.now();
    return await db.select()
      .from(challenges)
      .where(and(gt(challenges.expiresAt, now), eq(challenges.completed, 0)));
  } catch (e) {
    console.error("Get active challenges error:", e);
    return [];
  }
};

export const generateWeeklyChallenges = async (): Promise<void> => {
  try {
    const active = await getActiveChallenges();
    if (active.length >= 3) return;

    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

    const defaults = [
      { title: "Translation Master", description: "Save 10 new phrases", goal: 10, type: "translations", xpReward: 100 },
      { title: "Daily Learner", description: "Complete 5 grammar lessons", goal: 5, type: "lessons", xpReward: 150 },
      { title: "Chatbox Hero", description: "Send 20 chat messages", goal: 20, type: "chat", xpReward: 120 }
    ];

    for (const challenge of defaults) {
      await db.insert(challenges).values({
        ...challenge as any,
        progress: 0,
        expiresAt: nextWeek,
        completed: 0
      }).onConflictDoNothing();
    }
  } catch (e) {
    console.error("Generate weekly challenges error:", e);
  }
};

export const updateChallengeProgress = async (type: "translations" | "lessons" | "streak" | "chat", increment: number = 1) => {
  try {
    const now = Date.now();
    const active = await db.select()
      .from(challenges)
      .where(and(eq(challenges.type, type), gt(challenges.expiresAt, now), eq(challenges.completed, 0)));

    for (const challenge of active) {
      const newProgress = (challenge.progress ?? 0) + increment;
      if (newProgress >= challenge.goal) {
        await db.update(challenges)
          .set({ progress: challenge.goal, completed: 1 })
          .where(eq(challenges.id, challenge.id));
        // Add XP reward
        if (challenge.xpReward) await addXP(challenge.xpReward);
      } else {
        await db.update(challenges)
          .set({ progress: newProgress })
          .where(eq(challenges.id, challenge.id));
      }
    }
  } catch (e) {
    console.error("Update challenge error:", e);
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

// CEFR Cache Version - Increment this when lesson structure changes
const CEFR_CACHE_VERSION = "v2_cefr_strict";

export const saveLessonToCache = async (
  topic: string,
  language: string,
  level: string,
  lessonData: any
) => {
  try {
    // Inject version into the saved data wrapper
    const wrappedData = {
      _cacheVersion: CEFR_CACHE_VERSION,
      data: lessonData
    };
    
    await db.insert(lessonCache).values({
      topic,
      language,
      level,
      lessonJson: JSON.stringify(wrappedData), // Save wrapped data
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
      try {
        const parsed = JSON.parse(result[0].lessonJson);
        // Check for version match
        if (parsed._cacheVersion === CEFR_CACHE_VERSION) {
          return parsed.data;
        } else {
          // If version mismatch (or undefined), consider it stale legacy data.
          // Optionally delete it here, but filtering it out is safer for now.
          console.log("⚠️ Stale/Legacy cache hit. Ignoring.");
          return null;
        }
      } catch (parseError) {
        // Fallback for old flat JSON format
        console.log("⚠️ Failed to parse/validate cache version. Ignoring.");
        return null;
      }
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

export const resetAllProgress = async () => {
  try {
    await db.delete(userStats);
    await db.delete(achievements);
    await db.delete(challenges);
    await db.delete(phrases);
    await db.delete(conversations);
    await db.delete(lessonCache);
    await db.delete(apiCache);
    await db.delete(userProfile);
    
    // Re-initialize profile
    await getUserProfile();
    return true;
  } catch (e) {
    console.error("Reset progress error:", e);
    return false;
  }
};

export const getCEFRProfile = async () => {
  try {
    const existing = await db.select().from(cefrProfile).limit(1);
    if (!existing.length) {
      const defaultSkills = {
         listening: { level: "A1", confidence: 0.5 },
         reading: { level: "A1", confidence: 0.5 },
         speaking: { level: "A1", confidence: 0.5 },
         writing: { level: "A1", confidence: 0.5 }
      };
      return {
        overallLevel: "A1",
        skills: defaultSkills,
        placementHistory: []
      };
    }
    
    const data = existing[0];
    return {
      id: data.id,
      overallLevel: data.overallLevel,
      skills: typeof data.skillsJson === 'string' ? JSON.parse(data.skillsJson) : data.skillsJson,
      placementHistory: typeof data.placementHistoryJson === 'string' ? JSON.parse(data.placementHistoryJson) : data.placementHistoryJson,
      lastAssessed: data.lastAssessed,
      updatedAt: data.updatedAt
    };
  } catch (e) {
    console.error("Get CEFR profile error:", e);
    return null;
  }
};

export const updateCEFRProfile = async (profileData: any) => {
  try {
    const { skills, placementHistory, overallLevel } = profileData;
    
    const payload = {
      overallLevel,
      skillsJson: JSON.stringify(skills),
      placementHistoryJson: JSON.stringify(placementHistory || []),
      lastAssessed: Date.now(),
      updatedAt: Date.now()
    };

    const existing = await db.select().from(cefrProfile).limit(1);
    
    if (existing.length) {
      await db.update(cefrProfile).set(payload).where(eq(cefrProfile.id, existing[0].id));
    } else {
      await db.insert(cefrProfile).values(payload);
    }
    return true;
  } catch (e) {
    console.error("Update CEFR profile error:", e);
    return false;
  }
};
