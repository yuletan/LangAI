import { calculateNextReview } from "../../services/srsAlgorithm";

describe("SRS Algorithm (SM-2)", () => {
  test("Blackout (quality 1) resets interval to 1", () => {
    const { interval } = calculateNextReview(1, 2.5, 10);
    expect(interval).toBe(1);
  });

  test("Correct with difficulty (quality 3) increases interval", () => {
    const { interval } = calculateNextReview(3, 2.5, 6);
    // 6 * 2.5 = 15
    expect(interval).toBe(15);
  });

  test("Perfect recall (quality 5) increases interval and ease factor", () => {
    const currentEase = 2.5;
    const { interval, easeFactor } = calculateNextReview(5, currentEase, 10);
    expect(interval).toBe(25); // 10 * 2.5
    expect(easeFactor).toBeGreaterThan(currentEase);
  });

  test("Ease factor never goes below 1.3", () => {
    const { easeFactor } = calculateNextReview(1, 1.3, 1);
    expect(easeFactor).toBe(1.3);
  });
});
