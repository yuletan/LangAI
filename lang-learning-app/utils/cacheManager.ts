import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all lesson caches
 * Run this when CEFR level changes or to force fresh quiz generation
 */
export async function clearAllLessonCaches() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const lessonCacheKeys = keys.filter(key => 
      key.startsWith('lesson_cache_') || 
      key.startsWith('level_up_cache_')
    );
    
    if (lessonCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(lessonCacheKeys);
      console.log(`🗑️ Cleared ${lessonCacheKeys.length} lesson caches`);
      return lessonCacheKeys.length;
    } else {
      console.log('ℹ️ No lesson caches to clear');
      return 0;
    }
  } catch (error) {
    console.error('Error clearing lesson caches:', error);
    throw error;
  }
}

/**
 * Clear lesson cache for a specific topic
 */
export async function clearTopicCache(topic: string, language: string, level: string) {
  try {
    const cacheKey = `lesson_cache_${topic}_${language}_${level}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Cleared cache for: ${cacheKey}`);
  } catch (error) {
    console.error('Error clearing topic cache:', error);
  }
}

/**
 * Clear level-up quiz cache for a specific level
 */
export async function clearLevelUpCache(level: string, language: string) {
  try {
    const cacheKey = `level_up_cache_${level}_${language}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Cleared level-up cache for: ${cacheKey}`);
  } catch (error) {
    console.error('Error clearing level-up cache:', error);
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const lessonCaches = keys.filter(k => k.startsWith('lesson_cache_'));
    const levelUpCaches = keys.filter(k => k.startsWith('level_up_cache_'));
    
    return {
      totalLessonCaches: lessonCaches.length,
      totalLevelUpCaches: levelUpCaches.length,
      lessonCacheKeys: lessonCaches,
      levelUpCacheKeys: levelUpCaches
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalLessonCaches: 0,
      totalLevelUpCaches: 0,
      lessonCacheKeys: [],
      levelUpCacheKeys: []
    };
  }
}
