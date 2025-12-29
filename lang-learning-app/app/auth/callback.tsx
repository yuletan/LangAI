/**
 * Auth Callback Screen
 * Handles email verification redirects from Supabase
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we have a session after email verification
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Verification failed. Please try again.');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
          return;
        }

        if (session) {
          // User is verified and logged in!
          setStatus('success');
          setMessage('Email verified! Redirecting...');
          setTimeout(() => router.replace('/(tabs)'), 1500);
        } else {
          // No session, redirect to login
          setStatus('success');
          setMessage('Email verified! Please log in.');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        setMessage('Something went wrong. Please try logging in.');
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {status === 'verifying' && (
          <ActivityIndicator size="large" color={colors.tint} />
        )}
        {status === 'success' && (
          <Text style={[styles.icon, { color: colors.success }]}>✓</Text>
        )}
        {status === 'error' && (
          <Text style={[styles.icon, { color: colors.error }]}>✗</Text>
        )}
        <Text
          style={[
            styles.message,
            {
              color:
                status === 'success'
                  ? colors.success
                  : status === 'error'
                  ? colors.error
                  : colors.text,
            },
          ]}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
