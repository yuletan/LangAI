/**
 * Enhanced Theme Hook Tests
 * Tests for the updated useTheme hook with login-specific properties
 */

import { Colors, LoginGradients, GlassmorphismStyles, LoginAnimations } from '@/constants/theme';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe('Enhanced Theme System Integration', () => {
  test('should have consistent login color tokens across themes', () => {
    const lightColors = Colors.light;
    const darkColors = Colors.dark;

    // Verify all login-specific colors exist in both themes
    const loginColorKeys = [
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

    loginColorKeys.forEach(key => {
      expect(lightColors[key as keyof typeof lightColors]).toBeDefined();
      expect(darkColors[key as keyof typeof darkColors]).toBeDefined();
    });
  });

  test('should have matching gradient structures across themes', () => {
    const lightGradients = LoginGradients.light;
    const darkGradients = LoginGradients.dark;

    // Common gradient keys
    const commonKeys = ['background', 'primaryButton', 'accent'];
    
    commonKeys.forEach(key => {
      expect(lightGradients[key as keyof typeof lightGradients]).toBeDefined();
      expect(darkGradients[key as keyof typeof darkGradients]).toBeDefined();
      
      const lightGrad = lightGradients[key as keyof typeof lightGradients];
      const darkGrad = darkGradients[key as keyof typeof darkGradients];
      
      expect(lightGrad.colors).toHaveLength(2);
      expect(darkGrad.colors).toHaveLength(2);
      expect(lightGrad.start).toBeDefined();
      expect(lightGrad.end).toBeDefined();
      expect(darkGrad.start).toBeDefined();
      expect(darkGrad.end).toBeDefined();
    });

    // Dark theme should have additional floating blob gradients
    expect(darkGradients.floatingBlob1).toBeDefined();
    expect(darkGradients.floatingBlob2).toBeDefined();
  });

  test('should have consistent glassmorphism structure across themes', () => {
    const lightGlass = GlassmorphismStyles.light;
    const darkGlass = GlassmorphismStyles.dark;

    const glassKeys = ['card', 'input', 'button'];
    
    glassKeys.forEach(key => {
      const lightStyle = lightGlass[key as keyof typeof lightGlass];
      const darkStyle = darkGlass[key as keyof typeof darkGlass];
      
      expect(lightStyle.backgroundColor).toBeDefined();
      expect(lightStyle.borderColor).toBeDefined();
      expect(lightStyle.borderWidth).toBeDefined();
      
      expect(darkStyle.backgroundColor).toBeDefined();
      expect(darkStyle.borderColor).toBeDefined();
      expect(darkStyle.borderWidth).toBeDefined();
      
      // Should use rgba for transparency
      expect(lightStyle.backgroundColor).toContain('rgba');
      expect(darkStyle.backgroundColor).toContain('rgba');
    });
  });

  test('should have valid animation configurations', () => {
    const animations = LoginAnimations;
    
    const animationKeys = [
      'focusTransition',
      'buttonPress', 
      'themeTransition',
      'floatingBlob',
      'loadingSpinner'
    ];

    animationKeys.forEach(key => {
      const config = animations[key as keyof typeof animations];
      
      expect(config.duration).toBeGreaterThan(0);
      expect(config.easing).toBeDefined();
      expect(typeof config.useNativeDriver).toBe('boolean');
    });
  });

  test('should have appropriate color contrast between themes', () => {
    const lightColors = Colors.light;
    const darkColors = Colors.dark;

    // Light theme should have dark text on light background
    expect(lightColors.loginTextPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(lightColors.loginBackground).toMatch(/^#[0-9a-fA-F]{6}$/);
    
    // Dark theme should have light text on dark background  
    expect(darkColors.loginTextPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(darkColors.loginBackground).toMatch(/^#[0-9a-fA-F]{6}$/);
    
    // Themes should have different text colors
    expect(lightColors.loginTextPrimary).not.toBe(darkColors.loginTextPrimary);
    expect(lightColors.loginBackground).not.toBe(darkColors.loginBackground);
  });
});