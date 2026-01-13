/* global describe, it, expect */
const { calculateNextReview } = require('../services/srsAlgorithm');

describe('SRS Algorithm (SM-2)', () => {
  it('should reset interval to 1 on failure (quality < 3)', () => {
    const result = calculateNextReview(1, 2.5, 10);
    expect(result.interval).toBe(1);
  });

  it('should maintain interval of 1 on first success', () => {
    const result = calculateNextReview(4, 2.5, 1);
    expect(result.interval).toBe(1);
  });

  it('should set interval to 6 on second success (interval was 2?)', () => {
    // Note: The implementation says if interval === 2, next is 6.
    const result = calculateNextReview(5, 2.5, 2);
    expect(result.interval).toBe(6);
  });

  it('should increase interval based on ease factor for subsequent successes', () => {
    const result = calculateNextReview(5, 2.5, 6);
    expect(result.interval).toBe(Math.round(6 * 2.5));
  });

  it('should update ease factor correctly', () => {
    const initialEase = 2.5;
    const result = calculateNextReview(5, initialEase, 1);
    // easeFactor + (0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02)) = easeFactor + 0.1
    expect(result.easeFactor).toBeGreaterThan(initialEase);
  });

  it('should not let ease factor go below 1.3', () => {
    let ease = 1.35;
    const result = calculateNextReview(1, ease, 1);
    expect(result.easeFactor).toBe(1.3);
  });
});