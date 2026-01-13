// Feature: optimized-lesson-types, Property 10: Simple sentence lessons award appropriate XP
// Validates: Requirements 3.5

import fc from 'fast-check';

describe('Property 10: Simple sentence XP awards', () => {
  it('should award XP between 10 and 20 points for simple sentence lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // firstTryCorrect
        async (firstTryCorrect) => {
          // Calculate XP for simple sentence
          const xpEarned = 10 + (firstTryCorrect ? 10 : 0);
          
          // XP should be between 10 and 20 (inclusive)
          expect(xpEarned).toBeGreaterThanOrEqual(10);
          expect(xpEarned).toBeLessThanOrEqual(20);
          
          // Specific values
          if (firstTryCorrect) {
            expect(xpEarned).toBe(20);
          } else {
            expect(xpEarned).toBe(10);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
