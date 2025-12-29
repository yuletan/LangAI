/**
 * ThemeToggle Component
 * A button to toggle between light and dark themes with glassmorphism styling
 * Requirements: 1.5, 4.2
 */

import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, LoginAnimations } from '@/constants/theme';

export interface ThemeToggleProps {
  size?: number;
  testID?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 24,
  testID,
}) => {
  const { theme, colors, glassmorphism, toggleTheme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const iconName = theme === 'dark' ? 'sunny' : 'moon';

  // Animate icon rotation on theme change
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: LoginAnimations.themeTransition.duration,
      useNativeDriver: LoginAnimations.themeTransition.useNativeDriver,
    }).start(() => {
      rotateAnim.setValue(0);
    });
  }, [theme, rotateAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    toggleTheme();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Get glassmorphism styles for the button
  const buttonGlassStyle = glassmorphism.button;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: buttonGlassStyle.backgroundColor,
          borderColor: buttonGlassStyle.borderColor,
          borderWidth: buttonGlassStyle.borderWidth,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        testID={testID}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name={iconName} size={size} color={colors.text} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  button: {
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
