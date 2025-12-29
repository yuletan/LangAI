/**
 * BrandingSection Component
 * Displays app branding with Brain and Languages icons
 * Requirements: 1.4
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, LoginGradients } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

export interface BrandingSectionProps {
  testID?: string;
}

export const BrandingSection: React.FC<BrandingSectionProps> = ({
  testID,
}) => {
  const { colors, theme, loginGradients } = useTheme();
  
  // Get appropriate gradients for the current theme
  const brainGradient = loginGradients.accent;
  const languagesGradient = loginGradients.primaryButton;

  // Responsive sizing based on screen width
  const getResponsiveSize = () => {
    if (screenWidth < 350) {
      return {
        iconSize: 28,
        containerSize: 60,
        titleSize: 24,
        subtitleSize: 14,
      };
    } else if (screenWidth < 400) {
      return {
        iconSize: 32,
        containerSize: 70,
        titleSize: 28,
        subtitleSize: 16,
      };
    } else {
      return {
        iconSize: 36,
        containerSize: 80,
        titleSize: 32,
        subtitleSize: 18,
      };
    }
  };

  const sizes = getResponsiveSize();

  return (
    <View style={styles.container} testID={testID}>
      {/* Icon containers with gradients */}
      <View style={styles.iconsContainer}>
        {/* Brain Icon */}
        <LinearGradient
          colors={[brainGradient.colors[0], brainGradient.colors[1]]}
          start={brainGradient.start}
          end={brainGradient.end}
          style={[
            styles.iconContainer,
            {
              width: sizes.containerSize,
              height: sizes.containerSize,
            },
          ]}
        >
          <Ionicons 
            name="bulb" 
            size={sizes.iconSize} 
            color="#ffffff" 
          />
        </LinearGradient>

        {/* Languages Icon */}
        <LinearGradient
          colors={[languagesGradient.colors[0], languagesGradient.colors[1]]}
          start={languagesGradient.start}
          end={languagesGradient.end}
          style={[
            styles.iconContainer,
            {
              width: sizes.containerSize,
              height: sizes.containerSize,
            },
          ]}
        >
          <Ionicons 
            name="language" 
            size={sizes.iconSize} 
            color="#ffffff" 
          />
        </LinearGradient>
      </View>

      {/* App title and subtitle */}
      <View style={styles.textContainer}>
        <Text 
          style={[
            styles.title, 
            { 
              color: colors.loginTextPrimary,
              fontSize: sizes.titleSize,
            }
          ]}
        >
          AI Language Predictor
        </Text>
        <Text 
          style={[
            styles.subtitle, 
            { 
              color: colors.loginTextSecondary,
              fontSize: sizes.subtitleSize,
            }
          ]}
        >
          Learn languages with AI-powered predictions
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.8,
  },
});