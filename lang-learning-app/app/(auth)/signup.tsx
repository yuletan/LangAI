/**
 * Signup Screen
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
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
import { validateEmail, validatePassword } from '@/lib/validation';
import { Spacing, Radius } from '@/constants/theme';

export default function SignupScreen() {
  const { colors } = useTheme();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    // Clear previous errors
    setErrors({});
    setGeneralError('');
    setSuccess(false);

    // Validate form
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const newErrors: typeof errors = {};

    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Attempt signup
    setLoading(true);
    try {
      const { data, error } = await signUp(email, password);
      
      if (error) {
        // Handle specific error types
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          setGeneralError('This email is already registered. Please log in instead.');
          // Optionally redirect to login after a delay
          setTimeout(() => {
            router.push('/(auth)/login');
          }, 2500);
        } else if (error.message.includes('Password')) {
          setErrors({ password: error.message });
        } else {
          setGeneralError(error.message || 'An error occurred. Please try again.');
        }
      } else {
        // Supabase returns success even for existing users (security feature)
        // Check if we actually got a user back
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          // This means the email already exists but Supabase returned success
          setGeneralError('This email is already registered. Please log in instead.');
          setTimeout(() => {
            router.push('/(auth)/login');
          }, 2500);
          return;
        }

        // Check if email confirmation is required
        if (data.session) {
          // User is logged in immediately (email confirmation disabled)
          router.replace('/(tabs)');
        } else {
          // Email confirmation required
          setSuccess(true);
        }
      }
    } catch (err) {
      setGeneralError('Unable to connect. Please check your internet connection.');
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
            Account Created!
          </Text>
          <Text style={[styles.successMessage, { color: colors.text }]}>
            Please check your email to verify your account before signing in.
          </Text>
          <AuthButton
            title="Go to Login"
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
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Start your language learning journey
        </Text>

        {generalError ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {generalError}
            </Text>
            {generalError.includes('already registered') && (
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.errorLinkButton}>
                  <Text style={[styles.errorLink, { color: colors.error }]}>
                    Go to Login →
                  </Text>
                </TouchableOpacity>
              </Link>
            )}
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
            testID="signup-email-input"
          />

          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            error={errors.password}
            testID="signup-password-input"
          />

          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            error={errors.confirmPassword}
            testID="signup-confirm-password-input"
          />

          <AuthButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            variant="primary"
            testID="signup-button"
          />

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.muted }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={[styles.loginLink, { color: colors.tint }]}>
                  Sign in
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
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
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
  },
  errorLinkButton: {
    marginTop: Spacing.xs,
  },
  errorLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  form: {
    marginTop: Spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
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
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
});
