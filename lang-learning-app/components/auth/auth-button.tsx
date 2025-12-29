/**
 * AuthButton Component
 * A themed button for authentication forms with loading state, gradients, and animations
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, LoginGradients, LoginAnimations, Shadows } from '@/constants/theme';

export interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  testID?: string;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
  testID,
}) => {
  const { colors, colorScheme } = useTheme();
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Handle press in animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      duration: LoginAnimations.buttonPress.duration,
      useNativeDriver: LoginAnimations.buttonPress.useNativeDriver,
    }).start();
  };

  // Handle press out animation
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      duration: LoginAnimations.buttonPress.duration,
      useNativeDriver: LoginAnimations.buttonPress.useNativeDriver,
    }).start();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      opacity: isDisabled ? 0.6 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          // Gradient will be applied via LinearGradient component
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.tint,
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          paddingVertical: Spacing.sm,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...styles.buttonText,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          color: '#ffffff',
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: colors.tint,
        };
      case 'text':
        return {
          ...baseStyle,
          color: colors.tint,
          fontWeight: '500',
        };
      default:
        return baseStyle;
    }
  };

  const getLoaderColor = (): string => {
    switch (variant) {
      case 'primary':
        return '#ffffff';
      case 'secondary':
      case 'text':
        return colors.tint;
      default:
        return '#ffffff';
    }
  };

  // Get gradient colors for primary button
  const getGradientColors = () => {
    const gradients = colorScheme === 'dark' ? LoginGradients.dark : LoginGradients.light;
    return gradients.primaryButton.colors;
  };

  const getGradientStart = () => {
    const gradients = colorScheme === 'dark' ? LoginGradients.dark : LoginGradients.light;
    return gradients.primaryButton.start;
  };

  const getGradientEnd = () => {
    const gradients = colorScheme === 'dark' ? LoginGradients.dark : LoginGradients.light;
    return gradients.primaryButton.end;
  };

  // Render primary button with gradient
  if (variant === 'primary') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          activeOpacity={0.9}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled: isDisabled, busy: loading }}
        >
          <LinearGradient
            colors={getGradientColors()}
            start={getGradientStart()}
            end={getGradientEnd()}
            style={[getButtonStyle(), styles.gradientButton, styles.glowEffect]}
          >
            {loading ? (
              <ActivityIndicator color={getLoaderColor()} size="small" testID={`${testID}-spinner`} />
            ) : (
              <Text style={getTextStyle()}>{title}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Render secondary or text button without gradient
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={getLoaderColor()} size="small" testID={`${testID}-spinner`} />
        ) : (
          <Text style={getTextStyle()}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 48, // Accessibility: minimum touch target size
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  gradientButton: {
    ...Shadows.md,
  },
  glowEffect: {
    // Glow effect will be more visible on dark mode
    shadowColor: '#4fc3f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
