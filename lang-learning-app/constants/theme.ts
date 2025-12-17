/**
 * Enhanced Theme Configuration for Language Predictor App
 * Includes tone-based gradients, extended color palette, and typography
 */

import { Platform } from 'react-native';

// Primary tint colors
const tintColorLight = '#0a7ea4';
const tintColorDark = '#4fc3f7';

// Extended color palette
export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Extended palette
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    cardBackground: '#f8fafc',
    border: '#e2e8f0',
    muted: '#94a3b8',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0f172a',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Extended palette
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    cardBackground: '#1e293b',
    border: '#334155',
    muted: '#64748b',
  },
};

// Tone-based gradients for dynamic backgrounds
export const ToneGradients = {
  casual: {
    colors: ['#ff6b6b', '#ffa502'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  formal: {
    colors: ['#1a365d', '#2b6cb0'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  humorous: {
    colors: ['#f093fb', '#f5576c'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  academic: {
    colors: ['#667eea', '#764ba2'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  sarcastic: {
    colors: ['#43e97b', '#38f9d7'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

// Confidence level colors
export const ConfidenceColors = {
  high: '#22c55e',    // > 80%
  medium: '#eab308',  // 50-80%
  low: '#ef4444',     // < 50%
};

// CEFR level colors
export const CEFRColors = {
  A1: '#22c55e',
  A2: '#84cc16',
  B1: '#eab308',
  B2: '#f97316',
  C1: '#ef4444',
  C2: '#dc2626',
};

// Word type colors for prediction chips
export const WordTypeColors = {
  verb: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  noun: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  adjective: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  adverb: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  preposition: { bg: '#fef3c7', border: '#eab308', text: '#a16207' },
  other: { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' },
};

// Helper function to detect word type from reason text
export const getWordTypeFromReason = (reason: string): keyof typeof WordTypeColors => {
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes('verb') || lowerReason.includes('conjugat')) return 'verb';
  if (lowerReason.includes('noun') || lowerReason.includes('subject') || lowerReason.includes('object')) return 'noun';
  if (lowerReason.includes('adjective') || lowerReason.includes('descri')) return 'adjective';
  if (lowerReason.includes('adverb')) return 'adverb';
  if (lowerReason.includes('preposition')) return 'preposition';
  return 'other';
};

// Typography configuration
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'System',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', system-ui, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius scale
export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadow configurations - platform aware
export const Shadows = Platform.select({
  web: {
    sm: { boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' },
    md: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' },
    lg: { boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)' },
  },
  default: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
}) as {
  sm: object;
  md: object;
  lg: object;
};

// Animation durations
export const Animations = {
  fast: 150,
  normal: 300,
  slow: 500,
};
