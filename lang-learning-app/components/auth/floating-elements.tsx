/**
 * FloatingElements Component
 * Decorative floating gradient blob animations for visual depth
 * Requirements: 5.1, 5.4, 5.5
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, AccessibilityInfo, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { LoginAnimations } from '@/constants/theme';

export interface FloatingElementsProps {
  testID?: string;
}

export const FloatingElements: React.FC<FloatingElementsProps> = ({ testID }) => {
  const { theme, loginGradients } = useTheme();
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = React.useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const checkReducedMotion = async () => {
      if (Platform.OS === 'web') {
        // Web: Check prefers-reduced-motion media query
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mediaQuery.matches);
        
        // Listen for changes
        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } else {
        // Native: Check accessibility settings
        const isReducedMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        setReducedMotion(isReducedMotionEnabled);
        
        // Listen for changes
        const subscription = AccessibilityInfo.addEventListener(
          'reduceMotionChanged',
          setReducedMotion
        );
        return () => subscription.remove();
      }
    };

    checkReducedMotion();
  }, []);

  // Start floating animations
  useEffect(() => {
    if (reducedMotion || theme !== 'dark') {
      // Reset animations if reduced motion is enabled or not in dark mode
      blob1Anim.setValue(0);
      blob2Anim.setValue(0);
      return;
    }

    // Blob 1 animation - vertical floating
    const blob1Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, {
          toValue: 1,
          duration: LoginAnimations.floatingBlob.duration,
          useNativeDriver: LoginAnimations.floatingBlob.useNativeDriver,
        }),
        Animated.timing(blob1Anim, {
          toValue: 0,
          duration: LoginAnimations.floatingBlob.duration,
          useNativeDriver: LoginAnimations.floatingBlob.useNativeDriver,
        }),
      ])
    );

    // Blob 2 animation - vertical floating (offset phase)
    const blob2Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Anim, {
          toValue: 1,
          duration: LoginAnimations.floatingBlob.duration * 1.2, // Slightly different duration
          useNativeDriver: LoginAnimations.floatingBlob.useNativeDriver,
        }),
        Animated.timing(blob2Anim, {
          toValue: 0,
          duration: LoginAnimations.floatingBlob.duration * 1.2,
          useNativeDriver: LoginAnimations.floatingBlob.useNativeDriver,
        }),
      ])
    );

    blob1Animation.start();
    blob2Animation.start();

    return () => {
      blob1Animation.stop();
      blob2Animation.stop();
    };
  }, [blob1Anim, blob2Anim, reducedMotion, theme]);

  // Don't render in light mode or if reduced motion is enabled
  if (theme !== 'dark' || reducedMotion) {
    return null;
  }

  // Interpolate animation values for smooth movement
  const blob1TranslateY = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const blob2TranslateY = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  // Get gradient colors for dark mode
  const blob1Colors = loginGradients.floatingBlob1?.colors || ['rgba(79, 195, 247, 0.1)', 'rgba(34, 211, 238, 0.05)'];
  const blob2Colors = loginGradients.floatingBlob2?.colors || ['rgba(34, 211, 238, 0.08)', 'rgba(79, 195, 247, 0.03)'];

  return (
    <View style={styles.container} testID={testID} pointerEvents="none">
      {/* Floating Blob 1 */}
      <Animated.View
        style={[
          styles.blob1,
          {
            transform: [{ translateY: blob1TranslateY }],
          },
        ]}
        testID={`${testID}-blob1`}
      >
        <LinearGradient
          colors={blob1Colors as [string, string, ...string[]]}
          start={loginGradients.floatingBlob1?.start || { x: 0, y: 0 }}
          end={loginGradients.floatingBlob1?.end || { x: 1, y: 1 }}
          style={styles.gradientBlob}
        />
      </Animated.View>

      {/* Floating Blob 2 */}
      <Animated.View
        style={[
          styles.blob2,
          {
            transform: [{ translateY: blob2TranslateY }],
          },
        ]}
        testID={`${testID}-blob2`}
      >
        <LinearGradient
          colors={blob2Colors as [string, string, ...string[]]}
          start={loginGradients.floatingBlob2?.start || { x: 0, y: 0 }}
          end={loginGradients.floatingBlob2?.end || { x: 1, y: 1 }}
          style={styles.gradientBlob}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: '10%',
    left: '-10%',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  blob2: {
    position: 'absolute',
    bottom: '15%',
    right: '-15%',
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  gradientBlob: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
});
