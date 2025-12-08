import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";

const GRAMMAR_LESSONS = [
  {
    id: "1",
    title: "Present Tense",
    description: "Learn how to form sentences in the present tense",
    icon: "time-outline",
    level: "Beginner",
    duration: "15 min",
  },
  {
    id: "2",
    title: "Past Tense",
    description: "Master the past tense with regular and irregular verbs",
    icon: "calendar-outline",
    level: "Intermediate",
    duration: "20 min",
  },
  {
    id: "3",
    title: "Future Tense",
    description: "Express future actions and plans",
    icon: "rocket-outline",
    level: "Beginner",
    duration: "10 min",
  },
  {
    id: "4",
    title: "Subjunctive Mood",
    description: "Learn the subjunctive for wishes and hypotheticals",
    icon: "cloud-outline",
    level: "Advanced",
    duration: "25 min",
  },
  {
    id: "5",
    title: "Conditional Sentences",
    description: "If-then structures and conditional clauses",
    icon: "git-merge-outline",
    level: "Intermediate",
    duration: "18 min",
  },
];

const VOCABULARY_SETS = [
  {
    id: "v1",
    title: "Food & Dining",
    words: 50,
    icon: "restaurant-outline",
    color: "#FF6B6B",
  },
  {
    id: "v2",
    title: "Travel & Transportation",
    words: 80,
    icon: "airplane-outline",
    color: "#4ECDC4",
  },
  {
    id: "v3",
    title: "Business & Work",
    words: 60,
    icon: "briefcase-outline",
    color: "#FFD166",
  },
  {
    id: "v4",
    title: "Health & Medicine",
    words: 40,
    icon: "medkit-outline",
    color: "#06D6A0",
  },
  {
    id: "v5",
    title: "Technology",
    words: 70,
    icon: "hardware-chip-outline",
    color: "#118AB2",
  },
];

const CULTURE_TIPS = [
  "In Japan, it's polite to say 'itadakimasu' before eating.",
  "In France, always greet shopkeepers when entering a store.",
  "In Spain, dinner is typically eaten at 9-10 PM.",
  "In Germany, punctuality is highly valued in both business and social settings.",
  "In Italy, espresso is usually drunk standing at the bar.",
];

export default function ExploreScreen() {
  const colorScheme = "light";
  const colors = Colors[colorScheme];
  const [selectedCategory, setSelectedCategory] = useState("grammar");

  const startLesson = (lesson: any) => {
    Alert.alert(
      "Start Lesson",
      `Begin "${lesson.title}"? This will open an interactive lesson.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start", style: "default" },
      ]
    );
  };

  const practiceVocabulary = (set: any) => {
    Alert.alert(
      "Practice Vocabulary",
      `Practice ${set.words} words in "${set.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Practice", style: "default" },
      ]
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: colors.tint, dark: colors.tint }}
      headerImage={
        <IconSymbol
          size={310}
          color={colors.background}
          name="book.fill"
          style={styles.headerImage}
        />
      }
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.content}>
          <ThemedText type="title" style={styles.mainTitle}>
            Language Learning Hub
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            Master grammar, vocabulary, and cultural nuances
          </ThemedText>

          {/* Category Selector */}
          <View style={styles.categoryContainer}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === "grammar" && {
                  backgroundColor: colors.tint,
                },
              ]}
              onPress={() => setSelectedCategory("grammar")}
            >
              <Ionicons
                name="school-outline"
                size={20}
                color={selectedCategory === "grammar" ? "#fff" : colors.text}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  {
                    color:
                      selectedCategory === "grammar" ? "#fff" : colors.text,
                  },
                ]}
              >
                Grammar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === "vocabulary" && {
                  backgroundColor: colors.tint,
                },
              ]}
              onPress={() => setSelectedCategory("vocabulary")}
            >
              <Ionicons
                name="library-outline"
                size={20}
                color={selectedCategory === "vocabulary" ? "#fff" : colors.text}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  {
                    color:
                      selectedCategory === "vocabulary" ? "#fff" : colors.text,
                  },
                ]}
              >
                Vocabulary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === "culture" && {
                  backgroundColor: colors.tint,
                },
              ]}
              onPress={() => setSelectedCategory("culture")}
            >
              <Ionicons
                name="globe-outline"
                size={20}
                color={selectedCategory === "culture" ? "#fff" : colors.text}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  {
                    color:
                      selectedCategory === "culture" ? "#fff" : colors.text,
                  },
                ]}
              >
                Culture
              </Text>
            </TouchableOpacity>
          </View>

          {/* Grammar Lessons */}
          {selectedCategory === "grammar" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Grammar Lessons
                </Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAll, { color: colors.tint }]}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              {GRAMMAR_LESSONS.map((lesson) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={[
                    styles.lessonCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.icon,
                    },
                  ]}
                  onPress={() => startLesson(lesson)}
                >
                  <View style={styles.lessonHeader}>
                    <View style={styles.lessonIconContainer}>
                      <Ionicons
                        name={lesson.icon as any}
                        size={24}
                        color={colors.tint}
                      />
                    </View>
                    <View style={styles.lessonInfo}>
                      <Text
                        style={[styles.lessonTitle, { color: colors.text }]}
                      >
                        {lesson.title}
                      </Text>
                      <Text
                        style={[
                          styles.lessonDescription,
                          { color: colors.icon },
                        ]}
                      >
                        {lesson.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.lessonFooter}>
                    <View
                      style={[
                        styles.levelBadge,
                        { backgroundColor: colors.tint + "20" },
                      ]}
                    >
                      <Text style={[styles.levelText, { color: colors.tint }]}>
                        {lesson.level}
                      </Text>
                    </View>
                    <View style={styles.duration}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.icon}
                      />
                      <Text
                        style={[styles.durationText, { color: colors.icon }]}
                      >
                        {lesson.duration}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Vocabulary Sets */}
          {selectedCategory === "vocabulary" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Vocabulary Sets
                </Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAll, { color: colors.tint }]}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.vocabularyGrid}>
                {VOCABULARY_SETS.map((set) => (
                  <TouchableOpacity
                    key={set.id}
                    style={[
                      styles.vocabCard,
                      { backgroundColor: set.color + "20" },
                    ]}
                    onPress={() => practiceVocabulary(set)}
                  >
                    <View
                      style={[styles.vocabIcon, { backgroundColor: set.color }]}
                    >
                      <Ionicons name={set.icon as any} size={24} color="#fff" />
                    </View>
                    <Text style={[styles.vocabTitle, { color: colors.text }]}>
                      {set.title}
                    </Text>
                    <Text style={[styles.vocabWords, { color: colors.icon }]}>
                      {set.words} words
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Culture Tips */}
          {selectedCategory === "culture" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Cultural Tips
                </Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAll, { color: colors.tint }]}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cultureContainer}>
                {CULTURE_TIPS.map((tip, index) => (
                  <View
                    key={index}
                    style={[
                      styles.tipCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.icon,
                      },
                    ]}
                  >
                    <Ionicons
                      name="bulb-outline"
                      size={20}
                      color={colors.tint}
                    />
                    <Text style={[styles.tipText, { color: colors.text }]}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Daily Challenge */}
          <View
            style={[styles.dailyChallenge, { backgroundColor: colors.tint }]}
          >
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeTitle}>Daily Challenge</Text>
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>+100 XP</Text>
              </View>
            </View>
            <Text style={styles.challengeDescription}>
              Translate 5 sentences with perfect grammar to earn bonus XP!
            </Text>
            <TouchableOpacity style={styles.startChallengeButton}>
              <Text style={styles.startChallengeText}>Start Challenge</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Progress Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.tint }]}>
                42
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Lessons Completed
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.tint }]}>
                1,250
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Words Learned
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.tint }]}>
                18
              </Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Day Streak
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerImage: {
    bottom: -90,
    left: -35,
    position: "absolute",
    opacity: 0.3,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  categoryContainer: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 10,
  },
  categoryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 8,
  },
  categoryButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  lessonCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 15,
  },
  lessonHeader: {
    flexDirection: "row",
    marginBottom: 15,
  },
  lessonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  lessonDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  lessonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  duration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
  },
  vocabularyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  vocabCard: {
    width: "47%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  vocabIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  vocabTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  vocabWords: {
    fontSize: 12,
  },
  cultureContainer: {
    gap: 15,
  },
  tipCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 15,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  dailyChallenge: {
    padding: 25,
    borderRadius: 20,
    marginBottom: 30,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  challengeBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  challengeBadgeText: {
    color: "#007AFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  challengeDescription: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 20,
    lineHeight: 20,
  },
  startChallengeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  startChallengeText: {
    color: "#007AFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F2F4F7",
    padding: 20,
    borderRadius: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#ddd",
  },
});
