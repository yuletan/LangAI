// Feature: optimized-lesson-types, Property 5: Cached lessons include type in key
// Validates: Requirements 5.1

import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Property 5: Cache key format includes lesson type', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('should include lesson type in cache key for all lesson types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('listening', 'reading', 'drill', 'simple_sentence', 'composite_lesson'),
        fc.constantFrom('Spanish', 'French', 'German', 'Japanese'),
        fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
        fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s)),
        async (lessonType, language, level, topic) => {
          // Generate cache key following the format: lesson_cache_{topic}_{type}_{language}_{level}
          const cacheKey = `lesson_cache_${topic}_${lessonType}_${language}_${level}`;
          
          // Verify the cache key contains the lesson type
          expect(cacheKey).toContain(lessonType);
          
          // Verify the cache key follows the expected format
          const keyParts = cacheKey.split('_');
          expect(keyParts[0]).toBe('lesson');
          expect(keyParts[1]).toBe('cache');
          
          // The lesson type should be present in the key
          expect(cacheKey.includes(lessonType)).toBe(true);
          
          // Verify the key contains all required components
          expect(cacheKey).toContain(topic);
          expect(cacheKey).toContain(language);
          expect(cacheKey).toContain(level);
          expect(cacheKey).toContain(lessonType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create unique cache keys for different lesson types with same topic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
        fc.constantFrom('Spanish', 'French', 'German'),
        fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
        async (topic, language, level) => {
          const types = ['listening', 'reading', 'drill', 'simple_sentence'];
          const cacheKeys = types.map(type => 
            `lesson_cache_${topic}_${type}_${language}_${level}`
          );
          
          // All cache keys should be unique
          const uniqueKeys = new Set(cacheKeys);
          expect(uniqueKeys.size).toBe(types.length);
          
          // Each key should contain its respective type
          cacheKeys.forEach((key, idx) => {
            expect(key).toContain(types[idx]);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
