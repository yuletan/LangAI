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
  TextInput,
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
import PronunciationHelper from "@/components/PronunciationHelper";
import { clearAllLessonCaches } from "@/utils/cacheManager";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// CEFR Order for locking logic
const CEFR_ORDER: { [key: string]: number } = {
  "A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6
};

// Comprehensive Grammar Curriculum based on CEFR Config
const GRAMMAR_LESSONS = [
  // A1
  { id: "a1_1", title: "Present Simple & To Be", description: "Basics of verbs and existence", level: "A1", icon: "time-outline", color: "#22c55e", duration: "5 min" },
  { id: "a1_2", title: "Basic Imperatives", description: "Giving commands and instructions", level: "A1", icon: "alert-circle-outline", color: "#22c55e", duration: "4 min" },
  { id: "a1_3", title: "Question Words", description: "Who, What, Where usage", level: "A1", icon: "help-circle-outline", color: "#22c55e", duration: "5 min" },
  { id: "a1_4", title: "Pronouns & Possessives", description: "I, You, Mine, Yours", level: "A1", icon: "person-outline", color: "#22c55e", duration: "5 min" },

  // A2
  { id: "a2_1", title: "Past Simple", description: "Regular and irregular past actions", level: "A2", icon: "arrow-undo-outline", color: "#3b82f6", duration: "7 min" },
  { id: "a2_2", title: "Future with 'Going to'", description: "Planning future events", level: "A2", icon: "arrow-forward-outline", color: "#3b82f6", duration: "6 min" },
  { id: "a2_3", title: "Comparatives", description: "Comparing distinct objects", level: "A2", icon: "resize-outline", color: "#3b82f6", duration: "6 min" },
  { id: "a2_4", title: "Modals (Can/Must)", description: "Ability and necessity", level: "A2", icon: "key-outline", color: "#3b82f6", duration: "6 min" },

  // B1
  { id: "b1_1", title: "Present Perfect", description: "Connecting past to present", level: "B1", icon: "infinite-outline", color: "#f59e0b", duration: "8 min" },
  { id: "b1_2", title: "Future (Will vs Going to)", description: "Nuanced future forms", level: "B1", icon: "code-working-outline", color: "#f59e0b", duration: "8 min" },
  { id: "b1_3", title: "Conditionals (1st & 2nd)", description: "Real and unreal possibilities", level: "B1", icon: "git-branch-outline", color: "#f59e0b", duration: "10 min" },
  { id: "b1_4", title: "Passive Voice", description: "Focusing on the action", level: "B1", icon: "swap-horizontal-outline", color: "#f59e0b", duration: "8 min" },

  // B2
  { id: "b2_1", title: "Third Conditional", description: "Regrets and past hypotheticals", level: "B2", icon: "return-down-back-outline", color: "#ef4444", duration: "10 min" },
  { id: "b2_2", title: "Reported Speech", description: "Reporting what others said", level: "B2", icon: "chatbubbles-outline", color: "#ef4444", duration: "10 min" },
  { id: "b2_3", title: "Modals of Deduction", description: "Must have, Can't have", level: "B2", icon: "search-outline", color: "#ef4444", duration: "8 min" },

  // C1
  { id: "c1_1", title: "Subjunctive Mood", description: "Wishes, commands, and hypotheses", level: "C1", icon: "cloud-outline", color: "#a855f7", duration: "12 min" },
  { id: "c1_2", title: "Inversion", description: "Emphasis and formal style", level: "C1", icon: "shuffle-outline", color: "#a855f7", duration: "10 min" },
  { id: "c1_3", title: "Cleft Sentences", description: "Focusing information", level: "C1", icon: "cut-outline", color: "#a855f7", duration: "10 min" },
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
  const [activeTab, setActiveTab] = useState("vocabulary"); // For composite lessons
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [currentTopic, setCurrentTopic] = useState("");
  const [lessonDisplayTitle, setLessonDisplayTitle] = useState("Lesson");
  const [prefetchedLesson, setPrefetchedLesson] = useState<any>(null); // Store prefetched content
  
  // Multi-Question Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{index: number, correct: boolean, attempts: number}[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [phrasesSaved, setPhrasesSaved] = useState(0);
  const [isLevelUpQuiz, setIsLevelUpQuiz] = useState(false);
  
  // All-questions-on-page state (for listening/reading with passage)
  const [questionAnswers, setQuestionAnswers] = useState<{[key: number]: {selected: number | null, correct: boolean | null, wasWrongBefore?: boolean}}>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const spokenTextRef = useRef<string | null>(null);
  
  // Lesson Progress & XP
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [openEndedResponse, setOpenEndedResponse] = useState("");
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentFeedback, setAssessmentFeedback] = useState<any>(null);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // Lesson counts per level
  const LESSONS_PER_LEVEL: { [key: string]: number } = {
    A1: 10, A2: 15, B1: 20, B2: 25, C1: 30, C2: 35
  };

  const flipAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  // 1. Data Loading Functions (Hoisted)
  const loadCefrLevel = async () => {
    const level = await AsyncStorage.getItem("cefrLevel");
    if (level) setCefrLevel(level);
    const language = await AsyncStorage.getItem("targetLanguage");
    if (language) setTargetLanguage(language);
    const completed = await AsyncStorage.getItem("lessonsCompleted");
    if (completed) setLessonsCompleted(parseInt(completed));
    let xp = await AsyncStorage.getItem("totalXp") || await AsyncStorage.getItem("totalXP");
    if (xp) setTotalXP(parseInt(xp));
    const streak = await AsyncStorage.getItem("consecutiveCorrect");
    if (streak) setConsecutiveCorrect(parseInt(streak));
  };

  const loadData = async () => {
    try {
      let allPhrasesData: PhraseRow[] = [];
      let reviewPhrasesData: PhraseRow[] = [];
      if (Platform.OS !== "web") {
        reviewPhrasesData = await getPhrasesForReview();
        allPhrasesData = await getAllPhrases();
      }
      const savedData = await AsyncStorage.getItem("saved_phrases");
      if (savedData) {
        const asyncPhrases = JSON.parse(savedData);
        asyncPhrases.forEach((phrase: any) => {
          if (!allPhrasesData.some(p => p.original === phrase.original)) allPhrasesData.push(phrase);
          if (phrase.next_review <= Date.now() && !reviewPhrasesData.some(p => p.original === phrase.original)) {
            reviewPhrasesData.push(phrase);
          }
        });
      }
      const [statsData, activity] = await Promise.all([getTotalStats(), getActivityByDate()]);
      setPhrasesForReview(reviewPhrasesData);
      setAllPhrases(allPhrasesData);
      setStats(statsData);
      setActivityData(activity);
    } catch (e) {
      console.error("Error loading data:", e);
    }
  };

  const clearLogic = async () => {
    const count = await clearAllLessonCaches();
    setPrefetchedLesson(null);
    setCurrentLesson(null);
    await loadCefrLevel();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const message = `Removed ${count} cached lessons.`;
    Platform.OS === 'web' ? alert(message) : Alert.alert("Cache Cleared", message);
  };

  const handleClearCache = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Clear Lesson Cache?")) await clearLogic();
    } else {
      Alert.alert("Clear Cache?", "This will remove all cached lessons.", [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearLogic }
      ]);
    }
  };

  // 2. Lifecycle
  useFocusEffect(
    useCallback(() => {
      loadData();
      loadCefrLevel().then(() => {
        setTimeout(() => prefetchNextLesson(), 1000);
      });
    }, [])
  );

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

  const handleGenerateLesson = async (topic: string, types: string, isLevelUp: boolean = false) => {
    if (generatingLesson) return; // Prevent double trigger
    
    setGeneratingLesson(true);
    // Reset lesson state immediately to show fresh UI
    setCurrentLesson(null);
    setLessonModalVisible(true);
    setCurrentTopic(topic);
    setIsLevelUpQuiz(isLevelUp);
    
    const titlePrefix = types === 'listening' ? 'Listening Practice' : 
    types === 'reading' ? 'Reading Practice' : 
    types === 'drill' ? 'Mixed Practice' : 
    types === 'cloze' ? 'Cloze Practice' :
    types === 'inference' ? 'Inference Practice' :
    types === 'simple_sentence' ? 'Quick Practice' :
    isLevelUp ? `${cefrLevel} Mastery Assessment` : topic || 'Lesson';

    setLessonDisplayTitle(`${cefrLevel} ${titlePrefix}`);
  
  // Reset quiz state
    setCurrentQuestionIndex(0);
    setQuizAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setPhrasesSaved(0);
    setQuizAnswered(false);
    setQuizCorrect(false);
    setLessonComplete(false);
    setOpenEndedResponse("");
    setAssessmentFeedback(null);
    setQuestionAnswers({});
    setHasSubmitted(false);
    setIsPlaying(false);
    setCurrentGroupIndex(0);
    // Stop any playing audio
    Speech.stop().catch(() => {});

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      let data: any = null;
      const cacheKey = isLevelUp 
        ? `level_up_cache_${cefrLevel}_${targetLanguage}`
        : `lesson_cache_${topic}_${types}_${targetLanguage}_${cefrLevel}`;
      
      // Try cache first
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const cachedLessons = JSON.parse(cachedData);
          const validLessons = cachedLessons.filter((lesson: any) => 
            lesson.quiz_questions || lesson.quiz_items || lesson.questions
          );
          
          if (validLessons.length > 0) {
            const randomIndex = Math.floor(Math.random() * validLessons.length);
            data = validLessons[randomIndex];
            console.log(`📦 Using cached lesson for ${topic}`);
          }
        }
      } catch (cacheError) {
        console.log("Cache read error:", cacheError);
      }
      
      if (!data) {
        // Check for prefetched content first - ONLY if topics AND languages match!
        if (!isLevelUp && prefetchedLesson && prefetchedLesson.topic === topic && 
            prefetchedLesson.language === targetLanguage && prefetchedLesson.data) {
            console.log(`🚀 Using FAST PREFETCHED ${targetLanguage} lesson for: ${topic}!`);
            data = prefetchedLesson.data;
            setPrefetchedLesson(null); // Consume it
        } else {
            console.log(`🌐 Fetching ${isLevelUp ? 'Level-Up' : 'new'} lesson from API...`);
            const endpoint = isLevelUp ? "/cefr/content/level-up" : "/cefr/content/lesson";
            // Use the EXACT type passed from the UI (e.g., 'listening', 'reading', 'drill')
            const finalSkill = types.toLowerCase(); 
            const body = isLevelUp 
              ? { currentLevel: cefrLevel, language: targetLanguage }
              : { 
                  target_level: cefrLevel, 
                  language: targetLanguage, 
                  target_skill: finalSkill,
                  lesson_type: "PRACTICE",
                  domains: ["personal"],
                  focus_areas: [topic]
                };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Failed to fetch lesson");
            
            const rawData = result.data;
            
            // Extract the actual content based on endpoint type
            if (isLevelUp) {
              data = rawData.content;
            } else {
              // For regular lessons from CEFRContentService
              data = rawData.main_content;
              // Map composite components for compatibility if needed
              if (data.type === 'composite_lesson') {
                // For composite, we prioritize the grouped quiz items as the "main" ones
                data.quiz_questions = data.practice_quiz || [];
              } else if (data.quiz_items && !data.quiz_questions) {
                data.quiz_questions = data.quiz_items;
              }
            }
        }
        
        // === FRONTEND DATA NORMALIZATION ===
        // Ensure quiz_questions is an array
        if (!Array.isArray(data.quiz_questions)) {
          data.quiz_questions = data.quiz_question ? [data.quiz_question] : [];
        }

        // SLICE TO 5 QUESTIONS for practice types
        if (types !== 'composite_lesson' && types !== 'vocabulary' && !isLevelUp && data.quiz_questions.length > 5) {
          console.log(`✂️ Slicing ${data.quiz_questions.length} questions down to 5 for efficiency.`);
          data.quiz_questions = data.quiz_questions.slice(0, 5);
        }

        // For composite lessons, ensure sub-tasks exist
        if (data.type === 'composite_lesson') {
           if (!data.listening_task) data.listening_task = { questions: [] };
           if (!data.reading_task) data.reading_task = { questions: [] };
        }
        
        data.quiz_questions = data.quiz_questions.map((q: any) => {
          if (q.answer_index !== undefined && q.correct_index === undefined) q.correct_index = q.answer_index;
          if (q.correct_index === undefined || q.correct_index < 0) q.correct_index = 0;
          if (!q.options) q.options = [];
          return q;
        });
        
        if (!data.introduction) data.introduction = `Lesson on ${topic}`;
        
        // Cache the new lesson
        if (data.quiz_questions.length > 0 || data.type === 'composite_lesson') {
          const existingCache = await AsyncStorage.getItem(cacheKey);
          let cachedLessons = existingCache ? JSON.parse(existingCache) : [];
          cachedLessons.push(data);
          if (cachedLessons.length > 10) cachedLessons = cachedLessons.slice(-10);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedLessons));
        }
      }
      
      // Validation: Composite lessons might not have "main" quiz_questions but have sub-questions
      const hasQuestions = data.quiz_questions.length > 0 || 
                          (data.listening_task && data.listening_task.questions.length > 0) ||
                          (data.reading_task && data.reading_task.questions.length > 0);

      if (!data || !hasQuestions) {
        throw new Error("Invalid lesson data: No questions found.");
      }
      
      setCurrentLesson(data);
    } catch (error) {
      console.error("Lesson generation error:", error);
      Alert.alert("Error", "Could not load lesson.");
      closeLessonModal();
    } finally {
      setGeneratingLesson(false);
    }
  };

  const completeLesson = async () => {
    const questions = currentLesson.quiz_items || currentLesson.quiz_questions || [currentLesson.quiz_question];
    let totalCorrect = 0;
    let firstTryCorrect = 0;
    
    // Support both old quizAnswers and new questionAnswers state
    if (Object.keys(questionAnswers).length > 0) {
      // New all-questions-on-page approach
      Object.values(questionAnswers).forEach((answer: any) => {
        if (answer && answer.correct && !answer.wasWrongBefore) {
          totalCorrect++;
          firstTryCorrect++;
        }
      });
    } else {
      // Old one-at-a-time approach
      quizAnswers.forEach(answer => {
        if (answer && answer.correct && answer.attempts === 1) {
          totalCorrect++;
          firstTryCorrect++;
        }
      });
    }

    if (isLevelUpQuiz) {
      // Handle Boss Level completion
      const xpEarned = 500;
      const newXP = totalXP + xpEarned;
      const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
      const currentIdx = levels.indexOf(cefrLevel);
      const newLevel = levels[currentIdx + 1] || cefrLevel;

      setTotalXP(newXP);
      setCefrLevel(newLevel);
      setLessonsCompleted(0);
      setLessonComplete(true);
      setIsLevelUpQuiz(false);

      await AsyncStorage.setItem("totalXp", newXP.toString());
      await AsyncStorage.setItem("cefrLevel", newLevel);
      await AsyncStorage.setItem("lessonsCompleted", "0");

      setLessonResults({
        score: totalCorrect,
        total: questions.length,
        xp: xpEarned,
        phrasesSaved: phrasesSaved,
        streak: 0,
        accuracy: Math.round((totalCorrect / questions.length) * 100)
      });

      if (newLevel !== cefrLevel) {
          Alert.alert("🎉 CEFR LEVEL UP!", `Congratulations! You have mastered ${cefrLevel} and advanced to ${newLevel}!`);
      }
      return;
    }

    // Calculate XP based on lesson type
    let xpEarned;
    if (currentLesson.type === 'simple_sentence') {
      // Simple sentence lessons: 10-20 XP (10 base + 10 bonus for first try correct)
      xpEarned = 10 + (firstTryCorrect === questions.length ? 10 : 0);
    } else {
      // Regular lessons: 10 XP per correct + 50 bonus for perfect score
      xpEarned = totalCorrect * 10 + (firstTryCorrect === questions.length ? 50 : 0);
    }
    
    const newXP = totalXP + xpEarned;
    const newCompleted = lessonsCompleted + 1;
    
    setTotalXP(newXP);
    setLessonsCompleted(newCompleted);
    setLessonComplete(true);
    
    await AsyncStorage.setItem("totalXp", newXP.toString());
    await AsyncStorage.setItem("lessonsCompleted", newCompleted.toString());

    // Record activity
    const accuracyScore = Math.round((firstTryCorrect / questions.length) * 100);
    if (Platform.OS !== "web") {
      await recordActivity("review", accuracyScore);
    }
    
    // Update streak
    if (firstTryCorrect === questions.length) {
      const newStreak = consecutiveCorrect + 1;
      setConsecutiveCorrect(newStreak);
      await AsyncStorage.setItem("consecutiveCorrect", newStreak.toString());
    } else {
      setConsecutiveCorrect(0);
      await AsyncStorage.setItem("consecutiveCorrect", "0");
    }

    setLessonResults({
      score: totalCorrect,
      total: questions.length,
      xp: xpEarned,
      phrasesSaved: phrasesSaved,
      streak: firstTryCorrect === questions.length ? consecutiveCorrect + 1 : 0,
      accuracy: accuracyScore
    });

    const lessonsNeeded = LESSONS_PER_LEVEL[cefrLevel] || 20;
    if (newCompleted >= lessonsNeeded) {
      Alert.alert(
        "🔓 Boss Level Unlocked!",
        `You've completed all modules for ${cefrLevel}. Pass the 20-question Mastery Quiz to unlock the next level!`,
        [
          { text: "Later", style: "cancel" },
          { text: "Start Boss Quiz", onPress: () => handleGenerateLesson("Mastery Test", "Boss Level", true) }
        ]
      );
    } else {
      prefetchNextLesson();
    }
  };

  const prefetchNextLesson = async () => {
    try {
      const relevantLessons = GRAMMAR_LESSONS.filter(l => l.level === cefrLevel);
      if (relevantLessons.length === 0) return;
      
      const randomLesson = relevantLessons[Math.floor(Math.random() * relevantLessons.length)];
      const prefetchTopic = randomLesson.title;

      const body = { 
        target_level: cefrLevel, 
        language: targetLanguage, 
        target_skill: "reading",
        lesson_type: "PRACTICE",
        domains: ["personal"],
        focus_areas: [prefetchTopic]
      };
        
      const response = await fetch(`${API_BASE_URL}/cefr/content/lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const rawData = result.data;
          const data = rawData.main_content;
          
          // Map quiz_items to quiz_questions for frontend compatibility
          if (data.quiz_items && !data.quiz_questions) {
            data.quiz_questions = data.quiz_items;
          }
          
          setPrefetchedLesson({ 
            topic: prefetchTopic, 
            data, 
            language: targetLanguage 
          });
        }
      }
    } catch (e) {
      console.log("Prefetch failed", e);
    }
  };

  // ... (existing code) ...




  const handleQuizAnswer = async (selectedIndex: number) => {
    setSelectedAnswer(selectedIndex);
    
    const questions = currentLesson.quiz_questions || [currentLesson.quiz_question];
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.correct_index;
    
    setQuizCorrect(isCorrect);
    
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

  // 2. Lifecycle Hooks
  useFocusEffect(
    useCallback(() => {
      loadData();
      loadCefrLevel().then(() => {
          setTimeout(() => prefetchNextLesson(), 1000);
      });
    }, [])
  );

  const handleRetry = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizCorrect(false);
    setAssessmentFeedback(null);
  };

  const handleOpenEndedSubmit = async () => {
    if (!openEndedResponse.trim() || isAssessing) return;

    const questions = currentLesson.quiz_items || currentLesson.quiz_questions || [];
    const currentQuestion = questions[currentQuestionIndex];

    setIsAssessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cefr/assess/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: openEndedResponse,
          targetLevel: cefrLevel,
          questionContext: currentQuestion.question,
          skill: currentLesson.type || "reading"
        }),
      });

      const result = await response.json();
      if (result.success) {
        const assessment = result.data.assessment;
        const isCorrect = assessment.meets_target_level || (assessment.overall_score >= 70);
        
        setAssessmentFeedback({
          isAligned: isCorrect,
          feedback: assessment.next_steps || "Good effort! Keep practicing.",
          score: assessment.overall_score,
          level: assessment.level_achieved
        });
        
        setQuizCorrect(isCorrect);
        setQuizAnswered(true);
        setShowExplanation(true);
        
        setQuizAnswers(prev => [...prev, {
          index: -1, 
          correct: isCorrect,
          attempts: 1
        }]);
      }
    } catch (error) {
       console.error("Assessment failed:", error);
       Alert.alert("Error", "Failed to assess your answer. Please try again.");
    } finally {
      setIsAssessing(false);
    }
  };

  const handleNextQuestion = async () => {
    const questions = currentLesson.quiz_items || currentLesson.quiz_questions || [];
    
    setOpenEndedResponse("");
    setAssessmentFeedback(null);
    setQuizAnswered(false);
    setQuizCorrect(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setGeneratingLesson(true);
      await completeLesson();
      setGeneratingLesson(false);
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

  const speakPhrase = async (rawText: any, language?: string) => {
    // Basic validation
    if (!rawText) return;
    
    const text = String(rawText).trim();
    if (text === "" || text === "--" || text === "undefined" || text === "null") {
      console.log("🤐 Cannot speak empty or invalid text.");
      return;
    }

    // Map common language names to BCP-47 speech codes
    // Handeling various capitalizations just in case
    const langMap: {[key: string]: string} = {
      "spanish": "es-ES",
      "french": "fr-FR",
      "german": "de-DE",
      "italian": "it-IT",
      "portuguese": "pt-BR",
      "japanese": "ja-JP",
      "chinese": "zh-CN",
      "korean": "ko-KR",
      "arabic": "ar-SA",
      "english": "en-US",
      "russian": "ru-RU",
      "hindi": "hi-IN"
    };
    
    try {
      // 1. Stop any current speech and wait a tiny bit (Android fix)
      await Speech.stop();
      if (Platform.OS === 'android') {
         await new Promise(resolve => setTimeout(resolve, 100)); 
      }
      
      // Toggle logic: If playing same text, just stop
      if (isPlaying && spokenTextRef.current === text) {
        setIsPlaying(false);
        spokenTextRef.current = null;
        return;
      }

      setIsPlaying(true);
      spokenTextRef.current = text;
      
      // 2. Resolve Language Code safely
      const targetName = (language || targetLanguage || "English").toLowerCase().trim();
      // Try to find code in map. If not found, check if the input ITSELF is a code (like 'es', 'ja')
      const speechLang = langMap[targetName] || (targetName.includes("-") ? targetName : "en-US");

      console.log(`🗣️ Speaking (${speechLang}): "${text.substring(0, 20)}..."`);
      
      await Speech.speak(text, { 
        language: speechLang, 
        rate: 0.8,
        pitch: 1.0,
        onDone: () => {
          setIsPlaying(false);
          spokenTextRef.current = null;
        },
        onStopped: () => {
          setIsPlaying(false);
          spokenTextRef.current = null;
        },
        onError: (e) => {
          console.error("Speech Error:", e);
          setIsPlaying(false);
          spokenTextRef.current = null;
        }
      });
      
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error playing phrase:", error);
      setIsPlaying(false);
      spokenTextRef.current = null;
    }
  };

  const stopSpeech = async () => {
    try {
      await Speech.stop();
      setIsPlaying(false);
      spokenTextRef.current = null;
    } catch (error) {
      console.error("Error stopping speech:", error);
    }
  };

  const closeLessonModal = async () => {
    // Stop any playing audio when closing
    try {
      await Speech.stop();
    } catch (e) {}
    setIsPlaying(false);
    
    // Reset quiz states for next time
    setQuestionAnswers({});
    setHasSubmitted(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setOpenEndedResponse("");
    
    // Actually close the modal
    setLessonModalVisible(false);
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mainTitle, { color: colors.text, marginBottom: 4 }]}>
                Learning Hub
              </Text>
              <Text style={[styles.subtitle, { color: colors.icon, marginBottom: 0 }]}>
                 Level: {cefrLevel} • {targetLanguage}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleClearCache}
              style={{ padding: 8, backgroundColor: colors.cardBackground, borderRadius: 20, ...Shadows.sm }}
            >
              <Ionicons name="refresh" size={20} color={colors.tint} />
            </TouchableOpacity>
          </View>

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
                        {`Next review: ${new Date(phrase.nextReview).toLocaleDateString()}`}
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

              {/* Sub-Tab Selector */}
              <View style={{ flexDirection: 'row', gap: 0, marginBottom: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.icon + "30" }}>
                {['lessons', 'vocabulary', 'practice'].map((tab) => (
                  <TouchableOpacity 
                    key={tab} 
                    onPress={() => setActiveTab(tab)}
                    style={{ 
                      flex: 1, 
                      paddingVertical: 12, 
                      backgroundColor: activeTab === tab ? colors.tint : colors.background,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ 
                      color: activeTab === tab ? '#fff' : colors.text, 
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* LESSONS SUB-TAB */}
              {activeTab === 'lessons' && (
                <>
                  <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
                    Grammar Lessons
                  </Text>
                  {GRAMMAR_LESSONS.map((lesson) => {
                     const isLocked = (CEFR_ORDER[cefrLevel] || 1) < (CEFR_ORDER[lesson.level] || 1);
                     return (
                       <TouchableOpacity
                         key={lesson.id}
                         style={[styles.lessonCard, { backgroundColor: colors.background, borderColor: colors.icon + "30", opacity: isLocked ? 0.6 : 1 }]}
                         onPress={() => isLocked ? Alert.alert("Locked", `Reach Level ${lesson.level} to unlock!`) : handleGenerateLesson(lesson.title, "Grammar Lesson")}
                       >
                         <View style={[styles.lessonIcon, { backgroundColor: isLocked ? "#9ca3af20" : lesson.color + "20" }]}>
                           <Ionicons name={isLocked ? "lock-closed" : lesson.icon as any} size={24} color={isLocked ? colors.icon : lesson.color} />
                         </View>
                         <View style={styles.lessonInfo}>
                           <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
                           <Text style={[styles.lessonDesc, { color: colors.icon }]}>{lesson.description}</Text>
                           <View style={styles.lessonMeta}>
                              <View style={[styles.levelBadge, { backgroundColor: isLocked ? "#9ca3af20" : lesson.color + "20" }]}>
                                <Text style={[styles.levelText, { color: isLocked ? colors.icon : lesson.color }]}>{lesson.level}</Text>
                              </View>
                              <View style={styles.durationBadge}>
                                <Ionicons name="time-outline" size={12} color={colors.icon} />
                                <Text style={[styles.durationText, { color: colors.icon }]}>{lesson.duration}</Text>
                              </View>
                           </View>
                         </View>
                         <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                       </TouchableOpacity>
                     );
                  })}
                </>
              )}

              {/* VOCABULARY SUB-TAB */}
              {activeTab === 'vocabulary' && (
                <>
                  <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
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
                        <Text style={[styles.vocabTitle, { color: colors.text }]}>{set.title}</Text>
                        <Text style={[styles.vocabCount, { color: colors.icon }]}>{set.words} words</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* PRACTICE SUB-TAB (Listening, Reading, Mixed Quiz) */}
              {activeTab === 'practice' && (
                <View style={{ gap: 16 }}>
                  <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
                    Daily Practice Hub
                  </Text>

                  {/* LISTENING TASK */}
                  <TouchableOpacity
                    style={{ backgroundColor: "#0ea5e9" + "15", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#0ea5e9" + "40", flexDirection: 'row', alignItems: 'center', gap: 16 }}
                    onPress={() => handleGenerateLesson("Listening Practice", "listening")}
                  >
                    <View style={{ backgroundColor: "#0ea5e9", padding: 12, borderRadius: 12 }}>
                      <Ionicons name="headset" size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>🎧 Listening Task</Text>
                      <Text style={{ fontSize: 13, color: colors.icon }}>Audio scenario + 5 questions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#0ea5e9" />
                  </TouchableOpacity>

                  {/* READING TASK */}
                  <TouchableOpacity
                    style={{ backgroundColor: "#22c55e" + "15", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#22c55e" + "40", flexDirection: 'row', alignItems: 'center', gap: 16 }}
                    onPress={() => handleGenerateLesson("Reading Practice", "reading")}
                  >
                    <View style={{ backgroundColor: "#22c55e", padding: 12, borderRadius: 12 }}>
                      <Ionicons name="reader" size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>📖 Reading Task</Text>
                      <Text style={{ fontSize: 13, color: colors.icon }}>Text passage + 5 questions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#22c55e" />
                  </TouchableOpacity>

                  {/* MIXED QUIZ */}
                  <TouchableOpacity
                    style={{ backgroundColor: "#a855f7" + "15", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#a855f7" + "40", flexDirection: 'row', alignItems: 'center', gap: 16 }}
                    onPress={() => handleGenerateLesson("Mixed Practice", "drill")}
                  >
                    <View style={{ backgroundColor: "#a855f7", padding: 12, borderRadius: 12 }}>
                      <Ionicons name="shuffle" size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>🧠 Mixed Quiz</Text>
                      <Text style={{ fontSize: 13, color: colors.icon }}>Standard & Inference Questions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#a855f7" />
                  </TouchableOpacity>

                  {/* CLOZE PRACTICE */}
                  <TouchableOpacity
                    style={{ backgroundColor: "#ec4899" + "15", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#ec4899" + "40", flexDirection: 'row', alignItems: 'center', gap: 16 }}
                    onPress={() => handleGenerateLesson("Cloze Practice", "cloze")}
                  >
                    <View style={{ backgroundColor: "#ec4899", padding: 12, borderRadius: 12 }}>
                      <Ionicons name="create" size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>✍️ Cloze Practice</Text>
                      <Text style={{ fontSize: 13, color: colors.icon }}>Fill-in-the-blank exercises</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#ec4899" />
                  </TouchableOpacity>

                  {/* INFERENCE PRACTICE */}
                  <TouchableOpacity
                    style={{ backgroundColor: "#8b5cf6" + "15", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#8b5cf6" + "40", flexDirection: 'row', alignItems: 'center', gap: 16 }}
                    onPress={() => handleGenerateLesson("Inference Practice", "inference")}
                  >
                    <View style={{ backgroundColor: "#8b5cf6", padding: 12, borderRadius: 12 }}>
                      <Ionicons name="bulb" size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>💡 Inference Task</Text>
                      <Text style={{ fontSize: 13, color: colors.icon }}>Deduce meaning from context</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#8b5cf6" />
                  </TouchableOpacity>

                  {/* SIMPLE SENTENCE */}
                  <TouchableOpacity
                    style={{ backgroundColor: "#f59e0b" + "15", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#f59e0b" + "40", flexDirection: 'row', alignItems: 'center', gap: 16 }}
                    onPress={() => handleGenerateLesson("Quick Practice", "simple_sentence")}
                  >
                    <View style={{ backgroundColor: "#f59e0b", padding: 12, borderRadius: 12 }}>
                      <Ionicons name="flash" size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>⚡ Simple Sentence</Text>
                      <Text style={{ fontSize: 13, color: colors.icon }}>Quick 1-question practice</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#f59e0b" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 40 }} />
            </View>
          )}
        </View>
        {/* Lesson Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lessonModalVisible}
        onRequestClose={() => closeLessonModal()}
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
                  onPress={() => closeLessonModal()}
                >
                  <Text style={styles.completeLessonText}>Continue Learning</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : currentLesson ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.icon + "30" }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{lessonDisplayTitle}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity 
                      onPress={async () => {
                        const confirmReload = Platform.OS === 'web' 
                          ? window.confirm("Reload this lesson? This will clear the cache for this specific topic and fetch a fresh one.") 
                          : true; 
                        
                        if (confirmReload) {
                          await clearAllLessonCaches(); 
                          closeLessonModal();
                          setTimeout(() => {
                            handleGenerateLesson(currentTopic, "Lesson", isLevelUpQuiz);
                          }, 500);
                        }
                      }}
                      style={{ padding: 8 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="refresh" size={24} color={colors.tint} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => closeLessonModal()}
                      style={{ padding: 8 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={32} color={colors.icon} />
                    </TouchableOpacity>
                  </View>
                </View>

                {currentLesson.type === 'composite_lesson' ? (
                  <View style={{ gap: 24, paddingBottom: 40 }}>
                    {/* 1. VOCABULARY SECTION - ONLY for composite or vocabulary types */}
                    {(currentLesson.type === 'composite_lesson' || currentLesson.type === 'vocabulary') && currentLesson.vocabulary && (
                      <View>
                         <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom: 12 }}>
                           <Ionicons name="book" size={20} color={colors.tint} />
                           <Text style={[styles.sectionSubtitle, {color: colors.text, marginBottom: 0}]}>Key Vocabulary</Text>
                         </View>
                         
                         <View style={{ gap: 12 }}>
                           {currentLesson.vocabulary.map((item: any, idx: number) => (
                             <View key={idx} style={[styles.vocabCard, { width: '100%', flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 0 }]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{fontSize: 18, fontWeight:'bold', color: colors.text, marginBottom: 2}}>{item.word}</Text>
                                  <Text style={{color: colors.icon, fontSize: 14}}>{item.translation}</Text>
                                </View>
                                <View style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.icon + "20" }}>
                                  <Text style={{color: colors.tint, fontStyle:'italic', fontSize:13}}>"{item.example}"</Text>
                                </View>
                             </View>
                           ))}
                         </View>
                      </View>
                    )}

                    <View style={{ height: 1, backgroundColor: colors.icon + "20" }} />

                    {/* 2. LISTENING SECTION - ONLY for composite or listening types */}
                    {(currentLesson.type === 'composite_lesson' || currentLesson.type === 'listening') && currentLesson.listening_task && (
                       <View>
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom: 12 }}>
                             <Ionicons name="headset" size={20} color={colors.tint} />
                             <Text style={[styles.sectionSubtitle, {color: colors.text, marginBottom: 0}]}>Listening Practice</Text>
                          </View>

                          <View style={{ backgroundColor: colors.tint + "10", padding: 20, borderRadius: 12, alignItems:'center', marginBottom: 20, borderWidth: 1, borderColor: colors.tint + "30" }}>
                              <Text style={{ fontWeight:'bold', color: colors.tint, marginBottom: 12 }}>🎧 Audio Scenario</Text>
                              <TouchableOpacity 
                                 style={{ backgroundColor: isPlaying ? "#ef4444" : colors.tint, padding: 16, borderRadius: 50, elevation: 4, shadowColor: colors.tint, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: {width:0, height:4} }}
                                 onPress={async () => {
                                   if (isPlaying) {
                                     await Speech.stop();
                                     setIsPlaying(false);
                                   } else {
                                     speakPhrase(currentLesson.listening_task.audio_script, targetLanguage);
                                   }
                                 }}
                              >
                                 <Ionicons name={isPlaying ? "stop" : "play"} size={32} color="#fff" />
                              </TouchableOpacity>
                              <Text style={{ marginTop: 8, color: colors.icon, fontSize: 12 }}>Tap to play audio</Text>
                          </View>
                          
                          {currentLesson.listening_task.questions.map((q: any, idx: number) => (
                             <View key={idx} style={[styles.quizCard, {marginBottom: 16, borderWidth: 1, borderColor: colors.icon + "20"}]}>
                                <Text style={[styles.quizQuestion, {color: colors.text, fontWeight: '600'}]}>{idx + 1}. {q.question}</Text>
                                <View style={{ gap: 8 }}>
                                {q.options.map((opt: string, optIdx: number) => (
                                   <TouchableOpacity 
                                     key={optIdx} 
                                     style={[styles.optionButton, { borderColor: colors.icon + "30", backgroundColor: colors.background, marginBottom: 0 }]}
                                     onPress={() => {
                                         if (optIdx === q.correct_index) alert("Correct!"); // Simple feedback for now
                                         else alert("Try again!");
                                     }}
                                   >
                                      <Text style={[styles.optionText, {color: colors.text}]}>{opt}</Text>
                                   </TouchableOpacity>
                                ))}
                                </View>
                             </View>
                          ))}
                       </View>
                    )}

                    <View style={{ height: 1, backgroundColor: colors.icon + "20" }} />

                    {/* 3. READING SECTION - ONLY for composite or reading types */}
                    {(currentLesson.type === 'composite_lesson' || currentLesson.type === 'reading') && currentLesson.reading_task && (
                       <View>
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom: 12 }}>
                             <Ionicons name="reader" size={20} color={colors.tint} />
                             <Text style={[styles.sectionSubtitle, {color: colors.text, marginBottom: 0}]}>Reading Comprehension</Text>
                          </View>

                          <View style={{ backgroundColor: theme === 'dark' ? '#1e293b' : "#f8fafc", borderWidth:1, borderColor: colors.icon+"20", padding: 16, borderRadius: 12, marginBottom: 20 }}>
                             <PronunciationHelper 
                               text={currentLesson.reading_task.scenario_text}
                               cefrLevel={cefrLevel}
                               language={targetLanguage}
                               textColor={colors.text}
                             />
                          </View>

                          {currentLesson.reading_task.questions.map((q: any, idx: number) => (
                             <View key={idx} style={[styles.quizCard, {marginBottom: 16, borderWidth: 1, borderColor: colors.icon + "20"}]}>
                                <Text style={[styles.quizQuestion, {color: colors.text, fontWeight: '600'}]}>{idx + 1}. {q.question}</Text>
                                <View style={{ gap: 8 }}>
                                {q.options.map((opt: string, optIdx: number) => (
                                   <TouchableOpacity 
                                     key={optIdx} 
                                     style={[styles.optionButton, { borderColor: colors.icon + "30", backgroundColor: colors.background, marginBottom: 0 }]}
                                      onPress={() => {
                                         if (optIdx === q.correct_index) alert("Correct!");
                                         else alert("Try again!");
                                     }}
                                   >
                                      <Text style={[styles.optionText, {color: colors.text}]}>{opt}</Text>
                                   </TouchableOpacity>
                                ))}
                                </View>
                             </View>
                          ))}
                       </View>
                    )}

                    <View style={{ height: 1, backgroundColor: colors.icon + "20" }} />

                    {/* 4. PRACTICE QUIZ - ONLY shown for composite lessons */}
                    {currentLesson.type === 'composite_lesson' && currentLesson.practice_quiz && (
                        <View>
                           <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom: 12 }}>
                             <Ionicons name="create" size={20} color={colors.tint} />
                             <Text style={[styles.sectionSubtitle, {color: colors.text, marginBottom: 0}]}>Mixed Practice</Text>
                          </View>

                            {currentLesson.practice_quiz.map((q: any, idx: number) => (
                              <View key={idx} style={[styles.quizCard, {marginBottom: 16, borderWidth: 1, borderColor: colors.icon + "20"}]}>
                                 <View style={{flexDirection:'row', marginBottom:8}}>
                                   <Text style={{backgroundColor: colors.tint+"15", color: colors.tint, paddingHorizontal:8, paddingVertical: 2, borderRadius:4, fontSize:12, fontWeight:'bold', overflow:'hidden'}}>
                                     {q.type.toUpperCase() === 'OPEN_ENDED' || q.type.toUpperCase() === 'OPEN-ENDED' ? '✍️ FREE RESPONSE' : q.type.toUpperCase()}
                                   </Text>
                                 </View>
                                 <Text style={[styles.quizQuestion, {color: colors.text, fontWeight: '600'}]}>{idx + 1}. {q.question}</Text>
                                 
                                 <View style={{ gap: 8 }}>
                                 {q.options && q.options.length > 0 ? (
                                   q.options.map((opt: string, optIdx: number) => (
                                     <TouchableOpacity 
                                       key={optIdx} 
                                       style={[styles.optionButton, { borderColor: colors.icon + "30", backgroundColor: colors.background, marginBottom: 0 }]}
                                       onPress={() => {
                                          if (optIdx === q.correct_index) alert("Correct!");
                                          else alert("Try again!");
                                       }}
                                     >
                                        <Text style={[styles.optionText, {color: colors.text}]}>{opt}</Text>
                                     </TouchableOpacity>
                                   ))
                                 ) : (
                                   <View style={{ gap: 10 }}>
                                      <TextInput
                                        style={{ 
                                          borderWidth: 1, 
                                          borderColor: colors.icon + "40", 
                                          borderRadius: 8, 
                                          padding: 12, 
                                          color: colors.text,
                                          backgroundColor: colors.background,
                                          height: 80,
                                          textAlignVertical: 'top'
                                        }}
                                        placeholder="Type your answer in the target language..."
                                        placeholderTextColor={colors.icon}
                                        multiline
                                        value={openEndedResponse}
                                        onChangeText={setOpenEndedResponse}
                                      />
                                      <TouchableOpacity 
                                        style={{ backgroundColor: colors.tint, padding: 12, borderRadius: 8, alignItems: 'center' }}
                                        onPress={() => alert("Verification logic coming soon! For now, compare with the example provided below.")}
                                      >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit Answer</Text>
                                      </TouchableOpacity>
                                      {q.correct_example && (
                                        <Text style={{ fontSize: 13, color: colors.tint, marginTop: 4, fontStyle: 'italic', fontWeight:'500' }}>
                                          Check against: {q.correct_example}
                                        </Text>
                                      )}
                                   </View>
                                 )}
                                 </View>
                              </View>
                           ))}
                        </View>
                    )}
                  </View>
                ) : (currentLesson.type === 'listening' || currentLesson.type === 'reading' || currentLesson.type === 'drill' || currentLesson.type === 'cloze' || currentLesson.type === 'inference' || currentLesson.type === 'level_up_quiz') ? (
                  // UNIFIED GROUPED VIEW
                  <View style={{ paddingBottom: 40 }}>
                    {(() => {
                      const allQuestions = currentLesson.quiz_items || currentLesson.quiz_questions || [];
                      if (allQuestions.length === 0) return null;

                      // Grouping Logic: Group questions by passage. Independent questions (no passage) go into one group.
                      const groups: any[] = [];
                      allQuestions.forEach((q: any) => {
                        const passage = (q.audio_script || q.scenario_text || "").trim();
                        const lastGroup = groups[groups.length - 1];
                        
                        // New group if: 
                        // 1. First group
                        // 2. This question has a passage AND it's different from the last group's passage
                        // 3. This question has NO passage BUT the last group DID have a passage
                        if (!lastGroup || (passage !== "" && lastGroup.passage !== passage) || (passage === "" && lastGroup.passage !== "")) {
                          groups.push({
                            passage,
                            questions: [q],
                            startIndex: allQuestions.indexOf(q)
                          });
                        } else {
                          lastGroup.questions.push(q);
                        }
                      });

                      const currentGroup = groups[currentGroupIndex];
                      if (!currentGroup) return null;

                      const questions = currentGroup.questions;
                      const isListening = currentGroup.passage && currentGroup.questions[0].audio_script;
                      const isReading = currentGroup.passage && currentGroup.questions[0].scenario_text;
                      
                      const groupAnswers = questions.map((_: any, idx: number) => {
                        const globalIdx = currentGroup.startIndex + idx;
                        return questionAnswers[globalIdx] || { selected: null, correct: null };
                      });

                      const allSelectedInGroup = groupAnswers.every((a: any) => a.selected !== null);
                      const allCorrectInGroup = groupAnswers.every((a: any) => a.correct === true);
                      
                      const handleSubmitGroup = async () => {
                        if (isListening) {
                           await Speech.stop();
                           setIsPlaying(false);
                        }

                        const newAnswers = { ...questionAnswers };
                        questions.forEach((q: any, idx: number) => {
                          const globalIdx = currentGroup.startIndex + idx;
                          const selected = questionAnswers[globalIdx]?.selected;
                          if (selected !== null && selected !== undefined) {
                            const isCorrect = selected === q.correct_index;
                            const prevWasWrong = questionAnswers[globalIdx]?.wasWrongBefore;
                            
                            newAnswers[globalIdx] = {
                              selected,
                              correct: isCorrect,
                              wasWrongBefore: prevWasWrong || !isCorrect
                            };
                          }
                        });
                        setQuestionAnswers(newAnswers);
                        setHasSubmitted(true);
                      };

                      const handleNextGroup = () => {
                        if (currentGroupIndex < groups.length - 1) {
                          setCurrentGroupIndex(currentGroupIndex + 1);
                          setHasSubmitted(false);
                          // Stop audio if any
                          Speech.stop().catch(() => {});
                          setIsPlaying(false);
                        } else {
                          completeLesson();
                        }
                      };

                      return (
                        <View>
                          {/* Progress Indicator */}
                          <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: colors.tint, fontWeight: 'bold' }}>
                              Question Group {currentGroupIndex + 1} of {groups.length}
                            </Text>
                            <Text style={{ color: colors.icon }}>
                              {currentLesson.type.charAt(0).toUpperCase() + currentLesson.type.slice(1)} Task
                            </Text>
                          </View>

                          {/* Passage Section */}
                          {isListening && (
                            <View style={{ backgroundColor: colors.tint + "10", padding: 24, borderRadius: 16, alignItems:'center', marginBottom: 24, borderWidth: 1, borderColor: colors.tint + "30" }}>
                               <Text style={{ fontWeight:'bold', color: colors.tint, marginBottom: 12, fontSize: 18 }}>🎧 Listening Exercise</Text>
                               <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                 <TouchableOpacity 
                                    style={{ backgroundColor: isPlaying ? "#ef4444" : colors.tint, padding: 20, borderRadius: 50, shadowColor: colors.tint, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                                    onPress={async () => {
                                      if (isPlaying) {
                                        await Speech.stop();
                                        setIsPlaying(false);
                                      } else {
                                        speakPhrase(currentGroup.passage, targetLanguage);
                                      }
                                    }}
                                 >
                                    <Ionicons name={isPlaying ? "stop" : "play"} size={36} color="#fff" />
                                 </TouchableOpacity>
                               </View>
                            </View>
                          )}

                          {isReading && (
                            <View style={{ backgroundColor: theme === 'dark' ? '#1e293b' : "#f8fafc", borderWidth:1, borderColor: colors.icon+"20", padding: 20, borderRadius: 16, marginBottom: 24 }}>
                               <Text style={{ fontWeight:'bold', color: colors.text, marginBottom: 12, fontSize: 18 }}>📖 Reading Passage</Text>
                               <PronunciationHelper 
                                 text={currentGroup.passage}
                                 cefrLevel={cefrLevel}
                                 language={targetLanguage}
                                 textColor={colors.text}
                                />
                            </View>
                          )}

                          {/* Questions */}
                          {questions.map((q: any, qIdx: number) => {
                            const globalIdx = currentGroup.startIndex + qIdx;
                            const answer = questionAnswers[globalIdx] || { selected: null, correct: null };
                            const isCorrect = answer.correct === true;
                            const isWrong = hasSubmitted && answer.correct === false;
                            
                            return (
                              <View key={globalIdx} style={[styles.quizCard, {marginBottom: 16, borderWidth: 2, borderColor: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : colors.icon + "20", opacity: isCorrect ? 0.7 : 1}]}>
                                <Text style={[styles.quizQuestion, {color: colors.text, fontWeight: '600', marginBottom: 16}]}>
                                  {q.question}
                                </Text>
                                
                                <View style={{ gap: 8 }}>
                                  {(q.options || []).map((opt: string, optIdx: number) => {
                                    const isThisSelected = answer.selected === optIdx;
                                    const isCorrectOption = optIdx === q.correct_index;
                                    
                                    let optionStyle: any[] = [
                                      styles.optionButton, 
                                      { 
                                        borderColor: isThisSelected && !hasSubmitted ? colors.tint : colors.icon + "30", 
                                        backgroundColor: isThisSelected && !hasSubmitted ? colors.tint + "15" : colors.background,
                                        borderWidth: 2
                                      }
                                    ];
                                    
                                    if (hasSubmitted && isCorrectOption) {
                                      optionStyle.push({ backgroundColor: "#22c55e15", borderColor: "#22c55e", borderWidth: 2 });
                                    } else if (hasSubmitted && isThisSelected && !isCorrect) {
                                      optionStyle.push({ backgroundColor: "#ef444415", borderColor: "#ef4444", borderWidth: 2 });
                                    }
                                    
                                    return (
                                      <TouchableOpacity 
                                        key={optIdx} 
                                        style={optionStyle}
                                        onPress={() => {
                                          if (isCorrect) return;
                                          setQuestionAnswers(prev => ({
                                            ...prev,
                                            [globalIdx]: { selected: optIdx, correct: null }
                                          }));
                                          if (hasSubmitted) setHasSubmitted(false);
                                        }}
                                        disabled={isCorrect}
                                      >
                                        <Text style={[styles.optionText, {color: colors.text}]}>{opt}</Text>
                                        {hasSubmitted && isCorrectOption && <Ionicons name="checkmark-circle" size={24} color="#22c55e" style={{ marginLeft: 8 }} />}
                                        {hasSubmitted && isThisSelected && !isCorrect && <Ionicons name="close-circle" size={24} color="#ef4444" style={{ marginLeft: 8 }} />}
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </View>
                            );
                          })}

                          {/* Submit / Next Buttons */}
                          <View style={{ marginTop: 8 }}>
                            {!hasSubmitted && allSelectedInGroup && (
                              <TouchableOpacity 
                                style={{ backgroundColor: colors.tint, padding: 16, borderRadius: 12, alignItems: 'center' }}
                                onPress={handleSubmitGroup}
                              >
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Check Answers</Text>
                              </TouchableOpacity>
                            )}
                            
                            {hasSubmitted && !allCorrectInGroup && (
                              <Text style={{ color: "#ef4444", textAlign: 'center', marginBottom: 12, fontWeight: 'bold' }}>
                                Some answers are incorrect. Please fix them before proceeding.
                              </Text>
                            )}

                            {hasSubmitted && allCorrectInGroup && (
                              <TouchableOpacity 
                                style={{ backgroundColor: "#22c55e", padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                onPress={handleNextGroup}
                              >
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                  {currentGroupIndex < groups.length - 1 ? "Next Section" : "Finish Lesson"}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                ) : currentLesson.type === 'simple_sentence' ? (
                  // SIMPLE SENTENCE VIEW
                  <View style={{ paddingBottom: 40 }}>
                    {/* Display the sentence prominently */}
                    <View style={{ backgroundColor: "#fef3c7", borderWidth:1, borderColor: "#f59e0b40", padding: 20, borderRadius: 16, marginBottom: 24 }}>
                       <Text style={{ fontWeight:'bold', color: "#f59e0b", marginBottom: 12, fontSize: 18 }}>⚡ Quick Practice</Text>
                       <Text style={{ fontSize: 18, lineHeight: 28, color: colors.text, fontWeight: '500' }}>
                         {currentLesson.sentence}
                       </Text>
                    </View>
                    
                    {/* ONE QUESTION AT A TIME (should only be 1 for simple_sentence) */}
                    {(() => {
                      const questions = currentLesson.quiz_items || currentLesson.quiz_questions || [];
                      if (questions.length === 0) return null;
                      
                      const currentQuestion = questions[currentQuestionIndex];
                      if (!currentQuestion) return null;
                      
                      const isAnswered = selectedAnswer !== null;
                      const isCorrect = isAnswered && selectedAnswer === currentQuestion.correct_index;
                      
                      return (
                        <View>
                          <View style={[styles.quizCard, {marginBottom: 16, borderWidth: 1, borderColor: colors.icon + "20"}]}>
                            <Text style={[styles.quizQuestion, {color: colors.text, fontWeight: '600', marginBottom: 16}]}>
                              {currentQuestion.question}
                            </Text>
                            
                            <View style={{ gap: 8 }}>
                              {(currentQuestion.options || []).map((opt: string, optIdx: number) => {
                                const isSelected = selectedAnswer === optIdx;
                                const isCorrectOption = optIdx === currentQuestion.correct_index;
                                
                                let optionStyle = [
                                  styles.optionButton, 
                                  { 
                                    borderColor: colors.icon + "30", 
                                    backgroundColor: colors.background,
                                    borderWidth: 2
                                  }
                                ];
                                
                                if (isAnswered && isCorrectOption) {
                                  optionStyle.push({ 
                                    backgroundColor: "#22c55e15", 
                                    borderColor: "#22c55e",
                                    borderWidth: 2
                                  });
                                } else if (isAnswered && isSelected && !isCorrect) {
                                  optionStyle.push({ 
                                    backgroundColor: "#ef444415", 
                                    borderColor: "#ef4444",
                                    borderWidth: 2
                                  });
                                }
                                
                                return (
                                  <TouchableOpacity 
                                    key={optIdx} 
                                    style={optionStyle}
                                    onPress={() => !isAnswered && handleQuizAnswer(optIdx)}
                                    disabled={isAnswered}
                                  >
                                    <Text style={[styles.optionText, {color: colors.text}]}>{opt}</Text>
                                    {isAnswered && isCorrectOption && (
                                      <Ionicons name="checkmark-circle" size={24} color="#22c55e" style={{ marginLeft: 8 }} />
                                    )}
                                    {isAnswered && isSelected && !isCorrect && (
                                      <Ionicons name="close-circle" size={24} color="#ef4444" style={{ marginLeft: 8 }} />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            
                            {/* Inline Feedback */}
                            {showExplanation && (
                              <View style={{ marginTop: 20 }}>
                                {isCorrect ? (
                                  <View style={{ backgroundColor: "#22c55e15", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#22c55e40" }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                      <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
                                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: "#22c55e", marginLeft: 12 }}>
                                        Correct! Well done!
                                      </Text>
                                    </View>
                                  </View>
                                ) : (
                                  <View style={{ backgroundColor: "#ef444415", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#ef444440" }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                      <Ionicons name="close-circle" size={32} color="#ef4444" />
                                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: "#ef4444", marginLeft: 12 }}>
                                        Not quite. Try again!
                                      </Text>
                                    </View>
                                  </View>
                                )}
                                
                                {/* Action Buttons */}
                                <View style={{ marginTop: 16, gap: 12 }}>
                                  {!isCorrect && (
                                    <TouchableOpacity 
                                      style={{ backgroundColor: colors.icon + "20", padding: 14, borderRadius: 12, alignItems: 'center' }}
                                      onPress={handleRetry}
                                    >
                                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
                                    </TouchableOpacity>
                                  )}
                                  {isCorrect && (
                                    <TouchableOpacity 
                                      style={{ backgroundColor: colors.tint, padding: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                      onPress={handleNextQuestion}
                                    >
                                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                        Complete Lesson
                                      </Text>
                                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                ) : (currentLesson.type === 'drill' || currentLesson.type === 'cloze' || currentLesson.type === 'inference') ? (
                  // DRILL / MIXED / CLOZE / INFERENCE VIEW - Unified grouped view (re-uses logic from above if needed, but since it's the same structure, we can just use the unified view)
                  <View style={{ paddingBottom: 40 }}>
                     {/* The unified view above already handles these types, but we keep this block as a fallback or if types differ */}
                     {/* For brevity, I'll point to the same UI structure as above or just let the first condition catch them */}
                     <Text style={{ color: colors.text }}>Redirecting to unified view...</Text>
                  </View>
                ) : (
                  // LEGACY VIEW (for grammar lessons, vocab, etc.)
                  <>
                  <Text style={[styles.lessonIntro, { color: colors.text }]}>
                    {currentLesson.introduction}
                  </Text>
                  {currentLesson.introduction_reading && (
                    <Text style={{ fontStyle: 'italic', color: colors.icon, marginBottom: 16 }}>
                      ({currentLesson.introduction_reading})
                    </Text>
                  )}
                  </>
                )}

                {/* Legacy / Supplementary Sections - ONLY show if NOT a unified layout to prevent duplicates */}
                {!(
                  currentLesson.type === 'composite_lesson' ||
                  currentLesson.type === 'listening' ||
                  currentLesson.type === 'reading' ||
                  currentLesson.type === 'drill' ||
                  currentLesson.type === 'cloze' ||
                  currentLesson.type === 'inference' ||
                  currentLesson.type === 'simple_sentence'
                ) && (
                  <View style={{ marginTop: 24 }}>
                    {currentLesson.key_points && currentLesson.key_points.length > 0 && (
                      <View style={[styles.keyPointsCard, { backgroundColor: colors.tint + "15" }]}>
                        <Text style={[styles.cardHeader, { color: colors.tint }]}>Key Points</Text>
                        {currentLesson.key_points.map((point: any, idx: number) => (
                          <View key={idx} style={styles.pointRow}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.tint} />
                            <View style={styles.pointText}>
                              <Text style={[styles.bilingualTarget, { color: colors.text }]}>
                                {typeof point === 'string' ? point : point.target}
                              </Text>
                              {typeof point === 'object' && point.reading && (
                                <Text style={{ color: "#a855f7", fontSize: 13, marginBottom: 2 }}>
                                  {point.reading}
                                </Text>
                              )}
                              {typeof point === 'object' && point.english && (
                                <Text style={[styles.bilingualEnglish, { color: colors.icon }]}>
                                  {point.english}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Example Card */}
                    {currentLesson.example && currentLesson.example.text && currentLesson.example.text !== "--" && (
                      <View style={[styles.exampleCard, { borderColor: colors.icon + "30", marginTop: 20 }]}>
                        <Text style={[styles.cardHeader, { color: colors.text }]}>Example</Text>
                        <Text style={[styles.exampleText, { color: colors.text }]}>
                          "{currentLesson.example.text}"
                        </Text>
                        {currentLesson.example.reading && (
                          <Text style={{ color: "#a855f7", marginBottom: 4, fontStyle: 'italic' }}>
                            {currentLesson.example.reading}
                          </Text>
                        )}
                        <Text style={[styles.exampleTranslation, { color: colors.icon }]}>
                          {currentLesson.example.translation}
                        </Text>
                        <TouchableOpacity 
                          style={[styles.audioBtn, { backgroundColor: colors.tint + "20" }]}
                          onPress={() => speakPhrase(currentLesson.example.text, targetLanguage)}
                        >
                          <Ionicons name="volume-high" size={20} color={colors.tint} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Content Block: Reading OR Listening */}
                    {(currentLesson.reading_passage || currentLesson.scenario_text || currentLesson.audio_script) && (
                      <View style={{ 
                        padding: 16, 
                        marginTop: 20,
                        marginBottom: 20, 
                        backgroundColor: colors.background, 
                        borderRadius: 12, 
                        borderWidth: 1, 
                        borderColor: colors.icon + "30" 
                      }}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 8, color: colors.text }}>
                          {currentLesson.audio_script ? "🎧 Listening Exercise" : currentLesson.type === 'drill' ? "⚡ Language Drills" : "📖 Reading Passage"}
                        </Text>

                        {/* Listening UI */}
                        {currentLesson.audio_script && (
                          <View style={{ alignItems: 'center', marginVertical: 10 }}>
                              <TouchableOpacity 
                                style={{ 
                                    backgroundColor: colors.tint + "20", 
                                    width: 60, height: 60, 
                                    borderRadius: 30, 
                                    justifyContent: 'center', alignItems: 'center' 
                                }}
                                onPress={() => speakPhrase(currentLesson.audio_script, targetLanguage)}
                              >
                                <Ionicons name="play" size={30} color={colors.tint} />
                              </TouchableOpacity>
                              <Text style={{ marginTop: 8, color: colors.icon, fontSize: 12 }}>
                                Tap to listen
                              </Text>
                          </View>
                        )}

                        {/* Reading Text */}
                        {(currentLesson.reading_passage || currentLesson.scenario_text) && !currentLesson.audio_script && (
                          <>
                            <PronunciationHelper 
                              text={currentLesson.scenario_text || (typeof currentLesson.reading_passage === 'string' ? currentLesson.reading_passage : currentLesson.reading_passage?.text)}
                              cefrLevel={cefrLevel}
                              language={targetLanguage}
                              textColor={colors.text}
                            />
                            {typeof currentLesson.reading_passage === 'object' && currentLesson.reading_passage?.reading && (
                              <Text style={{ color: "#a855f7", lineHeight: 22, fontStyle: 'italic', marginTop: 8 }}>
                                {currentLesson.reading_passage.reading}
                              </Text>
                            )}
                            {currentLesson.scenario_text_reading && (
                              <Text style={{ color: "#a855f7", lineHeight: 22, fontStyle: 'italic', marginTop: 8 }}>
                                {currentLesson.scenario_text_reading}
                              </Text>
                            )}
                          </>
                        )}
                      </View>
                )}

                {/* Multi-Question Quiz Section */}
                {(() => {
                  // Support all potential backend keys so we don't break legacy content
                  const questions = currentLesson.quiz_items || currentLesson.quiz_questions || (currentLesson.quiz_question ? [currentLesson.quiz_question] : []);
                  if (questions.length === 0) return null;
                  
                  const currentQuestion = questions[currentQuestionIndex];
                  if (!currentQuestion) return null;
                  
                  const currentAnswer = quizAnswers[currentQuestionIndex];
                  const isAnswered = selectedAnswer !== null;
                  // Check if answered correctly by comparing selected answer with correct index
                  const isCorrect = isAnswered && selectedAnswer === currentQuestion.correct_index;

                  // Map backend types to human strings
                  const getTypeLabel = (type: string) => {
                    switch(type) {
                      case 'cloze': return '✍️ Fill in the Blank';
                      case 'inference': return '🧠 Contextual Inference';
                      case 'listening': return '🎧 Listening Skill';
                      case 'comprehension': return '📖 Reading Skill';
                      case 'grammar': return '⚙️ Grammar Check';
                      case 'vocabulary': return '🏷️ Vocab Drill';
                      default: return '🎯 Practice Question';
                    }
                  };
                  
                  return (
                    <View style={styles.quizCard}>
                      {/* Progress Indicator & Type Badge */}
                      <View style={styles.quizProgressRow}>
                        <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                           <Text style={[styles.quizTitle, { 
                             color: colors.tint, 
                             fontSize: 14, 
                             backgroundColor: colors.tint + "15",
                             paddingHorizontal: 8,
                             paddingVertical: 4,
                             borderRadius: 6,
                             overflow: 'hidden'
                           }]}>
                             {getTypeLabel(currentQuestion.type)}
                           </Text>
                        </View>
                        <Text style={[styles.quizProgress, { color: colors.icon }]}>
                          {currentQuestionIndex + 1}/{questions.length}
                        </Text>
                      </View>
                      
                      {/* Question */}
                      <PronunciationHelper 
                        text={currentQuestion.question}
                        cefrLevel={cefrLevel}
                        language={targetLanguage}
                        textColor={colors.text}
                      />
                      
                      {/* Reading Guide for Question */}
                      {currentQuestion.question_reading && (
                         <Text style={{ 
                             color: colors.tint, 
                             fontSize: 14, 
                             marginBottom: 12, 
                             fontStyle: 'italic',
                             opacity: 0.9 
                         }}>
                           {currentQuestion.question_reading}
                         </Text>
                      )}

                      {/* Question English (Only for A1/A2) */}
                      {currentQuestion.question_english && (cefrLevel === "A1" || cefrLevel === "A2") && (
                        <Text style={[styles.quizQuestionEnglish, { color: colors.icon }]}>
                          {currentQuestion.question_english}
                        </Text>
                      )}

                      {/* Helping Phrase / Hint (New for A1/A2 support) */}
                      {currentQuestion.hint && (
                        <View style={{ 
                          backgroundColor: colors.tint + "10", 
                          padding: 10, 
                          borderRadius: 8, 
                          marginTop: 8,
                          marginBottom: 12,
                          borderLeftWidth: 3,
                          borderLeftColor: colors.tint
                        }}>
                          <Text style={{ fontSize: 13, color: colors.text, fontStyle: 'italic' }}>
                            💡 Hint: {currentQuestion.hint}
                          </Text>
                        </View>
                      )}
                      
                      {/* Options OR Open-Ended Input */}
                      {currentQuestion.type === 'open_ended' ? (
                        <View style={{ marginTop: 10 }}>
                          <TextInput
                            style={{
                              borderWidth: 1,
                              borderColor: colors.icon + "30",
                              borderRadius: 12,
                              padding: 12,
                              minHeight: 100,
                              textAlignVertical: 'top',
                              color: colors.text,
                              backgroundColor: colors.background,
                              fontSize: 16
                            }}
                            placeholder="Type your answer in the target language..."
                            placeholderTextColor={colors.icon}
                            multiline
                            value={openEndedResponse}
                            onChangeText={setOpenEndedResponse}
                            editable={!quizAnswered}
                          />
                          {!quizAnswered && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: colors.tint,
                                padding: 14,
                                borderRadius: 12,
                                marginTop: 12,
                                alignItems: 'center'
                              }}
                              onPress={handleOpenEndedSubmit}
                              disabled={isAssessing}
                            >
                              {isAssessing ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit Answer</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <View style={styles.optionsContainer}>
                          {currentQuestion?.options && currentQuestion.options.map((opt: any, idx: number) => (
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
                      )}
                      
                      {/* Result and Explanation (Uniform Style) */}
                      {(showExplanation || assessmentFeedback) && (
                        <View style={{ marginTop: 20 }}>
                          {quizCorrect ? (
                            <View style={{ backgroundColor: "#22c55e15", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#22c55e40" }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: "#22c55e", marginLeft: 12 }}>
                                  Correct! Well done!
                                </Text>
                              </View>
                              {/* Explanation for Correct Answer */}
                              {currentQuestion.options[currentQuestion.correct_index]?.explanation && (
                                <View style={{ marginTop: 10, padding: 10, backgroundColor: "#fff", borderRadius: 8, opacity: 0.9 }}>
                                  <Text style={{ fontWeight: 'bold', color: "#166534", marginBottom: 4 }}>💡 Why:</Text>
                                  <Text style={{ color: "#166534", lineHeight: 20 }}>
                                    {currentQuestion.options[currentQuestion.correct_index].explanation}
                                  </Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            <View style={{ backgroundColor: "#ef444415", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#ef444440" }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name="close-circle" size={32} color="#ef4444" />
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: "#ef4444", marginLeft: 12 }}>
                                  Not quite. Try again!
                                </Text>
                              </View>
                              
                              {/* Explanation for Wrong Answer */}
                              {selectedAnswer !== null && currentQuestion.options[selectedAnswer]?.explanation && (
                                <View style={{ marginTop: 10, padding: 10, backgroundColor: "#fff", borderRadius: 8, opacity: 0.9 }}>
                                  <Text style={{ fontWeight: 'bold', color: "#b91c1c", marginBottom: 4 }}>⚠️ Hint:</Text>
                                  <Text style={{ color: "#991b1b", lineHeight: 20 }}>
                                    {currentQuestion.options[selectedAnswer].explanation}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                          
                          {/* Assessment Feedback */}
                          {assessmentFeedback && (
                             <View style={[styles.explanationCard, { 
                               backgroundColor: assessmentFeedback.isAligned ? "#f0fdf4" : "#fef2f2",
                               borderColor: assessmentFeedback.isAligned ? "#bcf0da" : "#fecaca",
                               borderWidth: 1,
                               marginTop: 12
                             }]}>
                                <Text style={{ fontWeight: 'bold', marginBottom: 4, color: assessmentFeedback.isAligned ? "#166534" : "#b91c1c" }}>
                                  {assessmentFeedback.isAligned ? "✅ Assessment Result" : "⚠️ Needs Improvement"}
                                </Text>
                                <Text style={{ fontSize: 13, color: assessmentFeedback.isAligned ? "#166534" : "#991b1b" }}>
                                  {assessmentFeedback.feedback}
                                </Text>
                             </View>
                          )}
                          
                          {/* Action Buttons */}
                          <View style={{ marginTop: 16, gap: 12 }}>
                            {!quizCorrect && (
                              <TouchableOpacity 
                                style={{ backgroundColor: colors.icon + "20", padding: 14, borderRadius: 12, alignItems: 'center' }}
                                onPress={handleRetry}
                              >
                                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
                              </TouchableOpacity>
                            )}
                            {quizCorrect && (
                              <TouchableOpacity 
                                style={{ backgroundColor: colors.tint, padding: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                onPress={handleNextQuestion}
                              >
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                  {currentQuestionIndex < questions.length - 1 ? "Next Question →" : "Complete Lesson (+XP)"}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })()}
                </View>
                )}
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
  quizCard: { padding: 15, borderRadius: 12 },
  quizTitle: { fontSize: 16, fontWeight: "bold" },
  quizProgressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  quizProgress: { fontSize: 14, fontWeight: "600" },
  quizQuestion: { fontSize: 15, marginBottom: 15 },
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
  bilingualTarget: { fontSize: 16, marginBottom: 2 },
  bilingualEnglish: { fontSize: 14, fontStyle: "italic" },
  // Explanation styles
  explanationSection: { marginTop: 15 },
  explanationCard: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  explanationTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  explanationText: { fontSize: 14, lineHeight: 20 },
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
  correctOption: { borderColor: "#22c55e", borderWidth: 2, backgroundColor: "#22c55e20" },
  wrongOption: { borderColor: "#ef4444", borderWidth: 2, backgroundColor: "#ef444420" },
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
  optionButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionText: {
    fontSize: 16,
  },
});

