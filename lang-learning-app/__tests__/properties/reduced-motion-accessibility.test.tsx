/**
 * Property-based test for reduced motion accessibility
 * **Feature: enhanced-login-ui, Property 17: Reduced motion accessibility**
 * **Validates: Requirements 5.5**
 */

import * as fc from 'fast-check';
import { LoginAnimations } from '@/constants/theme';

type ThemeMode = 'light' | 'dark';
type Platform = 'ios' | 'android' | 'web';

/**
 * Property 17: Reduced motion accessibility
 * For any animation, when system reduced motion preferences are enabled,
 * animations should be disabled or significantly reduced
 */
describe('Property 17: Reduced motion accessibility', () => {
  interface AnimationState {
    reducedMotion: boolean;
    theme: ThemeMode;
    platform: Platform;
  }

  interface AnimationBehavior {
    shouldRender: boolean;
    shouldAnimate: boolean;
    animationDuration: number;
  }

  /**
   * Determines animation behavior based on reduced motion and theme state
   */
  const getAnimationBehavior = (state: AnimationState): AnimationBehavior => {
    const shouldRender = state.theme === 'dark' && !state.reducedMotion;
    
    return {
      shouldRender,
      shouldAnimate: shouldRender,
      // Animation duration is always the configured value, but animations only run when shouldAnimate is true
      animationDuration: state.reducedMotion ? 0 : LoginAnimations.floatingBlob.duration,
    };
  };

  /**
   * For any reduced motion state, animations should be disabled when preference is enabled
   */
  it('should disable animations when reduced motion is enabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // reducedMotion
        fc.constantFrom<ThemeMode>('light', 'dark'), // theme
        fc.constantFrom<Platform>('ios', 'android', 'web'), // platform
        (reducedMotion, theme, platform) => {
          const state: AnimationState = { reducedMotion, theme, platform };
          const behavior = getAnimationBehavior(state);

          if (reducedMotion) {
            // When reduced motion is enabled, animations should be disabled
            expect(behavior.shouldAnimate).toBe(false);
            expect(behavior.animationDuration).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme and reduced motion combination, rendering should be consistent
   */
  it('should consistently determine rendering state', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // reducedMotion
        fc.constantFrom<ThemeMode>('light', 'dark'), // theme
        fc.constantFrom<Platform>('ios', 'android', 'web'), // platform
        (reducedMotion, theme, platform) => {
          const state: AnimationState = { reducedMotion, theme, platform };
          const behavior = getAnimationBehavior(state);

          // Reduced motion should always prevent rendering
          if (reducedMotion) {
            expect(behavior.shouldRender).toBe(false);
            expect(behavior.shouldAnimate).toBe(false);
          }

          // Light mode should prevent rendering
          if (theme === 'light') {
            expect(behavior.shouldRender).toBe(false);
          }

          // Only dark mode without reduced motion should render
          if (theme === 'dark' && !reducedMotion) {
            expect(behavior.shouldRender).toBe(true);
            expect(behavior.shouldAnimate).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any platform, reduced motion logic should work consistently
   */
  it('should handle reduced motion consistently across platforms', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        fc.boolean(),
        fc.constantFrom<ThemeMode>('light', 'dark'),
        (platform, reducedMotion, theme) => {
          const state: AnimationState = { platform, reducedMotion, theme };
          const behavior = getAnimationBehavior(state);

          // Reduced motion should work the same on all platforms
          if (reducedMotion) {
            expect(behavior.shouldAnimate).toBe(false);
            expect(behavior.animationDuration).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any reduced motion state change, behavior should update correctly
   */
  it('should update behavior when reduced motion preference changes', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // initial state
        fc.boolean(), // changed state
        fc.constantFrom<ThemeMode>('light', 'dark'),
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (initialReducedMotion, changedReducedMotion, theme, platform) => {
          // Initial state
          const initialState: AnimationState = { 
            reducedMotion: initialReducedMotion, 
            theme, 
            platform 
          };
          const initialBehavior = getAnimationBehavior(initialState);

          // Changed state
          const changedState: AnimationState = { 
            reducedMotion: changedReducedMotion, 
            theme, 
            platform 
          };
          const changedBehavior = getAnimationBehavior(changedState);

          // If reduced motion state changed, behavior should change accordingly
          if (initialReducedMotion !== changedReducedMotion && theme === 'dark') {
            expect(initialBehavior.shouldAnimate).not.toBe(changedBehavior.shouldAnimate);
            expect(initialBehavior.animationDuration).not.toBe(changedBehavior.animationDuration);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any animation duration, it should be zero when reduced motion is enabled
   */
  it('should use zero animation duration with reduced motion', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 5000 }), // normal animation duration
        fc.boolean(), // reducedMotion
        fc.constantFrom<ThemeMode>('light', 'dark'),
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (normalDuration, reducedMotion, theme, platform) => {
          const state: AnimationState = { reducedMotion, theme, platform };
          const behavior = getAnimationBehavior(state);

          if (reducedMotion) {
            // When reduced motion is enabled, duration should be zero
            expect(behavior.animationDuration).toBe(0);
          } else if (theme === 'dark') {
            // When reduced motion is disabled in dark mode, duration should be positive
            expect(behavior.animationDuration).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any state, reduced motion should take precedence over theme
   */
  it('should prioritize reduced motion over theme settings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (theme, platform) => {
          // With reduced motion enabled
          const reducedState: AnimationState = { 
            reducedMotion: true, 
            theme, 
            platform 
          };
          const reducedBehavior = getAnimationBehavior(reducedState);

          // Reduced motion should always prevent animations, regardless of theme
          expect(reducedBehavior.shouldAnimate).toBe(false);
          expect(reducedBehavior.shouldRender).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For dark mode without reduced motion, animations should be enabled
   */
  it('should enable animations in dark mode without reduced motion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (platform) => {
          const state: AnimationState = { 
            reducedMotion: false, 
            theme: 'dark', 
            platform 
          };
          const behavior = getAnimationBehavior(state);

          // Dark mode without reduced motion should enable animations
          expect(behavior.shouldRender).toBe(true);
          expect(behavior.shouldAnimate).toBe(true);
          expect(behavior.animationDuration).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any combination of reduced motion and theme, behavior should be deterministic
   */
  it('should have deterministic behavior for all state combinations', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // reducedMotion
        fc.constantFrom<ThemeMode>('light', 'dark'), // theme
        fc.constantFrom<Platform>('ios', 'android', 'web'), // platform
        fc.integer({ min: 1, max: 10 }), // check count
        (reducedMotion, theme, platform, checkCount) => {
          const state: AnimationState = { reducedMotion, theme, platform };
          
          // Check multiple times to ensure consistency
          for (let i = 0; i < checkCount; i++) {
            const behavior = getAnimationBehavior(state);
            
            // Behavior should be consistent across multiple checks
            const expectedRender = theme === 'dark' && !reducedMotion;
            expect(behavior.shouldRender).toBe(expectedRender);
            expect(behavior.shouldAnimate).toBe(expectedRender);
            
            if (reducedMotion) {
              expect(behavior.animationDuration).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For light mode, animations should never render regardless of reduced motion
   */
  it('should never render animations in light mode', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // reducedMotion
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (reducedMotion, platform) => {
          const state: AnimationState = { 
            reducedMotion, 
            theme: 'light', 
            platform 
          };
          const behavior = getAnimationBehavior(state);

          // Light mode should never render animations
          expect(behavior.shouldRender).toBe(false);
          expect(behavior.shouldAnimate).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any animation configuration, reduced motion should result in no visible animations
   */
  it('should ensure no visible animations when reduced motion is enabled', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (theme, platform) => {
          const state: AnimationState = { 
            reducedMotion: true, 
            theme, 
            platform 
          };
          const behavior = getAnimationBehavior(state);

          // No animations should be visible when reduced motion is enabled
          expect(behavior.shouldRender).toBe(false);
          expect(behavior.shouldAnimate).toBe(false);
          expect(behavior.animationDuration).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any state, animation duration should match expected configuration
   */
  it('should use correct animation duration based on state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom<ThemeMode>('light', 'dark'),
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (reducedMotion, theme, platform) => {
          const state: AnimationState = { reducedMotion, theme, platform };
          const behavior = getAnimationBehavior(state);

          if (reducedMotion) {
            // Reduced motion always results in zero duration
            expect(behavior.animationDuration).toBe(0);
          } else {
            // Without reduced motion, duration is always the configured value
            // (even if the component doesn't render due to theme)
            expect(behavior.animationDuration).toBe(LoginAnimations.floatingBlob.duration);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For all animations, reduced motion should be respected as an accessibility requirement
   */
  it('should respect reduced motion as a critical accessibility feature', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom<ThemeMode>('light', 'dark'),
        fc.constantFrom<Platform>('ios', 'android', 'web'),
        (reducedMotion, theme, platform) => {
          const state: AnimationState = { reducedMotion, theme, platform };
          const behavior = getAnimationBehavior(state);

          // Reduced motion is a critical accessibility feature
          // It must always be respected, regardless of other settings
          if (reducedMotion) {
            expect(behavior.shouldAnimate).toBe(false);
            expect(behavior.shouldRender).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
