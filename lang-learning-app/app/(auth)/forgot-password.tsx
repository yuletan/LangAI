/**
 * Forgot Password Screen
 * Requirements: 3.1, 3.2, 3.3
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth-context';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthButton } from '@/components/auth/auth-button';
import { ThemeToggle } from '@/components/auth/theme-toggle';
import { validateEmail } from '@/lib/validation';
import { Spacing, Radius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // Clear previous errors
    setError('');
    setSuccess(false);

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Please enter a valid email');
      return;
    }

    // Attempt password reset
    setLoading(true);
    try {
      await resetPassword(email);
      // Always show success message (don't reveal if email exists)
      setSuccess(true);
    } catch (err: any) {
      setError('Unable to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <ThemeToggle />
        </View>
        <View style={styles.successContainer}>
          <Text style={[styles.successTitle, { color: colors.success }]}>
            Check Your Email
          </Text>
          <Text style={[styles.successMessage, { color: colors.text }]}>
            If an account exists with {email}, you will receive a password reset link shortly.
          </Text>
          <Text style={[styles.successNote, { color: colors.muted }]}>
            Please check your spam folder if you don't see the email.
          </Text>
          <AuthButton
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <ThemeToggle />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Enter your email address and we'll send you a link to reset your password
        </Text>

        <View style={styles.form}>
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={error}
            testID="forgot-password-email-input"
          />

          <AuthButton
            title="Send Reset Link"
            onPress={handleResetPassword}
            loading={loading}
            variant="primary"
            testID="forgot-password-button"
          />

          <View style={styles.backContainer}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={[styles.backLink, { color: colors.tint }]}>
                  ← Back to Login
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: Spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  form: {
    marginTop: Spacing.md,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  backLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  successNote: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
});
