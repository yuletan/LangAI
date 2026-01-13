import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/auth-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  getUserProfile,
  getUnlockedAchievements,
  getActiveChallenges,
  getTotalStats,
  getXPForNextLevel,
  generateWeeklyChallenges,
  calculateLevel,
  resetAllProgress,
  getCEFRProfile,
  BADGES,
  Achievement,
  Challenge,
  UserProfile,
} from "@/db";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Fallback BADGES for web platform
const FALLBACK_BADGES = {
  polyglot: { id: "polyglot", name: "🌍 Polyglot", description: "Learn 3 languages" },
  night_owl: { id: "night_owl", name: "🦉 Night Owl", description: "Study after 11 PM" },
  streak_master: { id: "streak_master", name: "🔥 Streak Master", description: "7-day streak" },
  bookworm: { id: "bookworm", name: "📚 Bookworm", description: "Save 50 phrases" },
  chatterbox: { id: "chatterbox", name: "💬 Chatterbox", description: "50 chat messages" },
  speed_learner: { id: "speed_learner", name: "⚡ Speed Learner", description: "20 activities in 1 day" },
  first_steps: { id: "first_steps", name: "👣 First Steps", description: "Complete first activity" },
  perfectionist: { id: "perfectionist", name: "✨ Perfectionist", description: "100% accuracy 5 times" },
};

const BADGES_SAFE = BADGES || FALLBACK_BADGES;

export default function ProfileScreen() {
  const { colors, theme } = useTheme();
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState({ totalActivities: 0, totalDays: 0, currentStreak: 0 });
  const [xpProgress, setXpProgress] = useState({ needed: 100, progress: 0 });
  const [cefrProfile, setCefrProfile] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    console.log('Logout button pressed');
    
    // On web, use globalThis.confirm for better compatibility
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm?.('Are you sure you want to sign out?');
      if (confirmed) {
        setLoggingOut(true);
        try {
          console.log('Calling signOut...');
          await signOut();
          console.log('SignOut completed');
        } catch (error) {
          console.error('SignOut error:', error);
          globalThis.alert?.('Failed to sign out. Please try again.');
        } finally {
          setLoggingOut(false);
        }
      }
      return;
    }
    
    // Native platforms use Alert.alert
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              console.log('Calling signOut...');
              await signOut();
              console.log('SignOut completed');
            } catch (error) {
              console.error('SignOut error:', error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleResetProgress = async () => {
    const confirmationMessage = "Are you sure? This will wipe ALL your progress, history, and XP. This cannot be undone.";
    
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(confirmationMessage)) {
        await executeReset();
      }
      return;
    }

    Alert.alert(
      "Reset All Progress?",
      confirmationMessage,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset Everything", 
          style: "destructive", 
          onPress: executeReset 
        }
      ]
    );
  };

  const executeReset = async () => {
    try {
      // Wipe database
      await resetAllProgress();
      // Wipe AsyncStorage
      await AsyncStorage.clear();
      
      if (Platform.OS === 'web') {
        globalThis.alert?.("All progress has been reset.");
        window.location.reload();
      } else {
        Alert.alert("Success", "All progress has been reset.");
        loadProfileData(); // Refresh UI
      }
    } catch (e) {
      console.error("Reset failed", e);
      if (Platform.OS === 'web') globalThis.alert?.("Failed to reset progress.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    const [profileData, achievements, activeChallenges, totalStats, cefrData] = await Promise.all([
      getUserProfile(),
      getUnlockedAchievements(),
      getActiveChallenges(),
      getTotalStats(),
      getCEFRProfile(),
    ]);

    setCefrProfile(cefrData);

    // Also check AsyncStorage for XP (for web compatibility)
    let finalProfile = profileData;
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const savedXp = await AsyncStorage.getItem("totalXp");
      if (savedXp) {
        const asyncXp = parseInt(savedXp, 10);
        // Use the higher value between SQLite and AsyncStorage
        if (asyncXp > (profileData?.totalXp || 0)) {
          // Recalculate level based on actual XP
          const calculatedLevel = calculateLevel(asyncXp);
          finalProfile = { 
            ...profileData, 
            id: profileData?.id || 1,
            totalXp: asyncXp,
            currentLevel: Math.max(calculatedLevel, profileData?.currentLevel || 1)
          } as UserProfile;
        }
      }
    } catch (e) {
      console.log("AsyncStorage XP read error:", e);
    }

    // Always recalculate level to ensure consistency
    const totalXp = finalProfile?.totalXp || 0;
    const currentLevel = finalProfile?.currentLevel || 1;
    const correctLevel = calculateLevel(totalXp);
    
    if (correctLevel !== currentLevel) {
      finalProfile = { ...finalProfile, id: finalProfile?.id || 1, currentLevel: correctLevel } as UserProfile;
    }

    setProfile(finalProfile);
    setUnlockedBadges(achievements);
    setChallenges(activeChallenges);
    setStats(totalStats);
    setXpProgress(getXPForNextLevel(totalXp, correctLevel));

    // Generate challenges if needed
    await generateWeeklyChallenges();
    const updatedChallenges = await getActiveChallenges();
    setChallenges(updatedChallenges);
  };

  const isBadgeUnlocked = (badgeId: string) => {
    return unlockedBadges.some((b) => b.badgeId === badgeId);
  };

  const xpPercentage = xpProgress.needed > 0 ? (xpProgress.progress / xpProgress.needed) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Level */}
        <View style={styles.header}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{profile?.currentLevel || 1}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.text }]}>Language Learner</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Level {profile?.currentLevel || 1} • {profile?.totalXp || 0} XP
            </Text>
            {user?.email && (
              <Text style={[styles.email, { color: colors.muted }]} numberOfLines={1}>
                {user.email}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.cardBackground }]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: colors.error + '10', 
              padding: 12, 
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.error + '30'
            }}
            onPress={handleResetProgress}
          >
            <Ionicons name="refresh-circle" size={20} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.error, fontWeight: 'bold' }}>Reset All Progress</Text>
          </TouchableOpacity>
        </View>

        {/* XP Progress Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabels}>
            <Text style={[styles.xpLabel, { color: colors.icon }]}>XP Progress</Text>
            <Text style={[styles.xpLabel, { color: colors.icon }]}>
              {xpProgress.progress} / {xpProgress.needed}
            </Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.min(xpPercentage, 100)}%` }]} />
          </View>
          <Text style={[styles.xpHint, { color: colors.muted }]}>
            {xpProgress.needed - xpProgress.progress} XP to Level {(profile?.currentLevel || 1) + 1}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="flame" size={24} color="#ef4444" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="calendar" size={24} color="#3b82f6" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalDays}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Days Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalActivities}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Activities</Text>
          </View>
        </View>

        {/* CEFR Spiky Skills */}
        {cefrProfile && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Skill Levels (CEFR)</Text>
            <View style={[styles.skillsContainer, { backgroundColor: colors.cardBackground }]}>
              {Object.entries(cefrProfile.skills || {}).map(([skill, data]: [string, any]) => (
                <View key={skill} style={styles.skillRow}>
                  <View style={styles.skillInfo}>
                    <Text style={[styles.skillName, { color: colors.text }]}>
                      {skill.charAt(0).toUpperCase() + skill.slice(1)}
                    </Text>
                    <View style={[styles.skillBadge, { backgroundColor: colors.tint + "20" }]}>
                      <Text style={[styles.skillLevel, { color: colors.tint }]}>{data.level}</Text>
                    </View>
                  </View>
                  <View style={styles.skillBarBg}>
                    <View 
                      style={[
                        styles.skillBarFill, 
                        { 
                          width: `${(data.confidence || 0.5) * 100}%`,
                          backgroundColor: colors.tint 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.skillConfidence, { color: colors.muted }]}>
                    {Math.round((data.confidence || 0.5) * 100)}% Confidence
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Weekly Challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🎯 Weekly Challenges</Text>
          </View>
          {challenges.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No active challenges. Check back soon!
              </Text>
            </View>
          ) : (
            challenges.map((challenge) => (
              <View
                key={challenge.id}
                style={[styles.challengeCard, { backgroundColor: colors.cardBackground }]}
              >
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeTitle, { color: colors.text }]}>
                    {challenge.title}
                  </Text>
                  <Text style={[styles.challengeDesc, { color: colors.icon }]}>
                    {challenge.description}
                  </Text>
                </View>
                <View style={styles.challengeProgress}>
                  <Text style={[styles.progressText, { color: colors.tint }]}>
                    {challenge.progress || 0}/{challenge.goal}
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${((challenge.progress || 0) / challenge.goal) * 100}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.xpReward}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={[styles.xpRewardText, { color: "#f59e0b" }]}>
                      +{challenge.xpReward || 0} XP
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 Achievements</Text>
            <Text style={[styles.badgeCount, { color: colors.icon }]}>
              {unlockedBadges.length}/{Object.keys(BADGES_SAFE).length}
            </Text>
          </View>
          <View style={styles.badgeGrid}>
            {Object.values(BADGES_SAFE).map((badge) => {
              const unlocked = isBadgeUnlocked(badge.id);
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    { backgroundColor: unlocked ? colors.cardBackground : "#f1f5f9" },
                    !unlocked && styles.lockedBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.badgeIcon,
                      { backgroundColor: unlocked ? colors.tint + "20" : "#e2e8f0" },
                    ]}
                  >
                    <Text style={styles.badgeEmoji}>{badge.name.split(" ")[0]}</Text>
                  </View>
                  <Text
                    style={[
                      styles.badgeName,
                      { color: unlocked ? colors.text : colors.muted },
                    ]}
                  >
                    {badge.name.slice(2).trim()}
                  </Text>
                  <Text
                    style={[
                      styles.badgeDesc,
                      { color: unlocked ? colors.icon : colors.muted },
                    ]}
                    numberOfLines={2}
                  >
                    {badge.description}
                  </Text>
                  {!unlocked && (
                    <Ionicons
                      name="lock-closed"
                      size={16}
                      color={colors.muted}
                      style={styles.lockIcon}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  email: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  xpSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  xpLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  xpBarBg: {
    height: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 5,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
    borderRadius: 5,
  },
  xpHint: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 15,
    gap: 10,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  skillsContainer: {
    padding: 15,
    borderRadius: 12,
    marginTop: 5,
  },
  skillRow: {
    marginBottom: 15,
  },
  skillInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skillLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  skillBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  skillConfidence: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  badgeCount: {
    fontSize: 14,
  },
  challengeCard: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  challengeDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  challengeProgress: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  progressBarBg: {
    width: 80,
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
    borderRadius: 3,
  },
  xpReward: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 3,
  },
  xpRewardText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyCard: {
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  lockedBadge: {
    opacity: 0.6,
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  badgeDesc: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  lockIcon: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});
