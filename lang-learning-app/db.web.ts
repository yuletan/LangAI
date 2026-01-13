import { supabase } from "@/lib/supabase";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CONVERSATIONS_KEY = "saved_conversations";

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
  nextReview: number;
  easeFactor: number;
  interval: number;
  createdAt: number;
  user_id?: string;
}

export interface UserStatRow {
  id: number;
  date: string;
  type: "prediction" | "chat" | "review" | "correction";
  score: number;
  user_id?: string;
}

export interface ConversationRow {
  id: number;
  scenario: string;
  language: string;
  messages_json: string;
  created_at: number;
  user_id?: string;
}

// Gamification Interfaces
export interface AchievementRow {
  id: number;
  badge_id: string;
  unlocked_at: number;
  user_id?: string;
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
  user_id?: string;
}

export interface UserProfileRow {
  id: number;
  total_xp: number;
  current_level: number;
  longest_streak: number;
  languages_used: string;
  updated_at: number;
  user_id?: string;
}

// Badges constant
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

// --- Initialization ---
export const initDB = async () => {
  console.log("⚡ Supabase DB provider initialized for Web");
  // Optional: Check connection
  supabase.from('api_cache').select('count', { count: 'exact', head: true })
    .then(({ error }) => {
      if (error) console.log("⚠️ Supabase connection check failed (tables might be missing):", error.message);
      else console.log("✅ Supabase connection verified");
    });
};

// --- Cache Functions ---

export const generateCacheKey = async (
  text: string,
  inputLang: string,
  outputLang: string,
  tone: string
): Promise<string> => {
  // Simple deterministic key for web if crypto is limited, or use whatever works
  return `${text.trim().toLowerCase()}_${inputLang}_${outputLang}_${tone}`;
};

export const checkCache = async (key: string) => {
  const { data, error } = await supabase
    .from('api_cache')
    .select('response_json')
    .eq('hash_key', key)
    .single();

  if (error || !data) return null;
  return JSON.parse(data.response_json);
};

export const saveToCache = async (key: string, data: any) => {
  await supabase.from('api_cache').upsert({
    hash_key: key,
    response_json: JSON.stringify(data),
    timestamp: Date.now()
  });
};

// --- Phrase Functions ---

export const addPhrase = async (
  original: string,
  translated: string,
  pronunciation: string = ""
): Promise<number | null> => {
  const now = Date.now();
  const nextReview = now + 24 * 60 * 60 * 1000;

  const { data, error } = await supabase.from('phrases').insert({
    original,
    translated,
    pronunciation,
    next_review: nextReview,
    ease_factor: 2.5,
    interval: 1,
    created_at: now
  }).select('id').single();

  if (error) {
    console.error("Supabase add phrase error:", error);
    return null;
  }
  return data?.id || null;
};

export const addPhraseWithDetails = async (
  original: string,
  translated: string,
  pronunciation: string = "",
  explanation: string = "",
  useCase: string = ""
) => {
  // Currently Supabase schema doesn't support explanation/useCase in this migration, 
  // keeping it simple to match actions.ts
  console.log(`📝 Saving phrase with details (Supabase): ${explanation}, ${useCase}`);
  return addPhrase(original, translated, pronunciation);
};

export const getPhrasesForReview = async (): Promise<PhraseRow[]> => {
  const now = Date.now();
  const { data, error } = await supabase
    .from('phrases')
    .select('*')
    .lte('next_review', now)
    .order('next_review', { ascending: true });

  if (error) {
    console.error("Supabase get review phrases error:", error);
    return [];
  }
  return (data || []).map(p => ({
    ...p,
    nextReview: p.next_review,
    easeFactor: p.ease_factor,
    createdAt: p.created_at
  }));
};

export const getAllPhrases = async (): Promise<PhraseRow[]> => {
  const { data, error } = await supabase
    .from('phrases')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase get all phrases error:", error);
    return [];
  }
  return (data || []).map(p => ({
    ...p,
    nextReview: p.next_review,
    easeFactor: p.ease_factor,
    createdAt: p.created_at
  }));
};

export const updatePhraseReview = async (
  id: number,
  quality: 1 | 2 | 3 | 4 | 5
): Promise<void> => {
  // Retrieve current phrase state first
  const { data: phrase, error: fetchError } = await supabase
    .from('phrases')
    .select('*')
    .eq('id', id)
    .single();
    
  if (fetchError || !phrase) return;

  let { ease_factor, interval } = phrase;

  // SM-2 Algorithm logic
  if (quality < 3) {
    interval = 1;
  } else {
    if (interval === 1) interval = 1;
    else if (interval === 2) interval = 6;
    else interval = Math.round(interval * ease_factor);
  }

  ease_factor = Math.max(
    1.3,
    ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

  await supabase.from('phrases').update({
    next_review: nextReview,
    ease_factor,
    interval
  }).eq('id', id);
};

export const deletePhrase = async (id: number): Promise<void> => {
  await supabase.from('phrases').delete().eq('id', id);
};

// --- Stats Functions ---

export const recordActivity = async (
  type: "prediction" | "chat" | "review" | "correction",
  score: number = 0
): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  await supabase.from('user_stats').insert({
    date: today,
    type,
    score
  });
};

export const getActivityByDate = async (): Promise<{ date: string; count: number }[]> => {
  // Aggregation is trickier in client-side Supabase without RPC.
  // We'll fetch raw data and aggregate in JS for simplicity, or use RPC if available.
  // For standard usage, simple client-side aggregation is fine for small datasets.
  
  const { data, error } = await supabase
    .from('user_stats')
    .select('date')
    .order('date', { ascending: false })
    .limit(500); // Limit to recent history to avoid huge fetches

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  data.forEach((row: any) => {
    counts[row.date] = (counts[row.date] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
};

export const getStatsByType = async (): Promise<{ type: string; avg_score: number; count: number }[]> => {
  const { data, error } = await supabase.from('user_stats').select('type, score');
  
  if (error || !data) return [];

  const stats: Record<string, { totalScore: number; count: number }> = {};
  
  data.forEach((row: any) => {
    if (!stats[row.type]) stats[row.type] = { totalScore: 0, count: 0 };
    stats[row.type].totalScore += row.score;
    stats[row.type].count += 1;
  });

  return Object.entries(stats).map(([type, { totalScore, count }]) => ({
    type,
    avg_score: totalScore / count,
    count
  }));
};

export const getTotalStats = async (): Promise<{
  totalActivities: number;
  totalDays: number;
  currentStreak: number;
}> => {
  // This might be heavy if table is large. RPC 'get_total_stats' recommended in production.
  // Fetching light version
  const { count, error } = await supabase.from('user_stats').select('*', { count: 'exact', head: true });
  
  if (error) return { totalActivities: 0, totalDays: 0, currentStreak: 0 };
  
  const totalActivities = count || 0;

  // For unique days and streak, we need date data
  const { data: datesData } = await supabase
    .from('user_stats')
    .select('date')
    .order('date', { ascending: false });
    
  const uniqueDays = new Set(datesData?.map((d: any) => d.date));
  const totalDays = uniqueDays.size;

  // Streak calculation
  let currentStreak = 0;
  const today = new Date();
  const dates = Array.from(uniqueDays).sort().reverse(); // Descending dates
  
  for (let i = 0; i < dates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split("T")[0];

    // If latest date is today or yesterday (streak technically continues if you missed today but did yesterday? 
    // Usually strict streak checks today. If we allow "haven't done today YET", we check yesterday.)
    // Logic from original: allow missing today if i>0 check
    
    // Simplified: check if date exists in our set
    if (uniqueDays.has(checkDateStr)) {
      currentStreak++;
    } else if (i === 0 && !uniqueDays.has(checkDateStr)) {
      // If we miss today (i=0), we check yesterday to see if streak is still active but not incremented for today
      // Actually standard loop: if today is missing, currentStreak sticks at 0 unless we handle "yesterday" logic.
      // Original logic:
      // if (dates.some(d => d.date === checkDateStr)) streak++
      // The original logic handles "today" explicitly. 
      // If today is NOT in list, i=0 fails. Loop continues? 
      // Original: "else if (i > 0) break". So if i=0 is missing, loop continues to i=1.
      continue; 
    } else {
      break;
    }
  }

  return { totalActivities, totalDays, currentStreak };
};

// CEFR Cache Version
const CEFR_CACHE_VERSION = "v2_cefr_strict";

export const saveLessonToCache = async (
  topic: string,
  language: string,
  level: string,
  lessonData: any
) => {
  try {
    const wrappedData = {
      _cacheVersion: CEFR_CACHE_VERSION,
      data: lessonData
    };
    
    await supabase.from('lesson_cache').insert({
      topic,
      language,
      level,
      lesson_json: JSON.stringify(wrappedData),
      created_at: Date.now()
    });
  } catch (e) {
    console.error("Supabase save lesson cache error:", e);
  }
};

export const getRandomCachedLesson = async (
  topic: string,
  language: string,
  level: string
) => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const { data, error } = await supabase
      .from('lesson_cache')
      .select('*')
      .eq('topic', topic)
      .eq('language', language)
      .eq('level', level)
      .gt('created_at', sevenDaysAgo);

    if (error || !data || data.length === 0) return null;

    // Pick random
    const result = data[Math.floor(Math.random() * data.length)];
    const parsed = JSON.parse(result.lesson_json);
    
    if (parsed._cacheVersion === CEFR_CACHE_VERSION) {
      return parsed.data;
    }
    return null;
  } catch (e) {
    console.error("Supabase get cached lesson error:", e);
    return null;
  }
};

// --- Conversation Functions ---

export const saveConversation = async (
  scenario: string,
  language: string,
  messages: any[]
): Promise<number | null> => {
  try {
    // Try Supabase first
    const { data, error } = await supabase.from('conversations').insert({
      scenario,
      language,
      messages_json: JSON.stringify(messages),
      created_at: Date.now()
    }).select('id').single();

    if (!error && data?.id) {
      return data.id;
    }
  } catch (e) {
    console.log("Supabase save failed, using AsyncStorage fallback");
  }

  // Fallback to AsyncStorage
  try {
    const existing = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    const conversations: ConversationRow[] = existing ? JSON.parse(existing) : [];
    const newId = Date.now();
    const newConversation: ConversationRow = {
      id: newId,
      scenario,
      language,
      messages_json: JSON.stringify(messages),
      created_at: Date.now()
    };
    conversations.unshift(newConversation);
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 50))); // Keep last 50
    console.log("✅ Conversation saved to AsyncStorage");
    return newId;
  } catch (asyncError) {
    console.error("AsyncStorage save conversation error:", asyncError);
    return null;
  }
};

export const getConversations = async (): Promise<ConversationRow[]> => {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.log("Supabase get failed, using AsyncStorage fallback");
  }

  // Fallback to AsyncStorage
  try {
    const existing = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (asyncError) {
    console.error("AsyncStorage get conversations error:", asyncError);
    return [];
  }
};

export const updateConversation = async (
  id: number,
  messages: any[]
): Promise<boolean> => {
  console.log("📝 Updating conversation ID:", id, "with", messages.length, "messages");
  
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('conversations')
      .update({ 
        messages_json: JSON.stringify(messages),
        created_at: Date.now() // Update timestamp
      })
      .eq('id', id)
      .select();

    if (!error) {
      console.log("✅ Conversation updated in Supabase, rows affected:", data?.length || 0);
      return true;
    } else {
      console.log("⚠️ Supabase update error:", error.message);
    }
  } catch (e) {
    console.log("Supabase update failed:", e);
  }

  // Fallback to AsyncStorage
  try {
    const existing = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    const conversations: ConversationRow[] = existing ? JSON.parse(existing) : [];
    const index = conversations.findIndex(c => c.id === id);
    
    console.log("AsyncStorage fallback - found index:", index, "for ID:", id);
    
    if (index !== -1) {
      conversations[index].messages_json = JSON.stringify(messages);
      conversations[index].created_at = Date.now();
      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
      console.log("✅ Conversation updated in AsyncStorage");
      return true;
    }
    console.log("⚠️ Conversation not found in AsyncStorage");
    return false;
  } catch (asyncError) {
    console.error("AsyncStorage update conversation error:", asyncError);
    return false;
  }
};

export const findCachedResponse = async (
  userMessage: string,
  scenario: string,
  language: string
): Promise<any | null> => {
  let convos: any[] = [];

  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('conversations')
      .select('messages_json')
      .eq('scenario', scenario)
      .eq('language', language)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      convos = data;
    }
  } catch (e) {
    console.log("Supabase cache lookup failed, trying AsyncStorage");
  }

  // Fallback to AsyncStorage if Supabase returned nothing
  if (convos.length === 0) {
    try {
      const existing = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      const allConvos: ConversationRow[] = existing ? JSON.parse(existing) : [];
      convos = allConvos
        .filter(c => c.scenario === scenario && c.language === language)
        .slice(0, 5);
    } catch (asyncError) {
      console.log("AsyncStorage cache lookup error:", asyncError);
    }
  }

  for (const c of convos) {
    const messages = typeof c.messages_json === 'string' ? JSON.parse(c.messages_json) : c.messages_json;
    for (let i = 0; i < messages.length - 1; i++) {
      if (
        messages[i].role === "user" &&
        messages[i].content.trim().toLowerCase() === userMessage.trim().toLowerCase() &&
        messages[i + 1].role === "ai"
      ) {
        return {
          response: messages[i + 1].content,
          translation: messages[i + 1].translation,
          corrections: messages[i + 1].corrections
        };
      }
    }
  }
  return null;
};

// --- Gamification Helpers used within other functions ---

// --- Gamification Helpers used within other functions ---

const ensureUserProfile = async () => {
    const { data } = await supabase.from('user_profile').select('*').limit(1).single();
    if (!data) {
        await supabase.from('user_profile').insert({
            total_xp: 0,
            current_level: 1,
            longest_streak: 0,
            languages_used: '',
            updated_at: Date.now()
        });
    }
};

export const getUserProfile = async (): Promise<UserProfileRow> => {
  const { data, error } = await supabase.from('user_profile').select('*').limit(1).single();
  if (error || !data) {
     return { 
       id: 1, 
       totalXp: 0, 
       currentLevel: 1, 
       longestStreak: 0, 
       languagesUsed: "", 
       updatedAt: Date.now() 
     } as any;
  }
  // Map snake_case to camelCase
  return {
    id: data.id,
    totalXp: data.total_xp,
    currentLevel: data.current_level,
    longestStreak: data.longest_streak,
    languagesUsed: data.languages_used,
    updatedAt: data.updated_at,
    userId: data.user_id
  } as any;
};

export const addXP = async (amount: number): Promise<{ newXP: number; leveledUp: boolean; newLevel: number }> => {
  const profile = await getUserProfile();
  const oldLevel = (profile as any).currentLevel || 1;
  const newXP = ((profile as any).totalXp || 0) + amount;
  const newLevel = calculateLevel(newXP);
  
  await supabase.from('user_profile').update({
      total_xp: newXP,
      current_level: newLevel,
      updated_at: Date.now()
  }).eq('id', profile.id);

  // Also sync to AsyncStorage for quick web access
  await AsyncStorage.setItem("totalXp", newXP.toString());

  return { newXP, leveledUp: newLevel > oldLevel, newLevel };
};

export const calculateLevel = (xp: number): number => {
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
  return { needed: xpNeededForNext, progress: xpInCurrentLevel };
};

export const resetAllProgress = async (): Promise<boolean> => {
  try {
    // Clear Supabase tables
    await Promise.all([
      supabase.from('user_stats').delete().neq('id', 0),
      supabase.from('achievements').delete().neq('id', 0),
      supabase.from('challenges').delete().neq('id', 0),
      supabase.from('phrases').delete().neq('id', 0),
      supabase.from('conversations').delete().neq('id', 0),
      supabase.from('lesson_cache').delete().neq('id', 0),
      supabase.from('api_cache').delete().neq('hash_key', ''),
      supabase.from('user_profile').delete().neq('id', 0),
    ]);
    
    // Clear AsyncStorage
    await AsyncStorage.clear();
    
    // Re-initialize profile
    await ensureUserProfile();
    return true;
  } catch (e) {
    console.error("Reset progress error (Supabase):", e);
    return false;
  }
};

// --- Achievement & Challenge Stubs ---
export const unlockAchievement = async (badgeId: string): Promise<boolean> => {
    const { data } = await supabase.from('achievements').select('*').eq('badge_id', badgeId).single();
    if (data) return false;

    await supabase.from('achievements').insert({ badge_id: badgeId, unlocked_at: Date.now() });
    return true;
};

export const getUnlockedAchievements = async (): Promise<AchievementRow[]> => {
    const { data } = await supabase.from('achievements').select('*');
    return (data || []).map(a => ({
      id: a.id,
      badgeId: a.badge_id,
      unlockedAt: a.unlocked_at,
      userId: a.user_id
    })) as any;
};

export const checkAndUnlockAchievements = async (): Promise<string[]> => {
    return [];
};

export const getActiveChallenges = async (): Promise<ChallengeRow[]> => {
    const now = Date.now();
    const { data } = await supabase.from('challenges').select('*').gt('expires_at', now).eq('completed', 0);
    return (data || []).map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      goal: c.goal,
      progress: c.progress,
      xpReward: c.xp_reward,
      type: c.type,
      expiresAt: c.expires_at,
      completed: c.completed,
      userId: c.user_id
    })) as any;
};

export const generateWeeklyChallenges = async (): Promise<void> => {
    const active = await getActiveChallenges();
    if (active.length >= 3) return;
    
    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

    const defaults = [
      { title: "Translation Master", description: "Save 10 new phrases", goal: 10, type: "translations", xp_reward: 100 },
      { title: "Daily Learner", description: "Complete 5 grammar lessons", goal: 5, type: "lessons", xp_reward: 150 },
      { title: "Chatbox Hero", description: "Send 20 chat messages", goal: 20, type: "chat", xp_reward: 120 }
    ];

    for (const challenge of defaults) {
      await supabase.from('challenges').insert({
        ...challenge,
        progress: 0,
        expires_at: nextWeek,
        completed: 0
      });
    }
};

export const updateChallengeProgress = async (type: string, increment: number = 1): Promise<ChallengeRow | null> => {
    return null;
};

export const trackLanguageUsed = async (language: string): Promise<void> => {
    try {
      const profile = await getUserProfile();
      if (!profile) return;
      const languages = ((profile as any).languagesUsed || "").split(",").filter((l: string) => l.length > 0);
      
      if (!languages.includes(language)) {
        languages.push(language);
        await supabase.from('user_profile').update({
          languages_used: languages.join(","),
          updated_at: Date.now()
        }).eq('id', profile.id);
      }
    } catch (e) {
      console.error("Track language error:", e);
    }
};

export const updateLongestStreak = async (currentStreak: number): Promise<void> => {
    try {
      const profile = await getUserProfile();
      if (!profile) return;
      if (currentStreak > (profile as any).longestStreak) {
        await supabase.from('user_profile').update({
          longest_streak: currentStreak,
          updated_at: Date.now()
        }).eq('id', profile.id);
      }
    } catch (e) {
      console.error("Update streak error:", e);
    }
};

export const getWeakAreas = async (): Promise<{ area: string; score: number }[]> => {
    return [];
};

export const getAccuracyTrend = async (days: number = 7): Promise<{ date: string; accuracy: number }[]> => {
    return [];
};

// --- CEFR Profile Functions ---

export const getCEFRProfile = async (): Promise<any> => {
  const { data, error } = await supabase.from('cefr_profile').select('*').limit(1).single();
  if (error || !data) {
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
  
  return {
    id: data.id,
    overallLevel: data.overall_level,
    skills: typeof data.skills_json === 'string' ? JSON.parse(data.skills_json) : data.skills_json,
    placementHistory: typeof data.placement_history_json === 'string' ? JSON.parse(data.placement_history_json) : data.placement_history_json,
    lastAssessed: data.last_assessed,
    updatedAt: data.updated_at
  };
};

export const updateCEFRProfile = async (profileData: any): Promise<void> => {
  const { skills, placementHistory, overallLevel } = profileData;
  
  const payload = {
    overall_level: overallLevel,
    skills_json: JSON.stringify(skills),
    placement_history_json: JSON.stringify(placementHistory || []),
    last_assessed: Date.now(),
    updated_at: Date.now()
  };

  const { data: existing } = await supabase.from('cefr_profile').select('id').limit(1).single();
  
  if (existing) {
    await supabase.from('cefr_profile').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('cefr_profile').insert(payload);
  }
};

