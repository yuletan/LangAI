/**
 * SM-2 Algorithm Implementation
 * Quality ratings:
 * 1 = Complete blackout (review again immediately)
 * 2 = Incorrect, but remembered upon seeing answer
 * 3 = Correct with serious difficulty
 * 4 = Correct with hesitation  
 * 5 = Perfect recall
 */
export function calculateNextReview(
  quality: 1 | 2 | 3 | 4 | 5,
  currentEaseFactor: number = 2.5,
  currentInterval: number = 1
) {
  let easeFactor = currentEaseFactor;
  let interval = currentInterval;

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
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Calculate next review date
  const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    nextReview,
    easeFactor,
    interval,
  };
}
