// Quick Cache Clear Script
// Run this in your app console or add as a dev tool

import { clearAllLessonCaches, getCacheStats } from '../utils/cacheManager';

async function clearCachesAndShowStats() {
  console.log('🔍 Checking current cache status...');
  
  const statsBefore = await getCacheStats();
  console.log('📊 Before clearing:');
  console.log(`   - Lesson caches: ${statsBefore.totalLessonCaches}`);
  console.log(`   - Level-up caches: ${statsBefore.totalLevelUpCaches}`);
  
  console.log('\n🗑️ Clearing all lesson caches...');
  const clearedCount = await clearAllLessonCaches();
  
  const statsAfter = await getCacheStats();
  console.log('\n✅ After clearing:');
  console.log(`   - Cleared: ${clearedCount} caches`);
  console.log(`   - Remaining lesson caches: ${statsAfter.totalLessonCaches}`);
  console.log(`   - Remaining level-up caches: ${statsAfter.totalLevelUpCaches}`);
  
  console.log('\n✨ Cache clear complete! Generate a new quiz to test.');
}

// Execute
clearCachesAndShowStats().catch(console.error);

export default clearCachesAndShowStats;
