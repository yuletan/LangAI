import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

let db: SQLite.SQLiteDatabase | null = null;

// --- Type Definitions ---

export interface CacheRow {
  hash_key: string;
  response_json: string;
  timestamp: number;
}

export interface PhraseRow {
  id: number;
  original: string;
  translated: string;
  pronunciation: string;
  next_review: number;
  ease_factor: number;
  interval: number;
  created_at: number;
}

export interface UserStatRow {
  id: number;
  date: string;
  type: "prediction" | "chat" | "review" | "correction";
  score: number;
}

export interface ConversationRow {
  id: number;
  scenario: string;
  language: string;
  messages_json: string;
  created_at: number;
}

export interface AchievementRow {
  id: number;
  badge_id: string;
  unlocked_at: number;
}

export interface ChallengeRow {
  id: number;
  title: string;
  description: string;
  goal: number;
  progress: number;
  xp_reward: number;
  type: "translations" | "lessons" | "streak" | "chat";
  expires_at: number;
  completed: number;
}

export interface UserProfileRow {
  id: number;
  total_xp: number;
  current_level: number;
  longest_streak: number;
  languages_used: string;
  updated_at: number;
}

// Badge definitions
export const BADGES = {
  polyglot: { id: "polyglot", name: "🌍 Polyglot", description: "Use 3 different languages", icon: "globe-outline" },
  night_owl: { id: "night_owl", name: "🦉 Night Owl", description: "Study after 11 PM", icon: "moon-outline" },
  streak_master: { id: "streak_master", name: "🔥 Streak Master", description: "Maintain a 7-day streak", icon: "flame-outline" },
  bookworm: { id: "bookworm", name: "📚 Bookworm", description: "Complete 10 lessons", icon: "book-outline" },
  chatterbox: { id: "chatterbox", name: "💬 Chatterbox", description: "Send 50 chat messages", icon: "chatbubbles-outline" },
  speed_learner: { id: "speed_learner", name: "⚡ Speed Learner", description: "20 activities in one day", icon: "flash-outline" },
  first_steps: { id: "first_steps", name: "👶 First Steps", description: "Complete your first lesson", icon: "footsteps-outline" },
  perfectionist: { id: "perfectionist", name: "🎯 Perfectionist", description: "Get 100% on 5 quizzes", icon: "checkmark-circle-outline" },
};

// --- Database Initialization ---

export const initDB = async () => {
  if (Platform.OS === "web") {
    console.log("⚠️ SQLite not available on web platform");
    return;
  }

  try {
    db = await SQLite.openDatabaseAsync("language_app.db");

    // API Cache Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS api_cache (
        hash_key TEXT PRIMARY KEY,
        response_json TEXT,
        timestamp INTEGER
      );
    `);

    // User Stats Table (for analytics)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        type TEXT,
        score INTEGER
      );
    `);

    // Phrases Table (for SRS - Spaced Repetition System)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS phrases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original TEXT NOT NULL,
        translated TEXT NOT NULL,
        pronunciation TEXT,
        next_review INTEGER NOT NULL,
        ease_factor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL
      );
    `);

    // Conversations Table (for saving chats)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario TEXT,
        language TEXT,
        messages_json TEXT,
        created_at INTEGER
      );
    `);

    // Achievements Table (for badges)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_id TEXT UNIQUE NOT NULL,
        unlocked_at INTEGER NOT NULL
      );
    `);

    // Challenges Table (weekly challenges)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        goal INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        xp_reward INTEGER DEFAULT 50,
        type TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        completed INTEGER DEFAULT 0
      );
    `);

    // User Profile Table (XP, level, etc.)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_xp INTEGER DEFAULT 0,
        current_level INTEGER DEFAULT 1,
        longest_streak INTEGER DEFAULT 0,
        languages_used TEXT DEFAULT '',
        updated_at INTEGER
      );
    `);

    // Initialize user profile if not exists
    await db.runAsync(`
      INSERT OR IGNORE INTO user_profile (id, total_xp, current_level, longest_streak, languages_used, updated_at)
      VALUES (1, 0, 1, 0, '', ?)
    `, [Date.now()]);

    // Lesson Cache Table (for caching AI-generated lessons)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS lesson_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        language TEXT NOT NULL,
        level TEXT NOT NULL,
        lesson_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    console.log("✅ SQLite Initialized with all tables");
  } catch (e) {
    console.error("❌ DB Init Error:", e);
  }
};

// --- Cache Functions ---

export const generateCacheKey = async (
  text: string,
  inputLang: string,
  outputLang: string,
  tone: string
): Promise<string> => {
  const input = `${text.trim().toLowerCase()}_${inputLang}_${outputLang}_${tone}`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    input
  );
  return hash;
};

export const checkCache = async (key: string) => {
  if (!db) return null;

  try {
    const result = await db.getAllAsync<CacheRow>(
      "SELECT response_json FROM api_cache WHERE hash_key = ? LIMIT 1",
      [key]
    );

    if (result.length > 0) {
      return JSON.parse(result[0].response_json);
    }
    return null;
  } catch (e) {
    console.error("Cache check error:", e);
    return null;
  }
};

export const saveToCache = async (key: string, data: any) => {
  if (!db) return;
  try {
    await db.runAsync(
      "INSERT OR REPLACE INTO api_cache (hash_key, response_json, timestamp) VALUES (?, ?, ?)",
      [key, JSON.stringify(data), Date.now()]
    );
  } catch (e) {
    console.error("Cache save error:", e);
  }
};

// --- SRS Phrase Functions ---

export const addPhrase = async (
  original: string,
  translated: string,
  pronunciation: string = ""
): Promise<number | null> => {
  if (!db) return null;

  try {
    const now = Date.now();
    // Schedule first review for tomorrow
    const nextReview = now + 24 * 60 * 60 * 1000;

    const result = await db.runAsync(
      `INSERT INTO phrases (original, translated, pronunciation, next_review, ease_factor, interval, created_at) 
       VALUES (?, ?, ?, ?, 2.5, 1, ?)`,
      [original, translated, pronunciation, nextReview, now]
    );

    return result.lastInsertRowId;
  } catch (e) {
    console.error("Add phrase error:", e);
    return null;
  }
};

export const getPhrasesForReview = async (): Promise<PhraseRow[]> => {
  if (!db) return [];

  try {
    const now = Date.now();
    const result = await db.getAllAsync<PhraseRow>(
      "SELECT * FROM phrases WHERE next_review <= ? ORDER BY next_review ASC",
      [now]
    );
    return result;
  } catch (e) {
    console.error("Get phrases for review error:", e);
    return [];
  }
};

export const getAllPhrases = async (): Promise<PhraseRow[]> => {
  if (!db) return [];

  try {
    const result = await db.getAllAsync<PhraseRow>(
      "SELECT * FROM phrases ORDER BY created_at DESC"
    );
    return result;
  } catch (e) {
    console.error("Get all phrases error:", e);
    return [];
  }
};

/**
 * SM-2 Algorithm Implementation
 * Quality ratings:
 * 1 = Complete blackout (review again immediately)
 * 2 = Incorrect, but remembered upon seeing answer
 * 3 = Correct with serious difficulty
 * 4 = Correct with hesitation  
 * 5 = Perfect recall
 */
export const updatePhraseReview = async (
  id: number,
  quality: 1 | 2 | 3 | 4 | 5
): Promise<void> => {
  if (!db) return;

  try {
    // Get current phrase data
    const phrases = await db.getAllAsync<PhraseRow>(
      "SELECT * FROM phrases WHERE id = ?",
      [id]
    );

    if (phrases.length === 0) return;

    const phrase = phrases[0];
    let { ease_factor, interval } = phrase;

    // SM-2 Algorithm
    if (quality < 3) {
      // Failed - reset interval
      interval = 1;
    } else {
      // Passed - calculate new interval
      if (interval === 1) {
        interval = 1;
      } else if (interval === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease_factor);
      }
    }

    // Update ease factor (minimum 1.3)
    ease_factor = Math.max(
      1.3,
      ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculate next review date
    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

    await db.runAsync(
      "UPDATE phrases SET next_review = ?, ease_factor = ?, interval = ? WHERE id = ?",
      [nextReview, ease_factor, interval, id]
    );
  } catch (e) {
    console.error("Update phrase review error:", e);
  }
};

export const deletePhrase = async (id: number): Promise<void> => {
  if (!db) return;
  try {
    await db.runAsync("DELETE FROM phrases WHERE id = ?", [id]);
  } catch (e) {
    console.error("Delete phrase error:", e);
  }
};

// --- User Stats Functions ---

export const recordActivity = async (
  type: "prediction" | "chat" | "review" | "correction",
  score: number = 0
): Promise<void> => {
  if (!db) return;

  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    await db.runAsync(
      "INSERT INTO user_stats (date, type, score) VALUES (?, ?, ?)",
      [today, type, score]
    );
  } catch (e) {
    console.error("Record activity error:", e);
  }
};

export const getActivityByDate = async (): Promise<
  { date: string; count: number }[]
> => {
  if (!db) return [];

  try {
    const result = await db.getAllAsync<{ date: string; count: number }>(
      "SELECT date, COUNT(*) as count FROM user_stats GROUP BY date ORDER BY date DESC LIMIT 30"
    );
    return result;
  } catch (e) {
    console.error("Get activity by date error:", e);
    return [];
  }
};

export const getStatsByType = async (): Promise<
  { type: string; avg_score: number; count: number }[]
> => {
  if (!db) return [];

  try {
    const result = await db.getAllAsync<{
      type: string;
      avg_score: number;
      count: number;
    }>(
      "SELECT type, AVG(score) as avg_score, COUNT(*) as count FROM user_stats GROUP BY type"
    );
    return result;
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
  if (!db) return { totalActivities: 0, totalDays: 0, currentStreak: 0 };

  try {
    // Total activities
    const totalResult = await db.getAllAsync<{ total: number }>(
      "SELECT COUNT(*) as total FROM user_stats"
    );
    const totalActivities = totalResult[0]?.total || 0;

    // Total unique days
    const daysResult = await db.getAllAsync<{ days: number }>(
      "SELECT COUNT(DISTINCT date) as days FROM user_stats"
    );
    const totalDays = daysResult[0]?.days || 0;

    // Calculate streak
    const dates = await db.getAllAsync<{ date: string }>(
      "SELECT DISTINCT date FROM user_stats ORDER BY date DESC"
    );

    let currentStreak = 0;
    const today = new Date();

    for (let i = 0; i < dates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split("T")[0];

      if (dates.some((d) => d.date === checkDateStr)) {
        currentStreak++;
      } else if (i > 0) {
        // Allow missing today but break on other gaps
        break;
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
): Promise<number | null> => {
  if (!db) return null;
  try {
    const result = await db.runAsync(
      "INSERT INTO conversations (scenario, language, messages_json, created_at) VALUES (?, ?, ?, ?)",
      [scenario, language, JSON.stringify(messages), Date.now()]
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error("Save conversation error:", e);
    return null;
  }
};

export const getConversations = async (): Promise<ConversationRow[]> => {
  if (!db) return [];
  try {
    const result = await db.getAllAsync<ConversationRow>(
      "SELECT * FROM conversations ORDER BY created_at DESC"
    );
    return result;
  } catch (e) {
    console.error("Get conversations error:", e);
    return [];
  }
};

export const updateConversation = async (
  id: number,
  messages: any[]
): Promise<boolean> => {
  if (!db) return false;
  try {
    await db.runAsync(
      "UPDATE conversations SET messages_json = ?, created_at = ? WHERE id = ?",
      [JSON.stringify(messages), Date.now(), id]
    );
    console.log("✅ Conversation updated in SQLite");
    return true;
  } catch (e) {
    console.error("Update conversation error:", e);
    return false;
  }
};

/**
 * Finds a similar cached response from previous conversations.
 * Simple exact match on user message for now.
 */
export const findCachedResponse = async (
  userMessage: string,
  scenario: string,
  language: string
): Promise<any | null> => {
  if (!db) return null;

  try {
    // Get recent conversations for this context
    const convos = await db.getAllAsync<ConversationRow>(
      "SELECT messages_json FROM conversations WHERE scenario = ? AND language = ? ORDER BY created_at DESC LIMIT 5",
      [scenario, language]
    );

    for (const c of convos) {
      const messages = JSON.parse(c.messages_json);
      // Iterate through messages to find a matching user query
      for (let i = 0; i < messages.length - 1; i++) {
        if (
          messages[i].role === "user" &&
          messages[i].content.trim().toLowerCase() === userMessage.trim().toLowerCase() &&
          messages[i + 1].role === "ai"
        ) {
          // Found a match! Return the next message (AI response)
          return {
            response: messages[i + 1].content,
            translation: messages[i + 1].translation,
            corrections: messages[i + 1].corrections
          };
        }
      }
    }
  } catch (e) {
    console.error("Find cached response error:", e);
  }
  return null;
};

// --- Achievement Functions ---

export const unlockAchievement = async (badgeId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    // Check if already unlocked
    const existing = await db.getAllAsync<AchievementRow>(
      "SELECT * FROM achievements WHERE badge_id = ?",
      [badgeId]
    );
    if (existing.length > 0) return false;

    await db.runAsync(
      "INSERT INTO achievements (badge_id, unlocked_at) VALUES (?, ?)",
      [badgeId, Date.now()]
    );
    console.log(`🏆 Achievement unlocked: ${badgeId}`);
    return true;
  } catch (e) {
    console.error("Unlock achievement error:", e);
    return false;
  }
};

export const getUnlockedAchievements = async (): Promise<AchievementRow[]> => {
  if (!db) return [];
  try {
    return await db.getAllAsync<AchievementRow>(
      "SELECT * FROM achievements ORDER BY unlocked_at DESC"
    );
  } catch (e) {
    console.error("Get achievements error:", e);
    return [];
  }
};

export const checkAndUnlockAchievements = async (): Promise<string[]> => {
  if (!db) return [];
  const newlyUnlocked: string[] = [];
  
  try {
    const stats = await getTotalStats();
    const profile = await getUserProfile();
    
    // Check streak_master (7-day streak)
    if (stats.currentStreak >= 7) {
      if (await unlockAchievement("streak_master")) newlyUnlocked.push("streak_master");
    }
    
    // Check polyglot (3 languages)
    const languages = profile.languages_used.split(",").filter(l => l.length > 0);
    if (languages.length >= 3) {
      if (await unlockAchievement("polyglot")) newlyUnlocked.push("polyglot");
    }
    
    // Check night_owl (activity after 11 PM)
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) {
      if (await unlockAchievement("night_owl")) newlyUnlocked.push("night_owl");
    }
    
    // Check chatterbox (50 chat messages)
    const chatStats = await db.getAllAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM user_stats WHERE type = 'chat'"
    );
    if (chatStats[0]?.count >= 50) {
      if (await unlockAchievement("chatterbox")) newlyUnlocked.push("chatterbox");
    }
    
    // Check speed_learner (20 activities in one day)
    const today = new Date().toISOString().split("T")[0];
    const todayStats = await db.getAllAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM user_stats WHERE date = ?",
      [today]
    );
    if (todayStats[0]?.count >= 20) {
      if (await unlockAchievement("speed_learner")) newlyUnlocked.push("speed_learner");
    }
    
    return newlyUnlocked;
  } catch (e) {
    console.error("Check achievements error:", e);
    return [];
  }
};

// --- Challenge Functions ---

export const getActiveChallenges = async (): Promise<ChallengeRow[]> => {
  if (!db) return [];
  try {
    const now = Date.now();
    return await db.getAllAsync<ChallengeRow>(
      "SELECT * FROM challenges WHERE expires_at > ? AND completed = 0 ORDER BY expires_at ASC",
      [now]
    );
  } catch (e) {
    console.error("Get active challenges error:", e);
    return [];
  }
};

export const generateWeeklyChallenges = async (): Promise<void> => {
  if (!db) return;
  try {
    // Check if we already have active challenges
    const active = await getActiveChallenges();
    if (active.length >= 3) return;

    const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    
    const challenges = [
      { title: "Translation Master", description: "Complete 50 translations", goal: 50, type: "translations", xp: 100 },
      { title: "Lesson Streak", description: "Complete 5 lessons", goal: 5, type: "lessons", xp: 75 },
      { title: "Chatterbox Week", description: "Send 30 chat messages", goal: 30, type: "chat", xp: 80 },
      { title: "Daily Dedication", description: "Maintain a 5-day streak", goal: 5, type: "streak", xp: 120 },
    ];

    // Pick challenges we don't already have
    for (const c of challenges) {
      const exists = active.find(a => a.title === c.title);
      if (!exists && active.length < 3) {
        await db.runAsync(
          "INSERT INTO challenges (title, description, goal, progress, xp_reward, type, expires_at, completed) VALUES (?, ?, ?, 0, ?, ?, ?, 0)",
          [c.title, c.description, c.goal, c.xp, c.type, oneWeek]
        );
        active.push({ id: 0, title: c.title, description: c.description, goal: c.goal, progress: 0, xp_reward: c.xp, type: c.type as ChallengeRow["type"], expires_at: oneWeek, completed: 0 });
      }
    }
  } catch (e) {
    console.error("Generate challenges error:", e);
  }
};

export const updateChallengeProgress = async (type: string, increment: number = 1): Promise<ChallengeRow | null> => {
  if (!db) return null;
  try {
    const challenges = await getActiveChallenges();
    const matching = challenges.find(c => c.type === type);
    
    if (matching) {
      const newProgress = matching.progress + increment;
      const completed = newProgress >= matching.goal ? 1 : 0;
      
      await db.runAsync(
        "UPDATE challenges SET progress = ?, completed = ? WHERE id = ?",
        [newProgress, completed, matching.id]
      );
      
      // Award XP if completed
      if (completed && !matching.completed) {
        await addXP(matching.xp_reward);
        return { ...matching, progress: newProgress, completed: 1 };
      }
    }
    return null;
  } catch (e) {
    console.error("Update challenge progress error:", e);
    return null;
  }
};

// --- XP & Level Functions ---

export const calculateLevel = (xp: number): number => {
  // Level formula: each level requires 100 * level XP
  // Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, etc.
  let level = 1;
  let xpNeeded = 100;
  let totalXpForLevel = 0;
  
  while (totalXpForLevel + xpNeeded <= xp) {
    totalXpForLevel += xpNeeded;
    level++;
    xpNeeded = 100 * level;
  }
  
  return level;
};

export const getXPForNextLevel = (currentXP: number, currentLevel: number): { needed: number; progress: number } => {
  let totalXpForCurrentLevel = 0;
  for (let l = 1; l < currentLevel; l++) {
    totalXpForCurrentLevel += 100 * l;
  }
  
  const xpInCurrentLevel = currentXP - totalXpForCurrentLevel;
  const xpNeededForNext = 100 * currentLevel;
  
  return {
    needed: xpNeededForNext,
    progress: xpInCurrentLevel,
  };
};

export const addXP = async (amount: number): Promise<{ newXP: number; leveledUp: boolean; newLevel: number }> => {
  if (!db) return { newXP: 0, leveledUp: false, newLevel: 1 };
  try {
    const profile = await getUserProfile();
    const oldLevel = profile.current_level;
    const newXP = profile.total_xp + amount;
    const newLevel = calculateLevel(newXP);
    
    await db.runAsync(
      "UPDATE user_profile SET total_xp = ?, current_level = ?, updated_at = ? WHERE id = 1",
      [newXP, newLevel, Date.now()]
    );
    
    console.log(`✨ +${amount} XP (Total: ${newXP}, Level: ${newLevel})`);
    
    return {
      newXP,
      leveledUp: newLevel > oldLevel,
      newLevel,
    };
  } catch (e) {
    console.error("Add XP error:", e);
    return { newXP: 0, leveledUp: false, newLevel: 1 };
  }
};

export const getUserProfile = async (): Promise<UserProfileRow> => {
  if (!db) return { id: 1, total_xp: 0, current_level: 1, longest_streak: 0, languages_used: "", updated_at: Date.now() };
  try {
    const result = await db.getAllAsync<UserProfileRow>(
      "SELECT * FROM user_profile WHERE id = 1"
    );
    return result[0] || { id: 1, total_xp: 0, current_level: 1, longest_streak: 0, languages_used: "", updated_at: Date.now() };
  } catch (e) {
    console.error("Get user profile error:", e);
    return { id: 1, total_xp: 0, current_level: 1, longest_streak: 0, languages_used: "", updated_at: Date.now() };
  }
};

export const trackLanguageUsed = async (language: string): Promise<void> => {
  if (!db) return;
  try {
    const profile = await getUserProfile();
    const languages = profile.languages_used.split(",").filter(l => l.length > 0);
    
    if (!languages.includes(language)) {
      languages.push(language);
      await db.runAsync(
        "UPDATE user_profile SET languages_used = ?, updated_at = ? WHERE id = 1",
        [languages.join(","), Date.now()]
      );
    }
  } catch (e) {
    console.error("Track language error:", e);
  }
};

export const updateLongestStreak = async (currentStreak: number): Promise<void> => {
  if (!db) return;
  try {
    const profile = await getUserProfile();
    if (currentStreak > profile.longest_streak) {
      await db.runAsync(
        "UPDATE user_profile SET longest_streak = ?, updated_at = ? WHERE id = 1",
        [currentStreak, Date.now()]
      );
    }
  } catch (e) {
    console.error("Update longest streak error:", e);
  }
};

// --- Analytics Functions ---

export const getWeakAreas = async (): Promise<{ area: string; score: number }[]> => {
  if (!db) return [];
  try {
    const stats = await db.getAllAsync<{ type: string; avg_score: number }>(
      "SELECT type, AVG(score) as avg_score FROM user_stats GROUP BY type"
    );
    
    // Map types to readable names and sort by score (lowest first)
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

export const getAccuracyTrend = async (days: number = 7): Promise<{ date: string; accuracy: number }[]> => {
  if (!db) return [];
  try {
    const result = await db.getAllAsync<{ date: string; avg_score: number }>(
      `SELECT date, AVG(score) as avg_score FROM user_stats 
       WHERE date >= date('now', '-${days} days') 
       GROUP BY date ORDER BY date ASC`
    );
    return result.map(r => ({ date: r.date, accuracy: Math.round(r.avg_score || 0) }));
  } catch (e) {
    console.error("Get accuracy trend error:", e);
    return [];
  }
};

// --- Lesson Caching Functions ---

export interface LessonCacheRow {
  id: number;
  topic: string;
  language: string;
  level: string;
  lesson_json: string;
  created_at: number;
}

/**
 * Save a lesson to cache
 */
export const saveLessonToCache = async (
  topic: string,
  language: string,
  level: string,
  lessonData: any
): Promise<void> => {
  if (!db) return;
  try {
    // Keep max 10 lessons per topic/language/level combo
    const existing = await db.getAllAsync<{ id: number }>(
      "SELECT id FROM lesson_cache WHERE topic = ? AND language = ? AND level = ? ORDER BY created_at DESC",
      [topic, language, level]
    );
    
    if (existing.length >= 10) {
      // Delete oldest ones
      const toDelete = existing.slice(9).map(r => r.id);
      for (const id of toDelete) {
        await db.runAsync("DELETE FROM lesson_cache WHERE id = ?", [id]);
      }
    }
    
    await db.runAsync(
      "INSERT INTO lesson_cache (topic, language, level, lesson_json, created_at) VALUES (?, ?, ?, ?, ?)",
      [topic, language, level, JSON.stringify(lessonData), Date.now()]
    );
    console.log(`📦 Lesson cached for ${topic} (${language}/${level})`);
  } catch (e) {
    console.error("Save lesson to cache error:", e);
  }
};

/**
 * Get a random cached lesson for variety
 */
export const getRandomCachedLesson = async (
  topic: string,
  language: string,
  level: string
): Promise<any | null> => {
  if (!db) return null;
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    // Get all non-expired cached lessons for this combo
    const cached = await db.getAllAsync<LessonCacheRow>(
      "SELECT * FROM lesson_cache WHERE topic = ? AND language = ? AND level = ? AND created_at > ? ORDER BY RANDOM() LIMIT 1",
      [topic, language, level, sevenDaysAgo]
    );
    
    if (cached.length > 0) {
      console.log(`📦 Using cached lesson for ${topic}`);
      return JSON.parse(cached[0].lesson_json);
    }
    return null;
  } catch (e) {
    console.error("Get cached lesson error:", e);
    return null;
  }
};

/**
 * Clean up expired lessons (older than 7 days)
 */
export const cleanExpiredLessons = async (): Promise<void> => {
  if (!db) return;
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await db.runAsync(
      "DELETE FROM lesson_cache WHERE created_at < ?",
      [sevenDaysAgo]
    );
  } catch (e) {
    console.error("Clean expired lessons error:", e);
  }
};

/**
 * Add phrase with additional details (explanation and use_case)
 */
export const addPhraseWithDetails = async (
  original: string,
  translated: string,
  pronunciation: string = "",
  explanation: string = "",
  useCase: string = ""
): Promise<number | null> => {
  if (!db) return null;

  try {
    const now = Date.now();
    // Schedule first review for tomorrow
    const nextReview = now + 24 * 60 * 60 * 1000;
    
    // Store explanation and use_case in pronunciation field with delimiter
    const extendedData = pronunciation + 
      (explanation ? `\n---EXPLANATION---\n${explanation}` : "") +
      (useCase ? `\n---USECASE---\n${useCase}` : "");

    const result = await db.runAsync(
      `INSERT INTO phrases (original, translated, pronunciation, next_review, ease_factor, interval, created_at) 
       VALUES (?, ?, ?, ?, 2.5, 1, ?)`,
      [original, translated, extendedData, nextReview, now]
    );

    console.log(`💾 Phrase saved with details: ${original.substring(0, 30)}...`);
    return result.lastInsertRowId;
  } catch (e) {
    console.error("Add phrase with details error:", e);
    return null;
  }
};
