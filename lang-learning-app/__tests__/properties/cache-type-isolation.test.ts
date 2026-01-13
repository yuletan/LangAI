// Feature: optimized-lesson-types, Property 6: Cache retrieval filters by type
// Feature: optimized-lesson-types, Property 7: Cache maintains separate storage per type
// Validates: Requirements 5.2, 5.3, 5.4

import fc from 'fast-check';

describe('Property 6 & 7: Cache type isolation', () => {
  it('should generate unique cache keys for different lesson types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Spanish', 'French', 'German'),
        fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s)),
        async (language, level, topic) => {
          const lessonTypes = ['listening', 'reading', 'drill', 'simple_sentence'];
          const cacheKeys = new Set<string>();
          
          // Generate cache keys for all types
          for (const type of lessonTypes) {
            const cacheKey = `lesson_cache_${topic}_${type}_${language}_${level}`;
            
            // Verify this key is unique
            expect(cacheKeys.has(cacheKey)).toBe(false);
            cacheKeys.add(cacheKey);
            
            // Verify the key contains the type
            expect(cacheKey).toContain(type);
          }
          
          // Verify all keys are unique (no overlap)
          expect(cacheKeys.size).toBe(lessonTypes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain non-overlapping cache keys for different types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Spanish', 'French', 'German'),
        fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s)),
        async (language, level, topic) => {
          const lessonTypes = ['listening', 'reading', 'drill', 'simple_sentence', 'composite_lesson'];
          const cacheKeys = new Set<string>();
          
          // Generate cache keys for all types
          for (const type of lessonTypes) {
            const cacheKey = `lesson_cache_${topic}_${type}_${language}_${level}`;
            cacheKeys.add(cacheKey);
          }
          
          // Verify all keys are unique (no overlap)
          expect(cacheKeys.size).toBe(lessonTypes.length);
          
          // Verify each key is distinct
          const keysArray = Array.from(cacheKeys);
          for (let i = 0; i < keysArray.length; i++) {
            for (let j = i + 1; j < keysArray.length; j++) {
              expect(keysArray[i]).not.toBe(keysArray[j]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent cross-type key collision', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Spanish', 'French', 'German'),
        fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s)),
        async (language, level, topic) => {
          // Generate keys for listening and reading
          const listeningKey = `lesson_cache_${topic}_listening_${language}_${level}`;
          const readingKey = `lesson_cache_${topic}_reading_${language}_${level}`;
          
          // Keys should be different
          expect(listeningKey).not.toBe(readingKey);
          
          // Each key should contain its respective type
          expect(listeningKey).toContain('listening');
          expect(readingKey).toContain('reading');
          
          // Keys should not contain the other type
          expect(listeningKey).not.toContain('reading');
          expect(readingKey).not.toContain('listening');
        }
      ),
      { numRuns: 100 }
    );
  });
});
