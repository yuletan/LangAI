import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE_URL } from "@/constants/config";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import {
  getPhrasesForReview,
  getAllPhrases,
  updatePhraseReview,
  deletePhrase,
  PhraseRow,
  getTotalStats,
  getActivityByDate,
  getUserProfile,
  saveLessonToCache,
  getRandomCachedLesson,
  addPhraseWithDetails,
  recordActivity,
} from "@/db";
import { useFocusEffect } from "@react-navigation/native";
import SkillTree from "@/components/SkillTree";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GRAMMAR_LESSONS = [
  {
    id: "1",
    title: "Present Tense",
    description: "Learn how to form sentences in the present tense",
    icon: "time-outline",
    level: "Beginner",
    duration: "5 min",
    color: "#22c55e",
  },
  {
    id: "2",
    title: "Past Tense",
    description: "Master the past tense with regular and irregular verbs",
    icon: "calendar-outline",
    level: "Intermediate",
    duration: "5 min",
    color: "#3b82f6",
  },
  {
    id: "3",
    title: "Future Tense",
    description: "Express future actions and plans",
    icon: "rocket-outline",
    level: "Beginner",
    duration: "5 min",
    color: "#a855f7",
  },
  {
    id: "4",
    title: "Subjunctive Mood",
    description: "Learn the subjunctive for wishes and hypotheticals",
    icon: "cloud-outline",
    level: "Advanced",
    duration: "5 min",
    color: "#f59e0b",
  },
];

const VOCABULARY_SETS = [
  { id: "v1", title: "Food & Dining", words: 50, icon: "restaurant-outline", color: "#FF6B6B" },
  { id: "v2", title: "Travel", words: 80, icon: "airplane-outline", color: "#4ECDC4" },
  { id: "v3", title: "Business", words: 60, icon: "briefcase-outline", color: "#FFD166" },
  { id: "v4", title: "Health", words: 40, icon: "medkit-outline", color: "#06D6A0" },
];

const LESSONS_PER_LEVEL: { [key: string]: number } = {
  "A1": 10,
  "A2": 15,
  "B1": 20,
  "B2": 25,
  "C1": 30,
  "C2": 35,
};

export default function ExploreScreen() {
  const { colors, theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("review");
  const [phrasesForReview, setPhrasesForReview] = useState<PhraseRow[]>([]);
  const [allPhrases, setAllPhrases] = useState<PhraseRow[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState({ totalActivities: 0, totalDays: 0, currentStreak: 0 });
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);

  // Dynamic Lesson State
  const [cefrLevel, setCefrLevel] = useState("B1");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [currentTopic, setCurrentTopic] = useState("");
  
  // Multi-Question Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{index: number, correct: boolean, attempts: number}[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [phrasesSaved, setPhrasesSaved] = useState(0);
  
  // Lesson Progress & XP
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);

  // Lesson counts per level
  const LESSONS_PER_LEVEL: { [key: string]: number } = {
    A1: 10, A2: 15, B1: 20, B2: 25, C1: 30, C2: 35
  };

  const flipAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      loadCefrLevel();
    }, [])
  );

  const loadCefrLevel = async () => {
    const level = await AsyncStorage.getItem("cefrLevel");
    if (level) setCefrLevel(level);
    
    const language = await AsyncStorage.getItem("targetLanguage");
    if (language) setTargetLanguage(language);
    
    // Load lesson progress
    const completed = await AsyncStorage.getItem("lessonsCompleted");
    if (completed) setLessonsCompleted(parseInt(completed));
    
    // Load XP from both keys for backwards compatibility
    let xp = await AsyncStorage.getItem("totalXp");
    if (!xp) xp = await AsyncStorage.getItem("totalXP");
    if (xp) setTotalXP(parseInt(xp));
    
    const streak = await AsyncStorage.getItem("consecutiveCorrect");
    if (streak) setConsecutiveCorrect(parseInt(streak));
  };

  // Lesson Results State
  const [lessonComplete, setLessonComplete] = useState(false);
  const [lessonResults, setLessonResults] = useState({
    score: 0,
    total: 0,
    xp: 0,
    phrasesSaved: 0,
    streak: 0,
    accuracy: 0
  });

  const handleGenerateLesson = async (topic: string, types: string) => {
    setGeneratingLesson(true);
    setCurrentLesson(null);
    setLessonModalVisible(true);
    setCurrentTopic(topic);
    
    // Reset quiz state
    setCurrentQuestionIndex(0);
    setQuizAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setPhrasesSaved(0);
    setQuizAnswered(false);
    setQuizCorrect(false);
    setLessonComplete(false); // Reset completion state

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      let data = null;
      const cacheKey = `lesson_cache_${topic}_${targetLanguage}_${cefrLevel}`;
      
      // ... (caching logic unchanged) ...
      
      // Always try cache first (works on web via AsyncStorage)
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const cachedLessons = JSON.parse(cachedData);
          // Filter to only lessons with 5-question format
          const validLessons = cachedLessons.filter((lesson: any) => 
            lesson.quiz_questions && lesson.quiz_questions.length >= 5
          );
          
          if (validLessons.length > 0) {
            // Pick a random cached lesson
            const randomIndex = Math.floor(Math.random() * validLessons.length);
            data = validLessons[randomIndex];
            console.log(`📦 Using cached lesson (${validLessons.length} valid, 5-question format)`);
          } else {
            // Clear old format cache
            await AsyncStorage.removeItem(cacheKey);
            console.log("🗑️ Cleared old single-question cache");
          }
        }
      } catch (cacheError) {
        console.log("Cache read error:", cacheError);
      }
      
      if (!data) {
        // Fetch new lesson from API
        console.log("🌐 Fetching new lesson from API...");
        const response = await fetch(`${API_BASE_URL}/lessons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: cefrLevel,
            topic: `${types} for ${topic}`,
            language: targetLanguage,
          }),
        });

        data = await response.json();
        
        // Cache the new lesson permanently (works on web too)
        if (data.quiz_questions) {
          try {
            const existingCache = await AsyncStorage.getItem(cacheKey);
            let cachedLessons = existingCache ? JSON.parse(existingCache) : [];
            
            // Add new lesson (max 10 per topic)
            cachedLessons.push(data);
            if (cachedLessons.length > 10) {
              cachedLessons = cachedLessons.slice(-10);
            }
            
            await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedLessons));
            console.log(`💾 Lesson cached (${cachedLessons.length} total for this topic)`);
          } catch (cacheError) {
            console.log("Cache write error:", cacheError);
          }
        }
      }
      
      setCurrentLesson(data);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Lesson generation error:", error);
      Alert.alert("Error", "Could not generate lesson.");
      setLessonModalVisible(false);
    } finally {
      setGeneratingLesson(false);
    }
  };

  const completeLesson = async () => {
    const questions = currentLesson.quiz_questions || [currentLesson.quiz_question];
    
    // Calculate XP based on multi-question performance
    let xpEarned = 0;
    let firstTryCorrect = 0;
    let totalCorrect = 0;
    
    quizAnswers.forEach(answer => {
      if (answer.correct) {
        totalCorrect++;
        if (answer.attempts === 1) {
          xpEarned += 5; // First try correct
          firstTryCorrect++;
        } else {
          xpEarned += 2; // Retry correct
        }
      }
    });
    
    // Bonus for all first-try correct
    if (firstTryCorrect === questions.length) {
      xpEarned += 10;
    }
    
    const newXP = totalXP + xpEarned;
    const newCompleted = lessonsCompleted + 1;
    
    setTotalXP(newXP);
    setLessonsCompleted(newCompleted);
    
    // Save XP with consistent key (lowercase p to match other pages)
    await AsyncStorage.setItem("totalXp", newXP.toString());
    await AsyncStorage.setItem("totalXP", newXP.toString()); // Also update old key
    await AsyncStorage.setItem("lessonsCompleted", newCompleted.toString());
    
    // Record activity for dashboard tracking (score = accuracy percentage)
    const accuracyScore = Math.round((firstTryCorrect / questions.length) * 100);
    if (Platform.OS !== "web") {
      await recordActivity("review", accuracyScore);
    }
    
    // Update consecutive correct streak
    if (firstTryCorrect === questions.length) {
      const newStreak = consecutiveCorrect + 1;
      setConsecutiveCorrect(newStreak);
      await AsyncStorage.setItem("consecutiveCorrect", newStreak.toString());
    } else {
      setConsecutiveCorrect(0);
      await AsyncStorage.setItem("consecutiveCorrect", "0");
    }

    // Set results for UI
    setLessonResults({
      score: totalCorrect,
      total: questions.length,
      xp: xpEarned,
      phrasesSaved: phrasesSaved,
      streak: consecutiveCorrect,
      accuracy: Math.round((firstTryCorrect / questions.length) * 100)
    });
    setLessonComplete(true);
    
    // Check for level up
    const lessonsNeeded = LESSONS_PER_LEVEL[cefrLevel] || 20;
    if (newCompleted >= lessonsNeeded) {
      const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
      const currentIdx = levels.indexOf(cefrLevel);
      if (currentIdx < levels.length - 1) {
        const newLevel = levels[currentIdx + 1];
        setCefrLevel(newLevel);
        await AsyncStorage.setItem("cefrLevel", newLevel);
        setLessonsCompleted(0);
        await AsyncStorage.setItem("lessonsCompleted", "0");
        Alert.alert("🎉 Level Up!", `Congratulations! You advanced to ${newLevel}!`, [
          { text: "Amazing!", onPress: () => {} } // Don't close modal yet
        ]);
        return;
      }
    }
  };

  // ... (existing code) ...




  const handleQuizAnswer = async (selectedIndex: number) => {
    setSelectedAnswer(selectedIndex);
    
    const questions = currentLesson.quiz_questions || [currentLesson.quiz_question];
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.correct_index;
    
    // Track this answer attempt
    const existingAnswer = quizAnswers[currentQuestionIndex];
    const attempts = existingAnswer ? existingAnswer.attempts + 1 : 1;
    
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuestionIndex] = { index: selectedIndex, correct: isCorrect, attempts };
    setQuizAnswers(newAnswers);
    
    setShowExplanation(true);
    
    if (Platform.OS !== "web") {
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const handleNextQuestion = async () => {
    const questions = currentLesson.quiz_questions || [currentLesson.quiz_question];
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // All questions completed, show summary
      await completeLesson();
    }
  };

  const saveQuizPhrase = async (option: any) => {
    try {
      const phraseData = {
        id: Date.now(),
        original: option.target || (typeof option === 'string' ? option : ''),
        translated: option.english || "",
        pronunciation: option.reading || "",
        explanation: option.explanation || "",
        use_case: option.use_case || "",
        next_review: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
        created_at: Date.now(),
      };
      
      // Use AsyncStorage for web compatibility
      const savedPhrasesKey = "saved_phrases";
      const existingData = await AsyncStorage.getItem(savedPhrasesKey);
      let phrases = existingData ? JSON.parse(existingData) : [];
      
      // Check if already saved
      const isDuplicate = phrases.some((p: any) => p.original === phraseData.original);
      if (isDuplicate) {
        Alert.alert("Already Saved", "This phrase is already in your deck.");
        return;
      }
      
      phrases.push(phraseData);
      await AsyncStorage.setItem(savedPhrasesKey, JSON.stringify(phrases));
      
      // Also try SQLite for native platforms
      if (Platform.OS !== "web") {
        await addPhraseWithDetails(
          phraseData.original,
          phraseData.translated,
          phraseData.pronunciation,
          phraseData.explanation,
          phraseData.use_case
        );
      }
      
      // Update local state to show in UI immediately
      setAllPhrases(prev => [phraseData as any, ...prev]);
      setPhrasesSaved(prev => prev + 1);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("✅ Saved!", "Phrase added to your review deck.");
      console.log(`💾 Phrase saved: ${phraseData.original}`);
    } catch (e) {
      console.error("Save phrase error:", e);
      Alert.alert("Error", "Could not save phrase.");
    }
  };



  const loadData = async () => {
    try {
      let allPhrasesData: PhraseRow[] = [];
      let reviewPhrasesData: PhraseRow[] = [];
      
      // Load from SQLite (native only)
      if (Platform.OS !== "web") {
        reviewPhrasesData = await getPhrasesForReview();
        allPhrasesData = await getAllPhrases();
      }
      
      // Also load from AsyncStorage (works on web)
      try {
        const savedPhrasesKey = "saved_phrases";
        const savedData = await AsyncStorage.getItem(savedPhrasesKey);
        if (savedData) {
          const asyncPhrases = JSON.parse(savedData);
          // Merge with SQLite phrases, avoiding duplicates
          asyncPhrases.forEach((phrase: any) => {
            if (!allPhrasesData.some(p => p.original === phrase.original)) {
              allPhrasesData.push(phrase);
            }
            // Check if due for review
            if (phrase.next_review <= Date.now()) {
              if (!reviewPhrasesData.some(p => p.original === phrase.original)) {
                reviewPhrasesData.push(phrase);
              }
            }
          });
        }
      } catch (asyncError) {
        console.log("AsyncStorage phrases load error:", asyncError);
      }
      
      const statsData = await getTotalStats();
      const activity = await getActivityByDate();

      setPhrasesForReview(reviewPhrasesData);
      setAllPhrases(allPhrasesData);
      setStats(statsData);
      setActivityData(activity);
    } catch (e) {
      console.error("Error loading data:", e);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRating = async (quality: 1 | 2 | 3 | 4 | 5) => {
    if (phrasesForReview.length === 0) return;

    const currentPhrase = phrasesForReview[currentCardIndex];
    await updatePhraseReview(currentPhrase.id, quality);
    
    // Record review activity for dashboard tracking (score = quality * 20 to get 0-100 scale)
    if (Platform.OS !== "web") {
      await recordActivity("review", quality * 20);
    }

    if (Platform.OS !== "web") {
      if (quality >= 4) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (quality <= 2) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    // Animate card exit
    Animated.timing(swipeAnim, {
      toValue: quality >= 3 ? SCREEN_WIDTH : -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Move to next card or finish
      if (currentCardIndex < phrasesForReview.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setIsFlipped(false);
        flipAnim.setValue(0);
        swipeAnim.setValue(0);
      } else {
        Alert.alert(
          "Review Complete! 🎉",
          "Great job! You've reviewed all phrases due today.",
          [{ text: "OK", onPress: loadData }]
        );
        setCurrentCardIndex(0);
        setIsFlipped(false);
        flipAnim.setValue(0);
        swipeAnim.setValue(0);
      }
    });
  };

  const speakPhrase = async (text: string, language?: string) => {
    // Map common language names to speech codes
    const langMap: {[key: string]: string} = {
      "Spanish": "es-ES",
      "French": "fr-FR",
      "German": "de-DE",
      "Italian": "it-IT",
      "Portuguese": "pt-BR",
      "Japanese": "ja-JP",
      "Chinese": "zh-CN",
      "Korean": "ko-KR",
      "Arabic": "ar-SA",
      "English": "en-US"
    };
    
    try {
      // Stop any current speech
      await Speech.stop();
      
      // Use provided language or target language
      const speechLang = language ? langMap[language] || language : langMap[targetLanguage] || "en-US";
      
      await Speech.speak(text, { 
        language: speechLang, 
        rate: 0.8,
        pitch: 1.0 
      });
      
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error playing phrase:", error);
    }
  };

  const handleDeletePhrase = async (id: number | undefined, original?: string) => {
    Alert.alert(
      "Delete Phrase",
      "Are you sure you want to remove this phrase from your deck?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
             // Optimistic update: Filter by ID if present, OR by original text. 
             // This ensures legacy items (no ID) are removed immediately from UI.
            setAllPhrases(prev => prev.filter(p => {
              if (id && p.id === id) return false;
              if (original && p.original === original) return false;
              return true;
            }));
            
            // Remove from AsyncStorage
            try {
              const savedPhrasesKey = "saved_phrases";
              const savedData = await AsyncStorage.getItem(savedPhrasesKey);
              if (savedData) {
                let phrases = JSON.parse(savedData);
                // Filter logic matching the UI
                phrases = phrases.filter((p: any) => {
                    if (id && p.id === id) return false;
                    if (original && p.original === original) return false;
                    return true;
                });
                await AsyncStorage.setItem(savedPhrasesKey, JSON.stringify(phrases));
              }
            } catch (e) {
              console.error("Error removing from AsyncStorage:", e);
            }

            // Remove from DB only if we have a valid ID
            if (id) {
              await deletePhrase(id);
            }
            
            // Reload to sync
            // loadData(); // Disabled to prevent flicker, optimistic update handles UI
          },
        },
      ]
    );
  };

  // Flip animation interpolation
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = {
    transform: [
      { rotateY: frontInterpolate },
      { translateX: swipeAnim },
    ],
  };
  const backAnimatedStyle = {
    transform: [
      { rotateY: backInterpolate },
      { translateX: swipeAnim },
    ],
  };

  // Enhanced activity visualization (last 7 days with summary)
  const renderActivityHeatmap = () => {
    const last7Days = [];
    let thisWeekTotal = 0;
    let lastWeekTotal = 0;
    
    // Calculate this week's activity
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayData = activityData.find((d) => d.date === dateStr);
      const count = dayData?.count || 0;
      thisWeekTotal += count;
      last7Days.push({
        date: dateStr,
        count,
        dayName: date.toLocaleDateString("en", { weekday: "short" }),
        isToday: i === 0,
      });
    }
    
    // Calculate last week's activity for comparison
    for (let i = 13; i >= 7; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayData = activityData.find((d) => d.date === dateStr);
      lastWeekTotal += dayData?.count || 0;
    }
    
    const weekChange = thisWeekTotal - lastWeekTotal;
    const weekChangeText = weekChange > 0 ? `↑ ${weekChange}` : weekChange < 0 ? `↓ ${Math.abs(weekChange)}` : "—";
    const weekChangeColor = weekChange > 0 ? "#22c55e" : weekChange < 0 ? "#ef4444" : colors.icon;

    return (
      <View style={[styles.activityCard, { backgroundColor: colors.cardBackground, ...Shadows.sm }]}>
        {/* Weekly Summary Header */}
        <View style={styles.activityHeader}>
          <View>
            <Text style={[styles.activityTitle, { color: colors.text }]}>📊 This Week</Text>
            <Text style={[styles.activitySubtitle, { color: colors.icon }]}>
              {thisWeekTotal} activities
            </Text>
          </View>
          <View style={styles.weekChangeContainer}>
            <Text style={[styles.weekChangeText, { color: weekChangeColor }]}>
              {weekChangeText}
            </Text>
            <Text style={[styles.weekChangeLabel, { color: colors.icon }]}>vs last week</Text>
          </View>
        </View>
        
        {/* Day-by-Day Breakdown */}
        <View style={styles.activityDays}>
          {last7Days.map((day, i) => (
            <View key={i} style={styles.activityDay}>
              <View
                style={[
                  styles.activityDot,
                  {
                    backgroundColor:
                      day.count === 0
                        ? (theme === 'dark' ? '#374151' : '#e5e7eb')
                        : day.count < 3
                        ? "#86efac"
                        : day.count < 7
                        ? "#22c55e"
                        : "#15803d",
                    borderWidth: day.isToday ? 2 : 0,
                    borderColor: colors.tint,
                  },
                ]}
              >
                {day.count > 0 && (
                  <Text style={styles.activityDotText}>{day.count}</Text>
                )}
              </View>
              <Text style={[
                styles.activityDayLabel, 
                { color: day.isToday ? colors.tint : colors.icon, fontWeight: day.isToday ? '700' : '400' }
              ]}>
                {day.isToday ? "Today" : day.dayName}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Streak indicator */}
        {stats.currentStreak > 0 && (
          <View style={[styles.streakBanner, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="flame" size={16} color="#f59e0b" />
            <Text style={styles.streakBannerText}>
              {stats.currentStreak} day streak! Keep it up! 🔥
            </Text>
          </View>
        )}
      </View>
    );
  };

  const currentPhrase = phrasesForReview[currentCardIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            Learning Hub
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Review, learn, and track your progress
          </Text>

          {/* Stats Overview */}
          <View style={styles.statsOverview}>
            <View style={[styles.statCard, { 
              backgroundColor: theme === 'dark' ? '#451a03' : '#fef3c7',
              borderWidth: 1,
              borderColor: theme === 'dark' ? '#f59e0b40' : '#fbbf2460',
            }]}>
              <Ionicons name="flame" size={24} color="#f59e0b" />
              <Text style={[styles.statValue, { color: theme === 'dark' ? '#fbbf24' : '#92400e' }]}>{stats.currentStreak}</Text>
              <Text style={[styles.statName, { color: theme === 'dark' ? '#fbbf24' : '#92400e' }]}>Day Streak</Text>
            </View>
            <View style={[styles.statCard, { 
              backgroundColor: theme === 'dark' ? '#172554' : '#dbeafe',
              borderWidth: 1,
              borderColor: theme === 'dark' ? '#3b82f640' : '#60a5fa60',
            }]}>
              <Ionicons name="library" size={24} color="#3b82f6" />
              <Text style={[styles.statValue, { color: theme === 'dark' ? '#60a5fa' : '#1e40af' }]}>{allPhrases.length}</Text>
              <Text style={[styles.statName, { color: theme === 'dark' ? '#60a5fa' : '#1e40af' }]}>Phrases</Text>
            </View>
            <View style={[styles.statCard, { 
              backgroundColor: theme === 'dark' ? '#052e16' : '#dcfce7',
              borderWidth: 1,
              borderColor: theme === 'dark' ? '#22c55e40' : '#4ade8060',
            }]}>
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              <Text style={[styles.statValue, { color: theme === 'dark' ? '#4ade80' : '#166534' }]}>{stats.totalActivities}</Text>
              <Text style={[styles.statName, { color: theme === 'dark' ? '#4ade80' : '#166534' }]}>Reviews</Text>
            </View>
          </View>

          {/* Activity Heatmap */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            This Week's Activity
          </Text>
          {renderActivityHeatmap()}

          {/* Category Selector */}
          <View style={styles.categoryContainer}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === "review" && { backgroundColor: colors.tint },
              ]}
              onPress={() => setSelectedCategory("review")}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={selectedCategory === "review" ? "#fff" : colors.text}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  { color: selectedCategory === "review" ? "#fff" : colors.text },
                ]}
              >
                Review ({phrasesForReview.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === "phrases" && { backgroundColor: colors.tint },
              ]}
              onPress={() => setSelectedCategory("phrases")}
            >
              <Ionicons
                name="list-outline"
                size={18}
                color={selectedCategory === "phrases" ? "#fff" : colors.text}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  { color: selectedCategory === "phrases" ? "#fff" : colors.text },
                ]}
              >
                All Phrases
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === "learn" && { backgroundColor: colors.tint },
              ]}
              onPress={() => setSelectedCategory("learn")}
            >
              <Ionicons
                name="school-outline"
                size={18}
                color={selectedCategory === "learn" ? "#fff" : colors.text}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  { color: selectedCategory === "learn" ? "#fff" : colors.text },
                ]}
              >
                Lessons
              </Text>
            </TouchableOpacity>
          </View>

          {/* SRS Flashcard Review */}
          {selectedCategory === "review" && (
            <View style={styles.section}>
              {phrasesForReview.length > 0 && currentPhrase ? (
                <>
                  <Text style={[styles.progressText, { color: colors.icon }]}>
                    Card {currentCardIndex + 1} of {phrasesForReview.length}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={flipCard}
                    style={styles.cardContainer}
                  >
                    {/* Front of Card */}
                    <Animated.View
                      style={[styles.flashcard, frontAnimatedStyle, { backfaceVisibility: "hidden" }]}
                    >
                      <View style={[styles.flashcardInner, { backgroundColor: colors.background }]}>
                        <Text style={styles.cardLabel}>Original</Text>
                        <Text style={[styles.cardText, { color: colors.text }]}>
                          {currentPhrase.original}
                        </Text>
                        <TouchableOpacity
                          style={styles.cardAudioBtn}
                          onPress={() => speakPhrase(currentPhrase.original, "English")}
                        >
                          <Ionicons name="volume-high" size={24} color={colors.tint} />
                        </TouchableOpacity>
                        <Text style={styles.tapHint}>Tap to flip</Text>
                      </View>
                    </Animated.View>

                    {/* Back of Card */}
                    <Animated.View
                      style={[
                        styles.flashcard,
                        styles.flashcardBack,
                        backAnimatedStyle,
                        { backfaceVisibility: "hidden" },
                      ]}
                    >
                      <View style={[styles.flashcardInner, { backgroundColor: colors.tint + "10" }]}>
                        <Text style={styles.cardLabel}>Translation</Text>
                        <Text style={[styles.cardText, { color: colors.tint }]}>
                          {currentPhrase.translated}
                        </Text>
                        {/* Clean pronunciation display */}
                        {currentPhrase.pronunciation && (
                          <Text style={[styles.cardPronunciation, { color: colors.icon }]}>
                            {currentPhrase.pronunciation.split('\n---EXPLANATION---')[0].split('\n---USECASE---')[0]}
                          </Text>
                        )}
                        {/* Show explanation if available */}
                        {currentPhrase.pronunciation && currentPhrase.pronunciation.includes('---EXPLANATION---') && (
                          <View style={styles.cardExplanation}>
                            <Text style={[styles.cardExplanationTitle, { color: colors.text }]}>💡 Explanation</Text>
                            <Text style={[styles.cardExplanationText, { color: colors.icon }]}>
                              {currentPhrase.pronunciation.split('---EXPLANATION---')[1]?.split('---USECASE---')[0]?.trim()}
                            </Text>
                          </View>
                        )}
                        {/* Show use case if available */}
                        {currentPhrase.pronunciation && currentPhrase.pronunciation.includes('---USECASE---') && (
                          <View style={styles.cardUseCase}>
                            <Text style={[styles.cardUseCaseTitle, { color: colors.text }]}>📝 Example</Text>
                            <Text style={[styles.cardUseCaseText, { color: colors.icon }]}>
                              {currentPhrase.pronunciation.split('---USECASE---')[1]?.trim()}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.cardAudioBtn}
                          onPress={() => speakPhrase(currentPhrase.translated, targetLanguage)}
                        >
                          <Ionicons name="volume-high" size={24} color={colors.tint} />
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Rating Buttons */}
                  <Text style={[styles.ratingPrompt, { color: colors.text }]}>
                    How well did you know this?
                  </Text>
                  <View style={styles.ratingButtons}>
                    <TouchableOpacity
                      style={[styles.ratingBtn, { backgroundColor: "#fecaca" }]}
                      onPress={() => handleRating(1)}
                    >
                      <Text style={[styles.ratingBtnText, { color: "#dc2626" }]}>Again</Text>
                      <Text style={styles.ratingBtnSub}>1 day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ratingBtn, { backgroundColor: "#fed7aa" }]}
                      onPress={() => handleRating(3)}
                    >
                      <Text style={[styles.ratingBtnText, { color: "#ea580c" }]}>Hard</Text>
                      <Text style={styles.ratingBtnSub}>3 days</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ratingBtn, { backgroundColor: "#bbf7d0" }]}
                      onPress={() => handleRating(4)}
                    >
                      <Text style={[styles.ratingBtnText, { color: "#16a34a" }]}>Good</Text>
                      <Text style={styles.ratingBtnSub}>1 week</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ratingBtn, { backgroundColor: "#dbeafe" }]}
                      onPress={() => handleRating(5)}
                    >
                      <Text style={[styles.ratingBtnText, { color: "#2563eb" }]}>Easy</Text>
                      <Text style={styles.ratingBtnSub}>2 weeks</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    All caught up!
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
                    No phrases due for review. Save phrases from the Predictor tab to build your deck.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* All Phrases List */}
          {selectedCategory === "phrases" && (
            <View style={styles.section}>
              {allPhrases.length > 0 ? (
                allPhrases.map((phrase) => (
                  <View
                    key={phrase.id}
                    style={[styles.phraseCard, { backgroundColor: colors.background, borderColor: colors.icon + "30" }]}
                  >
                    <View style={styles.phraseContent}>
                      <Text style={[styles.phraseOriginal, { color: colors.text }]}>
                        {phrase.original}
                      </Text>
                      <Text style={[styles.phraseTranslated, { color: colors.tint }]}>
                        {phrase.translated}
                      </Text>
                      <Text style={[styles.phraseNextReview, { color: colors.icon }]}>
                        {`Next review: ${new Date(phrase.next_review).toLocaleDateString()}`}
                      </Text>
                    </View>
                    <View style={styles.phraseActions}>
                      <TouchableOpacity
                        onPress={() => speakPhrase(phrase.original, targetLanguage)}
                        style={styles.phraseActionBtn}
                      >
                        <Ionicons name="volume-medium" size={20} color={colors.tint} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletePhrase(phrase.id, phrase.original)}
                        style={styles.phraseActionBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={64} color={colors.icon} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    No phrases saved yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
                    Save translations from the Predictor tab to start building your personal vocabulary deck.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Grammar Lessons */}
          {selectedCategory === "learn" && (
            <View style={styles.section}>
              {/* Progress Bar */}
              <View style={[styles.progressCard, { backgroundColor: colors.tint + "10", borderColor: colors.tint + "30" }]}>
                <View style={styles.progressHeader}>
                  <View style={styles.levelBadgeLarge}>
                    <Text style={[styles.levelBadgeText, { color: colors.tint }]}>{cefrLevel}</Text>
                  </View>
                  <View style={styles.xpBadge}>
                    <Ionicons name="star" size={16} color="#f59e0b" />
                    <Text style={styles.xpText}>{totalXP} XP</Text>
                  </View>
                </View>
                <Text style={[styles.progressLabel, { color: colors.text }]}>
                  {lessonsCompleted}/{LESSONS_PER_LEVEL[cefrLevel] || 20} Lessons Completed
                </Text>
                <View style={styles.progressBarOuter}>
                  <View 
                    style={[
                      styles.progressBarInner, 
                      { 
                        width: `${(lessonsCompleted / (LESSONS_PER_LEVEL[cefrLevel] || 20)) * 100}%`,
                        backgroundColor: colors.tint 
                      }
                    ]} 
                  />
                </View>
                {consecutiveCorrect > 1 && (
                  <Text style={[styles.streakText, { color: "#f59e0b" }]}>
                    🔥 {consecutiveCorrect} correct streak!
                  </Text>
                )}
              </View>

              <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
                Grammar Lessons
              </Text>
              {GRAMMAR_LESSONS.map((lesson) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={[styles.lessonCard, { backgroundColor: colors.background, borderColor: colors.icon + "30" }]}
                  onPress={() => handleGenerateLesson(lesson.title, "Grammar Lesson")}
                >
                  <View style={[styles.lessonIcon, { backgroundColor: lesson.color + "20" }]}>
                    <Ionicons name={lesson.icon as any} size={24} color={lesson.color} />
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={[styles.lessonTitle, { color: colors.text }]}>
                      {lesson.title}
                    </Text>
                    <Text style={[styles.lessonDesc, { color: colors.icon }]}>
                      {lesson.description}
                    </Text>
                    <View style={styles.lessonMeta}>
                      <View style={[styles.levelBadge, { backgroundColor: lesson.color + "20" }]}>
                        <Text style={[styles.levelText, { color: lesson.color }]}>
                          {lesson.level}
                        </Text>
                      </View>
                      <View style={styles.durationBadge}>
                        <Ionicons name="time-outline" size={12} color={colors.icon} />
                        <Text style={[styles.durationText, { color: colors.icon }]}>
                          {lesson.duration}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                </TouchableOpacity>
              ))}

              <Text style={[styles.sectionSubtitle, { color: colors.text, marginTop: 20 }]}>
                Vocabulary Sets
              </Text>
              <View style={styles.vocabGrid}>
                {VOCABULARY_SETS.map((set) => (
                  <TouchableOpacity
                    key={set.id}
                    style={[styles.vocabCard, { backgroundColor: set.color + "15" }]}
                    onPress={() => handleGenerateLesson(set.title, "Vocabulary Set")}
                  >
                    <View style={[styles.vocabIcon, { backgroundColor: set.color }]}>
                      <Ionicons name={set.icon as any} size={24} color="#fff" />
                    </View>
                    <Text style={[styles.vocabTitle, { color: colors.text }]}>
                      {set.title}
                    </Text>
                    <Text style={[styles.vocabCount, { color: colors.icon }]}>
                      {set.words} words
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
        {/* Lesson Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lessonModalVisible}
        onRequestClose={() => setLessonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {generatingLesson ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Generating {cefrLevel} {targetLanguage} Lesson...
                </Text>
              </View>
            ) : lessonComplete ? (
              // LESSON SUMMARY UI
              <ScrollView contentContainerStyle={styles.summaryContainer}>
                <View style={styles.summaryHeader}>
                   <Ionicons name="trophy" size={60} color="#f59e0b" />
                   <Text style={[styles.summaryTitle, { color: colors.text }]}>{lessonResults.accuracy === 100 ? "Perfect Score!" : "Lesson Complete!"}</Text>
                   <Text style={[styles.summarySubtitle, { color: colors.icon }]}>You're making great progress.</Text>
                </View>

                <View style={[styles.statsGrid, { backgroundColor: colors.background }]}>
                   <View style={styles.statItem}>
                     <Text style={[styles.summaryStatValue, { color: colors.tint }]}>{lessonResults.score}/{lessonResults.total}</Text>
                     <Text style={[styles.statLabel, { color: colors.icon }]}>Correct</Text>
                   </View>
                   <View style={styles.statItem}>
                     <Text style={[styles.summaryStatValue, { color: "#f59e0b" }]}>+{lessonResults.xp}</Text>
                     <Text style={[styles.statLabel, { color: colors.icon }]}>XP Earned</Text>
                   </View>
                   <View style={styles.statItem}>
                     <Text style={[styles.summaryStatValue, { color: "#3b82f6" }]}>{lessonResults.phrasesSaved}</Text>
                     <Text style={[styles.statLabel, { color: colors.icon }]}>Phrases Saved</Text>
                   </View>
                </View>

                {lessonResults.accuracy === 100 && (
                   <View style={styles.bonusBadge}>
                     <Text style={styles.bonusText}>✨ Perfect Score Bonus +10 XP</Text>
                   </View>
                )}

                <TouchableOpacity
                  style={[styles.completeLessonBtn, { backgroundColor: colors.tint, marginTop: 40 }]}
                  onPress={() => setLessonModalVisible(false)}
                >
                  <Text style={styles.completeLessonText}>Continue Learning</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : currentLesson ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.icon + "30" }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{currentLesson.title}</Text>
                  <TouchableOpacity onPress={() => setLessonModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color={colors.icon} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.lessonIntro, { color: colors.text }]}>
                  {currentLesson.introduction}
                </Text>

                <View style={[styles.keyPointsCard, { backgroundColor: colors.tint + "15" }]}>
                  <Text style={[styles.cardHeader, { color: colors.tint }]}>Key Points</Text>
                  {currentLesson.key_points?.map((point: any, idx: number) => (
                    <View key={idx} style={styles.pointRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.tint} />
                      <View style={styles.pointText}>
                        <Text style={[styles.bilingualTarget, { color: colors.text }]}>
                          {typeof point === 'string' ? point : point.target}
                        </Text>
                        {typeof point === 'object' && point.english && (
                          <Text style={[styles.bilingualEnglish, { color: colors.icon }]}>
                            {point.english}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                <View style={[styles.exampleCard, { borderColor: colors.icon + "30" }]}>
                  <Text style={[styles.cardHeader, { color: colors.text }]}>Example</Text>
                  <Text style={[styles.exampleText, { color: colors.text }]}>
                    "{currentLesson.example?.text}"
                  </Text>
                  <Text style={[styles.exampleTranslation, { color: colors.icon }]}>
                    {currentLesson.example?.translation}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.audioBtn, { backgroundColor: colors.tint + "20" }]}
                    onPress={() => speakPhrase(currentLesson.example?.text, targetLanguage)}
                  >
                    <Ionicons name="volume-high" size={20} color={colors.tint} />
                  </TouchableOpacity>
                </View>

                {/* Multi-Question Quiz Section */}
                {(currentLesson.quiz_questions || currentLesson.quiz_question) && (() => {
                  const questions = currentLesson.quiz_questions || [currentLesson.quiz_question];
                  const currentQuestion = questions[currentQuestionIndex];
                  const currentAnswer = quizAnswers[currentQuestionIndex];
                  const isAnswered = selectedAnswer !== null;
                  // Check if answered correctly by comparing selected answer with correct index
                  const isCorrect = isAnswered && selectedAnswer === currentQuestion.correct_index;
                  
                  return (
                    <View style={styles.quizCard}>
                      {/* Progress Indicator */}
                      <View style={styles.quizProgressRow}>
                        <Text style={styles.quizTitle}>Quick Quiz</Text>
                        <Text style={[styles.quizProgress, { color: colors.tint }]}>
                          Question {currentQuestionIndex + 1}/{questions.length}
                        </Text>
                      </View>
                      
                      {/* Question */}
                      <Text style={styles.quizQuestion}>{currentQuestion.question}</Text>
                      {currentQuestion.question_english && (
                        <Text style={[styles.quizQuestionEnglish, { color: colors.icon }]}>
                          {currentQuestion.question_english}
                        </Text>
                      )}
                      {currentQuestion.question_reading && (
                        <Text style={[styles.readingGuide, { color: "#a855f7" }]}>
                          ({currentQuestion.question_reading})
                        </Text>
                      )}
                      
                      {/* Options */}
                      <View style={styles.optionsContainer}>
                        {currentQuestion.options.map((opt: any, idx: number) => (
                          <View key={idx} style={styles.optionRow}>
                            <TouchableOpacity 
                              style={[
                                styles.quizOption, 
                                styles.quizOptionFlex,
                                { 
                                  borderColor: colors.icon + "30",
                                  backgroundColor: colors.background
                                },
                                isAnswered && idx === currentQuestion.correct_index && styles.correctOption,
                                isAnswered && selectedAnswer === idx && idx !== currentQuestion.correct_index && styles.wrongOption
                              ]}
                              onPress={() => handleQuizAnswer(idx)}
                              disabled={isAnswered && isCorrect}
                            >
                              <Text style={[styles.bilingualTarget, { color: colors.text }]}>
                                {typeof opt === 'string' ? opt : opt.target}
                              </Text>
                              {typeof opt === 'object' && opt.reading && (
                                <Text style={[styles.readingGuide, { color: "#a855f7" }]}>
                                  ({opt.reading})
                                </Text>
                              )}
                              {isAnswered && idx === currentQuestion.correct_index && (
                                <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={styles.answerIcon} />
                              )}
                            </TouchableOpacity>
                            
                            {/* Audio and Save Buttons */}
                            <View style={styles.optionActions}>
                              <TouchableOpacity 
                                style={[styles.optionActionBtn, { backgroundColor: colors.tint + "20" }]}
                                onPress={() => speakPhrase(typeof opt === 'string' ? opt : opt.target, targetLanguage)}
                              >
                                <Ionicons name="volume-medium" size={16} color={colors.tint} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.optionActionBtn, { backgroundColor: colors.success + "20" }]}
                                onPress={() => saveQuizPhrase(opt)}
                              >
                                <Ionicons name="bookmark-outline" size={16} color={colors.success} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                      
                      {/* Result and Explanation */}
                      {showExplanation && (
                        <View style={styles.explanationSection}>
                          <Text style={[styles.resultText, { color: isCorrect ? "#22c55e" : "#ef4444" }]}>
                            {isCorrect ? "🎉 Correct!" : "❌ Not quite right"}
                          </Text>
                          
                          {/* Show explanation for correct answer */}
                          {currentQuestion.options[currentQuestion.correct_index]?.explanation && (
                            <View style={[styles.explanationCard, { backgroundColor: "#f0fdf4" }]}>
                              <Text style={styles.explanationTitle}>📖 Explanation</Text>
                              <Text style={styles.explanationText}>
                                {currentQuestion.options[currentQuestion.correct_index].explanation}
                              </Text>
                            </View>
                          )}
                          
                          {/* Show use case example */}
                          {currentQuestion.options[currentQuestion.correct_index]?.use_case && (
                            <View style={[styles.useCaseCard, { backgroundColor: "#eff6ff" }]}>
                              <Text style={styles.useCaseTitle}>💡 Another Example</Text>
                              <Text style={styles.useCaseText}>
                                {currentQuestion.options[currentQuestion.correct_index].use_case}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                      
                      {/* Action Buttons */}
                      {showExplanation && (
                        <View style={styles.quizActions}>
                          {!isCorrect && (
                            <TouchableOpacity 
                              style={[styles.retryBtn, { borderColor: colors.tint }]}
                              onPress={handleRetry}
                            >
                              <Text style={[styles.retryBtnText, { color: colors.tint }]}>Try Again</Text>
                            </TouchableOpacity>
                          )}
                          {isCorrect && (
                            <TouchableOpacity 
                              style={[styles.nextBtn, { backgroundColor: colors.tint }]}
                              onPress={handleNextQuestion}
                            >
                              <Text style={styles.nextBtnText}>
                                {currentQuestionIndex < questions.length - 1 ? "Next Question →" : "Complete Lesson (+XP)"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })()}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  content: { 
    padding: Platform.OS === 'web' ? Spacing.lg : Spacing.md 
  },
  headerImage: { bottom: -90, left: -35, position: "absolute", opacity: 0.3 },
  mainTitle: { 
    fontSize: Platform.OS === 'web' ? 28 : 24, 
    fontWeight: "bold", 
    marginBottom: Spacing.sm 
  },
  subtitle: { 
    fontSize: Platform.OS === 'web' ? 16 : 14, 
    marginBottom: Spacing.lg 
  },
  statsOverview: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: "center",
    ...Shadows.sm,
  },
  statValue: { fontSize: 24, fontWeight: "bold", marginVertical: Spacing.xs },
  statName: { fontSize: 12, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  sectionSubtitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  heatmapContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  heatmapDay: { alignItems: "center" },
  heatmapCell: { width: 36, height: 36, borderRadius: 8 },
  heatmapLabel: { fontSize: 10, marginTop: 4 },
  // Enhanced Activity Card Styles
  activityCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  activitySubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  weekChangeContainer: {
    alignItems: "flex-end",
  },
  weekChangeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  weekChangeLabel: {
    fontSize: 11,
  },
  activityDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  activityDay: {
    alignItems: "center",
    flex: 1,
  },
  activityDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  activityDotText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  activityDayLabel: {
    fontSize: 10,
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  streakBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400e",
  },
  categoryContainer: { flexDirection: "row", gap: 8, marginBottom: 20 },
  categoryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 4,
  },
  categoryButtonText: { fontSize: 12, fontWeight: "600" },
  section: { marginBottom: 30 },
  progressText: { textAlign: "center", marginBottom: 10, fontSize: 14 },
  cardContainer: {
    height: 220,
    marginBottom: 20,
    // perspective needs to be used within transform in RN
    transform: [{ perspective: 1000 }],
  },
  flashcard: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  flashcardBack: {
    position: "absolute",
  },
  flashcardInner: {
    flex: 1,
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }
    ),
  },
  cardLabel: { fontSize: 12, color: "#888", marginBottom: 10, textTransform: "uppercase" },
  cardText: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  cardPronunciation: { fontSize: 16, fontStyle: "italic", marginBottom: 10 },
  cardExplanation: { marginTop: 10, padding: 8, backgroundColor: "#f0f9ff", borderRadius: 8, width: "100%" },
  cardExplanationTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  cardExplanationText: { fontSize: 12, lineHeight: 16 },
  cardUseCase: { marginTop: 8, padding: 8, backgroundColor: "#f0fdf4", borderRadius: 8, width: "100%" },
  cardUseCaseTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  cardUseCaseText: { fontSize: 12, lineHeight: 16 },
  cardAudioBtn: { padding: 10 },
  tapHint: { position: "absolute", bottom: 15, fontSize: 12, color: "#aaa" },
  ratingPrompt: { textAlign: "center", fontSize: 14, marginBottom: 12 },
  ratingButtons: { flexDirection: "row", gap: 8 },
  ratingBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  ratingBtnText: { fontSize: 14, fontWeight: "bold" },
  ratingBtnSub: { fontSize: 10, color: "#666", marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", marginTop: 15, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  phraseCard: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  phraseContent: { flex: 1 },
  phraseOriginal: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  phraseTranslated: { fontSize: 14, marginBottom: 4 },
  phraseNextReview: { fontSize: 12 },
  phraseActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  phraseActionBtn: { padding: 8 },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  lessonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  lessonDesc: { fontSize: 13, marginBottom: 8 },
  lessonMeta: { flexDirection: "row", gap: 10 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontSize: 11, fontWeight: "600" },
  durationBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationText: { fontSize: 11 },
  vocabGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  vocabCard: {
    width: "47%",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  vocabIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  vocabTitle: { fontSize: 14, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  vocabCount: { fontSize: 12 },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", flex: 1 },
  loadingContainer: { alignItems: "center", padding: 40 },
  loadingText: { marginTop: 15, fontSize: 16 },
  lessonIntro: { fontSize: 16, lineHeight: 24, marginBottom: 20 },
  keyPointsCard: { padding: 15, borderRadius: 12, marginBottom: 20 },
  cardHeader: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  pointRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  pointText: { flex: 1 },
  exampleCard: { borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 20 },
  exampleText: { fontSize: 18, fontStyle: "italic", marginBottom: 5 },
  exampleTranslation: { fontSize: 14, marginBottom: 10 },
  audioBtn: { alignSelf: "flex-start", padding: 5 },
  quizCard: { backgroundColor: "#f0fdf4", padding: 15, borderRadius: 12 },
  quizTitle: { fontSize: 16, fontWeight: "bold", color: "#166534" },
  quizProgressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  quizProgress: { fontSize: 14, fontWeight: "600" },
  quizQuestion: { fontSize: 15, marginBottom: 15, color: "#14532d" },
  optionsContainer: { gap: 8 },
  optionRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  quizOption: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  quizOptionFlex: { flex: 1 },
  saveOptionBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  bilingualTarget: { fontSize: 16, color: "#333", marginBottom: 2 },
  bilingualEnglish: { fontSize: 14, color: "#666", fontStyle: "italic" },
  // Explanation styles
  explanationSection: { marginTop: 15 },
  explanationCard: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  explanationTitle: { fontSize: 14, fontWeight: "bold", color: "#166534", marginBottom: 6 },
  explanationText: { fontSize: 14, color: "#14532d", lineHeight: 20 },
  useCaseCard: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  useCaseTitle: { fontSize: 14, fontWeight: "bold", color: "#1e40af", marginBottom: 6 },
  useCaseText: { fontSize: 14, color: "#1e3a8a", lineHeight: 20 },
  // Quiz action buttons
  quizActions: { marginTop: 20, flexDirection: "row", gap: 10 },
  retryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
  },
  retryBtnText: { fontSize: 16, fontWeight: "bold" },
  nextBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  // Progress Card Styles
  progressCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  levelBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
  },
  levelBadgeText: { fontSize: 18, fontWeight: "bold" },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  xpText: { fontSize: 14, fontWeight: "bold", color: "#f59e0b" },
  progressLabel: { fontSize: 14, marginBottom: 8 },
  progressBarOuter: {
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    borderRadius: 5,
  },
  streakText: { fontSize: 12, marginTop: 8, fontWeight: "600" },
  // Quiz enhanced styles
  quizQuestionEnglish: { fontSize: 14, marginBottom: 5, fontStyle: "italic" },
  readingGuide: { fontSize: 13, marginBottom: 3 },
  correctOption: { borderColor: "#22c55e", borderWidth: 2, backgroundColor: "#f0fdf4" },
  wrongOption: { borderColor: "#ef4444", borderWidth: 2, backgroundColor: "#fef2f2" },
  answerIcon: { position: "absolute", right: 10, top: "50%" },
  quizResult: { marginTop: 15, alignItems: "center" },
  resultText: { fontSize: 18, fontWeight: "bold" },
  completeLessonBtn: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  completeLessonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  summaryContainer: {
    padding: 20,
    alignItems: "center",
  },
  summaryHeader: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  summarySubtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  bonusBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  bonusText: {
    color: "#d97706",
    fontWeight: "bold",
    fontSize: 14,
  },
  
  // New styles for enhanced audio and actions
  optionActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  optionActionBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.sm,
  },
  enhancedAudioBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    alignSelf: "flex-end",
    marginTop: Spacing.sm,
  },
});
