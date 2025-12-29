/**
 * Login Screen
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 5.1, 7.1, 7.2, 7.4
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth-context';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthButton } from '@/components/auth/auth-button';
import { ThemeToggle } from '@/components/auth/theme-toggle';
import { BrandingSection } from '@/components/auth/branding-section';
import { FloatingElements } from '@/components/auth/floating-elements';
import { validateLoginForm } from '@/lib/validation';
import { Spacing, Radius } from '@/constants/theme';

export default function LoginScreen() {
  const { colors, loginGradients } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});
    setGeneralError('');

    // Validate form
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setErrors({
        email: validation.email,
        password: validation.password,
      });
      return;
    }

    // Attempt login
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          setGeneralError('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setGeneralError('Please verify your email address before logging in.');
        } else {
          setGeneralError(error.message || 'An error occurred. Please try again.');
        }
      } else {
        // Success - navigation will be handled by auth state change
        router.replace('/(tabs)');
      }
    } catch (err) {
      setGeneralError('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Get background gradient based on theme
  const backgroundGradient = loginGradients.background;

  return (
    <LinearGradient
      colors={backgroundGradient.colors as [string, string, ...string[]]}
      start={backgroundGradient.start}
      end={backgroundGradient.end}
      style={styles.gradientContainer}
    >
      {/* Floating decorative elements (dark mode only) */}
      <FloatingElements testID="login-floating-elements" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ThemeToggle />
        </View>

        <View style={styles.content}>
          {/* Branding section with icons */}
          <BrandingSection testID="login-branding-section" />

          <Text style={[styles.title, { color: colors.loginTextPrimary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.loginTextSecondary }]}>
            Sign in to continue learning
          </Text>

          {generalError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {generalError}
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              testID="login-email-input"
            />

            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password}
              testID="login-password-input"
            />

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              style={({ pressed }) => [
                styles.forgotPassword,
                pressed && styles.secondaryActionPressed,
              ]}
            >
              {({ pressed }) => (
                <Text 
                  style={[
                    styles.forgotPasswordText, 
                    { color: colors.loginAccent },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  Forgot password?
                </Text>
              )}
            </Pressable>

            <AuthButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              variant="primary"
              testID="login-button"
            />

            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.loginTextMuted }]}>
                Don't have an account?{' '}
              </Text>
              <Link href={"/(auth)/signup" as any} asChild>
                <Pressable>
                  {({ pressed }) => (
                    <Text 
                      style={[
                        styles.signupLink, 
                        { color: colors.loginAccent },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      Sign up
                    </Text>
                  )}
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    marginTop: Spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  signupText: {
    fontSize: 14,
    lineHeight: 20,
  },
  signupLink: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
