/**
 * Property-based test for theme color consistency
 * **Feature: enhanced-login-ui, Property 11: Theme color consistency**
 * **Validates: Requirements 4.1**
 */

import * as fc from 'fast-check';
import { Colors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark';

/**
 * Property 11: Theme color consistency
 * For any themed component, the component should use consistent color tokens 
 * from the theme system for similar UI elements
 */
describe('Property 11: Theme color consistency', () => {
  // Arbitrary for theme modes
  const themeArbitrary = fc.constantFrom<ThemeMode>('light', 'dark');

  /**
   * For any theme mode, all login-specific color tokens should be defined and valid
   */
  it('should have all login color tokens defined for any theme', async () => {
    await fc.assert(
      fc.property(themeArbitrary, (theme) => {
        const colors = Colors[theme];
        
        // All login-specific color tokens should be defined
        const loginColorTokens = [
          'loginBackground',
          'loginCardBackground',
          'loginCardBorder', 
          'loginInputBackground',
          'loginInputBorder',
          'loginInputFocusBorder',
          'loginAccent',
          'loginAccentHover',
          'loginAccentGlow',
          'loginTextPrimary',
          'loginTextSecondary',
          'loginTextMuted'
        ];

        loginColorTokens.forEach(token => {
          expect(colors[token as keyof typeof colors]).toBeDefined();
          expect(typeof colors[token as keyof typeof colors]).toBe('string');
          expect(colors[token as keyof typeof colors]).not.toBe('');
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme mode, color tokens should follow consistent naming patterns
   */
  it('should follow consistent color token naming patterns', async () => {
    await fc.assert(
      fc.property(themeArbitrary, (theme) => {
        const colors = Colors[theme];
        
        // Login tokens should start with 'login' prefix
        const loginTokens = Object.keys(colors).filter(key => key.startsWith('login'));
        
        expect(loginTokens.length).toBeGreaterThan(0);
        
        loginTokens.forEach(token => {
          expect(token).toMatch(/^login[A-Z]/); // Should start with 'login' followed by capital letter
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme mode, accent colors should be consistent across related tokens
   */
  it('should maintain accent color consistency within theme', async () => {
    await fc.assert(
      fc.property(themeArbitrary, (theme) => {
        const colors = Colors[theme];
        
        // Base accent should be defined
        expect(colors.loginAccent).toBeDefined();
        expect(colors.loginAccentHover).toBeDefined();
        expect(colors.loginAccentGlow).toBeDefined();
        
        // Accent colors should be valid hex or rgba values
        expect(colors.loginAccent).toMatch(/^#[0-9a-fA-F]{6}$|^rgba?\(/);
        expect(colors.loginAccentHover).toMatch(/^#[0-9a-fA-F]{6}$|^rgba?\(/);
        expect(colors.loginAccentGlow).toMatch(/^rgba?\(/); // Glow should be rgba for transparency
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme mode, text colors should have appropriate hierarchy
   */
  it('should maintain text color hierarchy consistency', async () => {
    await fc.assert(
      fc.property(themeArbitrary, (theme) => {
        const colors = Colors[theme];
        
        // Text hierarchy should be defined
        expect(colors.loginTextPrimary).toBeDefined();
        expect(colors.loginTextSecondary).toBeDefined();
        expect(colors.loginTextMuted).toBeDefined();
        
        // All text colors should be different (hierarchy)
        expect(colors.loginTextPrimary).not.toBe(colors.loginTextSecondary);
        expect(colors.loginTextSecondary).not.toBe(colors.loginTextMuted);
        expect(colors.loginTextPrimary).not.toBe(colors.loginTextMuted);
        
        // Text colors should be valid hex values
        expect(colors.loginTextPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(colors.loginTextSecondary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(colors.loginTextMuted).toMatch(/^#[0-9a-fA-F]{6}$/);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme mode, background colors should support transparency where appropriate
   */
  it('should use appropriate transparency for glassmorphism backgrounds', async () => {
    await fc.assert(
      fc.property(themeArbitrary, (theme) => {
        const colors = Colors[theme];
        
        // Card and input backgrounds should support transparency for glassmorphism
        expect(colors.loginCardBackground).toMatch(/^rgba?\(/);
        expect(colors.loginInputBackground).toMatch(/^rgba?\(/);
        
        // Main background should be solid
        expect(colors.loginBackground).toMatch(/^#[0-9a-fA-F]{6}$/);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any theme mode, border colors should be consistent with background hierarchy
   */
  it('should maintain border color consistency with backgrounds', async () => {
    await fc.assert(
      fc.property(themeArbitrary, (theme) => {
        const colors = Colors[theme];
        
        // Border colors should be defined
        expect(colors.loginCardBorder).toBeDefined();
        expect(colors.loginInputBorder).toBeDefined();
        expect(colors.loginInputFocusBorder).toBeDefined();
        
        // Focus border should be different from regular border (indicates focus state)
        expect(colors.loginInputFocusBorder).not.toBe(colors.loginInputBorder);
        
        // Border colors should be valid
        expect(colors.loginCardBorder).toMatch(/^rgba?\(|^#[0-9a-fA-F]{6}$/);
        expect(colors.loginInputBorder).toMatch(/^rgba?\(|^#[0-9a-fA-F]{6}$/);
        expect(colors.loginInputFocusBorder).toMatch(/^rgba?\(|^#[0-9a-fA-F]{6}$/);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Cross-theme consistency: Light and dark themes should have different values
   * but maintain the same structure
   */
  it('should maintain structural consistency across light and dark themes', () => {
    const lightColors = Colors.light;
    const darkColors = Colors.dark;
    
    // Both themes should have the same set of login color keys
    const lightLoginKeys = Object.keys(lightColors).filter(key => key.startsWith('login')).sort();
    const darkLoginKeys = Object.keys(darkColors).filter(key => key.startsWith('login')).sort();
    
    expect(lightLoginKeys).toEqual(darkLoginKeys);
    
    // Themes should have different values for key colors (ensuring they're actually different themes)
    expect(lightColors.loginBackground).not.toBe(darkColors.loginBackground);
    expect(lightColors.loginTextPrimary).not.toBe(darkColors.loginTextPrimary);
    expect(lightColors.loginAccent).not.toBe(darkColors.loginAccent);
  });

  /**
   * Color token relationships should be maintained across themes
   */
  it('should maintain color relationships across theme switches', async () => {
    await fc.assert(
      fc.property(themeArbitrary, (initialTheme) => {
        const oppositeTheme: ThemeMode = initialTheme === 'light' ? 'dark' : 'light';
        
        const initialColors = Colors[initialTheme];
        const oppositeColors = Colors[oppositeTheme];
        
        // Both themes should have complete login color sets
        const requiredTokens = [
          'loginBackground', 'loginTextPrimary', 'loginAccent',
          'loginCardBackground', 'loginInputBackground'
        ];
        
        requiredTokens.forEach(token => {
          expect(initialColors[token as keyof typeof initialColors]).toBeDefined();
          expect(oppositeColors[token as keyof typeof oppositeColors]).toBeDefined();
        });
      }),
      { numRuns: 100 }
    );
  });
});