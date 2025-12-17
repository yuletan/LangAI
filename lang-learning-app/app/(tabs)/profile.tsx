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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useFocusEffect } from "@react-navigation/native";
import {
  getUserProfile,
  getUnlockedAchievements,
  getActiveChallenges,
  getTotalStats,
  getXPForNextLevel,
  generateWeeklyChallenges,
  calculateLevel,
  BADGES,
  AchievementRow,
  ChallengeRow,
  UserProfileRow,
} from "@/db";

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
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<AchievementRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [stats, setStats] = useState({ totalActivities: 0, totalDays: 0, currentStreak: 0 });
  const [xpProgress, setXpProgress] = useState({ needed: 100, progress: 0 });

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    const [profileData, achievements, activeChallenges, totalStats] = await Promise.all([
      getUserProfile(),
      getUnlockedAchievements(),
      getActiveChallenges(),
      getTotalStats(),
    ]);

    // Also check AsyncStorage for XP (for web compatibility)
    let finalProfile = profileData;
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const savedXp = await AsyncStorage.getItem("totalXp");
      if (savedXp) {
        const asyncXp = parseInt(savedXp, 10);
        // Use the higher value between SQLite and AsyncStorage
        if (asyncXp > profileData.total_xp) {
          // Recalculate level based on actual XP
          const calculatedLevel = calculateLevel(asyncXp);
          finalProfile = { 
            ...profileData, 
            total_xp: asyncXp,
            current_level: Math.max(calculatedLevel, profileData.current_level)
          };
        }
      }
    } catch (e) {
      console.log("AsyncStorage XP read error:", e);
    }

    // Always recalculate level to ensure consistency
    const correctLevel = calculateLevel(finalProfile.total_xp);
    if (correctLevel !== finalProfile.current_level) {
      finalProfile = { ...finalProfile, current_level: correctLevel };
    }

    setProfile(finalProfile);
    setUnlockedBadges(achievements);
    setChallenges(activeChallenges);
    setStats(totalStats);
    setXpProgress(getXPForNextLevel(finalProfile.total_xp, finalProfile.current_level));

    // Generate challenges if needed
    await generateWeeklyChallenges();
    const updatedChallenges = await getActiveChallenges();
    setChallenges(updatedChallenges);
  };

  const isBadgeUnlocked = (badgeId: string) => {
    return unlockedBadges.some((b) => b.badge_id === badgeId);
  };

  const xpPercentage = xpProgress.needed > 0 ? (xpProgress.progress / xpProgress.needed) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Level */}
        <View style={styles.header}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{profile?.current_level || 1}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.text }]}>Language Learner</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Level {profile?.current_level || 1} • {profile?.total_xp || 0} XP
            </Text>
          </View>
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
            {xpProgress.needed - xpProgress.progress} XP to Level {(profile?.current_level || 1) + 1}
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
                    {challenge.progress}/{challenge.goal}
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${(challenge.progress / challenge.goal) * 100}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.xpReward}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={[styles.xpRewardText, { color: "#f59e0b" }]}>
                      +{challenge.xp_reward} XP
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
