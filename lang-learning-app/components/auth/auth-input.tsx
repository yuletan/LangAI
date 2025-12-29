/**
 * AuthInput Component
 * A themed text input for authentication forms with glassmorphism and focus effects
 * Requirements: 2.1, 2.4, 2.5, 7.1, 7.3, 7.4
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, Shadows } from '@/constants/theme';

export interface AuthInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  testID?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  autoCapitalize = 'none',
  autoComplete,
  testID,
}) => {
  const { colors, theme, glassmorphism, loginAnimations } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Animation values for focus effects
  const focusAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const isPassword = secureTextEntry;
  const shouldHideText = isPassword && !showPassword;
  const isDarkMode = theme === 'dark';

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Animate focus effects
    Animated.parallel([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: loginAnimations.focusTransition.duration,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: loginAnimations.focusTransition.duration,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Animate focus effects out
    Animated.parallel([
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: loginAnimations.focusTransition.duration,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: loginAnimations.focusTransition.duration,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Determine border color based on state
  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.loginInputFocusBorder
    : colors.loginInputBorder;

  // Animated border width for focus effect
  const animatedBorderWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  // Animated glow opacity for focus effect
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  // Apply glassmorphism in dark mode
  const inputBackgroundStyle = isDarkMode
    ? {
        backgroundColor: glassmorphism.input.backgroundColor,
        borderColor: glassmorphism.input.borderColor,
      }
    : {
        backgroundColor: colors.loginInputBackground,
      };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.loginTextPrimary }]}>{label}</Text>
      
      {/* Glow effect container for focus state */}
      {isFocused && (
        <Animated.View
          style={[
            styles.glowContainer,
            {
              opacity: glowOpacity,
              borderColor: colors.loginAccentGlow,
              shadowColor: colors.loginAccent,
            },
          ]}
        />
      )}
      
      <Animated.View
        style={[
          styles.inputContainer,
          inputBackgroundStyle,
          {
            borderColor,
            borderWidth: animatedBorderWidth,
          },
          isDarkMode && Platform.OS === 'ios' && styles.iosBlur,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.loginTextPrimary },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.loginTextMuted}
          secureTextEntry={shouldHideText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete as any}
          onFocus={handleFocus}
          onBlur={handleBlur}
          testID={testID}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.eyeButton}
            testID={`${testID}-toggle`}
            activeOpacity={0.7}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: showPassword ? 1 : 1,
                  },
                ],
              }}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color={colors.loginTextSecondary}
              />
            </Animated.View>
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  glowContainer: {
    position: 'absolute',
    top: 28,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: Radius.md + 2,
    borderWidth: 4,
    zIndex: -1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    ...Platform.select({
      ios: Shadows.sm,
      android: Shadows.sm,
    }),
  },
  iosBlur: {
    // iOS-specific blur effect styling
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  eyeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
