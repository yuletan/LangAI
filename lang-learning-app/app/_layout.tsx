/**
 * Root Layout with Auth-Based Navigation
 * Requirements: 6.1, 6.2, 6.3
 */

import { useEffect } from "react";
import {
  DefaultTheme,
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import "react-native-reanimated";
import { ThemeProvider } from "@/components/theme-provider";
import { useTheme } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

function useProtectedRoute() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace("/(auth)/login" as any);
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated and in auth group
      router.replace("/(tabs)" as any);
    }
  }, [user, loading, segments]);
}

function RootLayoutContent() {
  const { theme, colors } = useTheme();
  const { loading } = useAuth();
  const navigationTheme = theme === "dark" ? DarkTheme : DefaultTheme;

  useProtectedRoute();

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal", headerShown: true }}
        />
      </Stack>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
