/**
 * Property-based test for contrast ratio compliance
 * **Feature: enhanced-login-ui, Property 12: Contrast ratio compliance**
 * **Validates: Requirements 4.4**
 */

import * as fc from 'fast-check';
import { Colors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark';

/**
 * Property 12: Contrast ratio compliance
 * For any text element, the component should maintain proper contrast ratios 
 * between text and background colors in both light and dark themes
 */
describe('Property 12: Contrast ratio compliance', () => {
  /**
   * Helper function to convert hex color to RGB
   */
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  };

  /**
   * Helper function to calculate relative luminance
   */
  const getRelativeLuminance = (r: number, g: number, b: number): number => {
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  /**
   * Helper function to calculate contrast ratio
   */
  const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  };

  /**
   * WCAG AA standard requires 4.5:1 for normal text, 3:1 for large text
   */
  const WCAG_AA_NORMAL = 4.5;
  const WCAG_AA_LARGE = 3.0;

  /**
   * For light theme, text should have sufficient contrast with background
   */
  it('should have sufficient contrast for light theme text', async () => {
    await fc.assert(
      fc.property(fc.constant('light' as ThemeMode), (theme) => {
        const textColor = Colors.light.text;
        const backgroundColor = Colors.light.background;
        
        const ratio = getContrastRatio(textColor, backgroundColor);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For dark theme, text should have sufficient contrast with background
   */
  it('should have sufficient contrast for dark theme text', async () => {
    await fc.assert(
      fc.property(fc.constant('dark' as ThemeMode), (theme) => {
        const textColor = Colors.dark.text;
        const backgroundColor = Colors.dark.background;
        
        const ratio = getContrastRatio(textColor, backgroundColor);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For light theme, login text should have sufficient contrast
   */
  it('should have sufficient contrast for light theme login text', async () => {
    await fc.assert(
      fc.property(fc.constant('light' as ThemeMode), (theme) => {
        const textColor = Colors.light.loginTextPrimary;
        const backgroundColor = Colors.light.loginBackground;
        
        const ratio = getContrastRatio(textColor, backgroundColor);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For dark theme, login text should have sufficient contrast
   */
  it('should have sufficient contrast for dark theme login text', async () => {
    await fc.assert(
      fc.property(fc.constant('dark' as ThemeMode), (theme) => {
        const textColor = Colors.dark.loginTextPrimary;
        const backgroundColor = Colors.dark.loginBackground;
        
        const ratio = getContrastRatio(textColor, backgroundColor);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme, accent colors should have sufficient contrast
   */
  it('should have sufficient contrast for accent colors', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        (theme) => {
          const accentColor = Colors[theme].tint;
          const backgroundColor = Colors[theme].background;
          
          const ratio = getContrastRatio(accentColor, backgroundColor);
          // Accent colors often used for large text or UI elements
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme, error text should have sufficient contrast
   */
  it('should have sufficient contrast for error text', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        (theme) => {
          const errorColor = Colors[theme].error;
          const backgroundColor = Colors[theme].background;
          
          const ratio = getContrastRatio(errorColor, backgroundColor);
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme, muted text should still be readable (minimum 2.5:1)
   */
  it('should have readable contrast for muted text', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        (theme) => {
          const mutedColor = Colors[theme].muted;
          const backgroundColor = Colors[theme].background;
          
          const ratio = getContrastRatio(mutedColor, backgroundColor);
          // Muted text can have lower contrast but should still be readable
          // Minimum 2.5:1 for secondary/muted text
          expect(ratio).toBeGreaterThanOrEqual(2.5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme, contrast ratios should be consistent across checks
   */
  it('should provide consistent contrast ratios across multiple checks', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        fc.integer({ min: 1, max: 5 }),
        (theme, checkCount) => {
          const textColor = Colors[theme].text;
          const backgroundColor = Colors[theme].background;
          
          const firstRatio = getContrastRatio(textColor, backgroundColor);
          
          for (let i = 0; i < checkCount; i++) {
            const ratio = getContrastRatio(textColor, backgroundColor);
            expect(ratio).toBeCloseTo(firstRatio, 2);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * For any color pair, contrast ratio should be positive
   */
  it('should calculate positive contrast ratios', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        (theme) => {
          const textColor = Colors[theme].text;
          const backgroundColor = Colors[theme].background;
          
          const ratio = getContrastRatio(textColor, backgroundColor);
          expect(ratio).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme, login accent should be distinguishable
   */
  it('should have distinguishable login accent colors', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode>('light', 'dark'),
        (theme) => {
          const accentColor = Colors[theme].loginAccent;
          const backgroundColor = Colors[theme].loginBackground;
          
          const ratio = getContrastRatio(accentColor, backgroundColor);
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        }
      ),
      { numRuns: 100 }
    );
  });
});
