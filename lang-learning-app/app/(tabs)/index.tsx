import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomPicker from "@/components/CustomPicker";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";

import {
  initDB,
  checkCache,
  saveToCache,
  generateCacheKey,
  addPhrase,
  recordActivity,
  getTotalStats,
  deletePhrase,
} from "@/db";

import { API_BASE_URL } from "@/constants/config";

// API URL - Use localhost for web/simulator, or your IP for physical device
const API_URL = `${API_BASE_URL}/predict`;
const GRAMMAR_CHECK_URL = `${API_BASE_URL}/grammar-check`;

interface Prediction {
  word: string;
  translation: string;
  pronunciation?: string;
  probability: number;
  reason: string;
  cult_warn?: string | null;
}

interface ApiData {
  translation: string;
  pronunciation: string;
  predictions: Prediction[];
}

interface SavedPhrase {
  id?: number;
  original: string;
  translation: string;
  pronunciation: string;
  timestamp: number;
}

const LANGUAGES = [
  { label: "English", displayLabel: "EN", value: "English", code: "en-US" },
  { label: "Spanish", displayLabel: "ES", value: "Spanish", code: "es-ES" },
  { label: "French", displayLabel: "FR", value: "French", code: "fr-FR" },
  { label: "German", displayLabel: "DE", value: "German", code: "de-DE" },
  { label: "Italian", displayLabel: "IT", value: "Italian", code: "it-IT" },
  { label: "Portuguese", displayLabel: "PT", value: "Portuguese", code: "pt-BR" },
  { label: "Russian", displayLabel: "RU", value: "Russian", code: "ru-RU" },
  { label: "Chinese", displayLabel: "ZH", value: "Chinese", code: "zh-CN" },
  { label: "Japanese", displayLabel: "JA", value: "Japanese", code: "ja-JP" },
  { label: "Korean", displayLabel: "KO", value: "Korean", code: "ko-KR" },
];

const TONES = [
  { label: "Casual", value: "casual", icon: "happy-outline", gradient: ["#FF6B6B", "#FF8E53"] },
  { label: "Formal", value: "formal", icon: "business-outline", gradient: ["#667eea", "#764ba2"] },
  { label: "Humorous", value: "humorous", icon: "happy-outline", gradient: ["#f093fb", "#f5576c"] },
  { label: "Academic", value: "academic", icon: "school-outline", gradient: ["#4facfe", "#00f2fe"] },
  { label: "Sarcastic", value: "sarcastic", icon: "eye-outline", gradient: ["#43e97b", "#38f9d7"] },
];

const CEFR_LEVELS = [
  { label: "A1", value: "A1" },
  { label: "A2", value: "A2" },
  { label: "B1", value: "B1" },
  { label: "B2", value: "B2" },
  { label: "C1", value: "C1" },
  { label: "C2", value: "C2" },
];

const SCENARIOS = [
  { label: "General", value: "" },
  { label: "Restaurant", value: "ordering food at a restaurant" },
  { label: "Travel", value: "traveling and asking for directions" },
  { label: "Business", value: "professional business meeting" },
  { label: "Medical", value: "visiting a doctor" },
  { label: "Shopping", value: "shopping at a store" },
];

export default function App() {
  // Core State
  const [inputText, setInputText] = useState<string>("");
  const [inputLang, setInputLang] = useState<string>("English");
  const [outputLang, setOutputLang] = useState<string>("Spanish");
  const [tone, setTone] = useState<string>("casual");
  const [cefrLevel, setCefrLevel] = useState<string>("B1");
  const [scenario, setScenario] = useState<string>("");
  const [data, setData] = useState<ApiData>({
    translation: "",
    pronunciation: "",
    predictions: [],
  });
  const [loading, setLoading] = useState(false);
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);

  // Gamification State
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);

  // UI State
  const [ghostText, setGhostText] = useState<string>("");
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const { colors, theme, toggleTheme } = useTheme();

  // Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const pauseTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTriggerText = useRef<string>("");

  // Initialize
  useEffect(() => {
    initDB();
    loadSavedPhrases();
    loadStats();
    
    // Load saved language
    AsyncStorage.getItem("targetLanguage").then(lang => {
      if (lang) setOutputLang(lang);
    });

    // Load saved CEFR level
    AsyncStorage.getItem("cefrLevel").then(level => {
      if (level) setCefrLevel(level);
    });

    // Skeleton pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("targetLanguage", outputLang);
  }, [outputLang]);

  useEffect(() => {
    AsyncStorage.setItem("cefrLevel", cefrLevel);
  }, [cefrLevel]);

  const loadStats = async () => {
    try {
      const stats = await getTotalStats();
      setStreak(stats.currentStreak);
      // Calculate level from total activities
      setLevel(Math.floor(stats.totalActivities / 50) + 1);
      // Load XP from storage
      const savedXp = await AsyncStorage.getItem("totalXp");
      if (savedXp) setXp(parseInt(savedXp, 10));
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  };

  const loadSavedPhrases = async () => {
    try {
      let allPhrasesData: SavedPhrase[] = [];
      
      // Load from SQLite (native only)
      if (Platform.OS !== "web") {
        const { getAllPhrases } = await import("@/db");
        const sqlitePhrases = await getAllPhrases();
        allPhrasesData = sqlitePhrases.map(p => ({
          id: p.id,
          original: p.original,
          translation: p.translated,
          pronunciation: p.pronunciation || "",
          timestamp: p.created_at
        }));
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
              allPhrasesData.push({
                original: phrase.original,
                translation: phrase.translated || phrase.translation,
                pronunciation: phrase.pronunciation || "",
                timestamp: phrase.created_at || phrase.timestamp || Date.now()
              });
            }
          });
        }
      } catch (asyncError) {
        console.log("AsyncStorage phrases load error:", asyncError);
      }
      
      setSavedPhrases(allPhrasesData);
    } catch (error) {
      console.error("Failed to load saved phrases", error);
    }
  };

  const saveCurrentPhrase = async () => {
    if (!inputText.trim() || !data.translation) {
      Alert.alert(
        "Cannot Save",
        "Please enter text and get a translation first."
      );
      return;
    }

    // Add to SQLite for SRS / Supabase for Web
    const dbId = await addPhrase(inputText, data.translation, data.pronunciation);

    // Also save to AsyncStorage for quick access
    const newPhrase: SavedPhrase = {
      id: dbId || undefined,
      original: inputText,
      translation: data.translation,
      pronunciation: data.pronunciation,
      timestamp: Date.now(),
    };

    const updatedPhrases = [...savedPhrases, newPhrase];
    setSavedPhrases(updatedPhrases);
    await AsyncStorage.setItem("saved_phrases", JSON.stringify(updatedPhrases));

    // Animate and reward
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    await addXp(25);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Phrase Saved!", "Added to your review deck. +25 XP!");
  };

  const addXp = async (amount: number) => {
    const newXp = xp + amount;
    setXp(newXp);
    await AsyncStorage.setItem("totalXp", newXp.toString());
    // Level up every 500 XP
    setLevel(Math.floor(newXp / 500) + 1);
  };

  const handleDeletePhrase = (phrase: SavedPhrase) => {
    const performDelete = async () => {
      try {
        // Filter by ID if available, otherwise by original text AND timestamp
        const updatedPhrases = savedPhrases.filter(p => {
          if (phrase.id && p.id) {
            return p.id !== phrase.id;
          }
          // Fallback: match by original text AND timestamp for uniqueness
          return !(p.original === phrase.original && p.timestamp === phrase.timestamp);
        });
        
        setSavedPhrases(updatedPhrases);
        
        // Update AsyncStorage
        await AsyncStorage.setItem("saved_phrases", JSON.stringify(updatedPhrases));
        
        // Delete from DB (if it has an ID)
        if (phrase.id) {
          await deletePhrase(phrase.id);
        }
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error("Error deleting phrase:", error);
        Alert.alert("Error", "Failed to delete phrase. Please try again.");
        loadSavedPhrases();
      }
    };

    // On web, use browser confirm; on native, use Alert.alert
    if (Platform.OS === "web" && typeof globalThis.confirm === "function") {
      if (globalThis.confirm("Are you sure you want to delete this phrase?")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Phrase",
        "Are you sure you want to delete this phrase?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: performDelete
          }
        ]
      );
    }
  };

  // --- SMART TRIGGER LOGIC ---
  const shouldTriggerPrediction = (text: string): boolean => {
    if (!text.trim()) return false;

    const lastChar = text[text.length - 1];

    // Trigger on space (end of word)
    if (lastChar === " ") return true;

    // Trigger on punctuation
    if ([",", ".", "!", "?", ";", ":"].includes(lastChar)) return true;

    return false;
  };

  const fetchAI = async (text: string) => {
    if (!text.trim() || text === lastTriggerText.current) return;
    lastTriggerText.current = text;

    // Check cache first
    const cacheKey = await generateCacheKey(text, inputLang, outputLang, tone);
    const cachedData = await checkCache(cacheKey);

    if (cachedData) {
      console.log("⚡ Loaded from Local Cache");
      setData(cachedData);
      updateGhostText(cachedData.predictions);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          inputLang,
          outputLang,
          tone,
          difficulty: cefrLevel,
          scenario,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      // Save to cache
      await saveToCache(cacheKey, json);
      await recordActivity("prediction", 10);

      setData({
        translation: json.translation || "",
        pronunciation: json.pronunciation || "",
        predictions: json.predictions || [],
      });

      updateGhostText(json.predictions);

      // Haptic feedback on predictions arriving
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateGhostText = (predictions: Prediction[]) => {
    if (predictions && predictions.length > 0) {
      const topPrediction = predictions[0];
      setGhostText(topPrediction.word);
    } else {
      setGhostText("");
    }
  };

  const handleType = (text: string) => {
    setInputText(text);

    // Clear existing pause timer
    if (pauseTimer.current) {
      clearTimeout(pauseTimer.current);
    }

    // Smart trigger: immediate if space/punctuation
    if (shouldTriggerPrediction(text)) {
      fetchAI(text);
    } else {
      // Pause trigger: 1.5 seconds after typing stops
      pauseTimer.current = setTimeout(() => {
        if (text.trim() && text !== lastTriggerText.current) {
          fetchAI(text);
        }
      }, 1500);
    }
  };

  const acceptGhostText = () => {
    if (ghostText) {
      const newText = inputText.trimEnd() + " " + ghostText;
      setInputText(newText);
      setGhostText("");
      fetchAI(newText);
      addXp(5);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const selectPrediction = (pred: Prediction) => {
    const newText = inputText.trimEnd() + " " + pred.word;
    setInputText(newText);
    fetchAI(newText);
    addXp(10);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const openPredictionDetail = (pred: Prediction) => {
    setSelectedPrediction(pred);
    bottomSheetRef.current?.expand();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const clearInput = () => {
    setInputText("");
    setGhostText("");
    setData({ translation: "", pronunciation: "", predictions: [] });
  };

  const getLanguageCode = (lang: string): string => {
    const found = LANGUAGES.find((l) => l.value === lang);
    return found?.code || "en-US";
  };

  const playTranslation = async () => {
    if (!data.translation) return;
    try {
      // Stop any current speech
      await Speech.stop();
      await Speech.speak(data.translation, {
        language: getLanguageCode(outputLang),
        pitch: 1.0,
        rate: 0.8,
      });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error playing translation:", error);
    }
  };

  const playWord = async (word: string, language?: string) => {
    try {
      // Stop any current speech
      await Speech.stop();
      const langCode = language ? getLanguageCode(language) : getLanguageCode(outputLang);
      await Speech.speak(word, {
        language: langCode,
        pitch: 1.0,
        rate: 0.7,
      });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error playing word:", error);
    }
  };

  const playOriginalPhrase = async (phrase: string) => {
    try {
      // Stop any current speech
      await Speech.stop();
      await Speech.speak(phrase, {
        language: getLanguageCode(inputLang),
        pitch: 1.0,
        rate: 0.8,
      });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error playing original phrase:", error);
    }
  };

  // Get chip style based on confidence
  const getChipStyle = (probability: number) => {
    if (probability >= 0.8) {
      return { borderColor: "#22c55e", borderWidth: 2 }; // Green
    } else if (probability >= 0.5) {
      return { borderColor: "#eab308", borderWidth: 2 }; // Yellow
    } else {
      return { borderColor: "#ef4444", borderWidth: 2 }; // Red
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return "#22c55e";
    if (probability >= 0.5) return "#eab308";
    return "#ef4444";
  };

  // Skeleton component
  const SkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.skeletonChip,
            {
              opacity: skeletonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.7],
              }),
            },
          ]}
        >
          <View style={styles.skeletonWord} />
          <View style={styles.skeletonText} />
        </Animated.View>
      ))}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header with Dark Mode Toggle */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.mainTitle, { color: colors.text }]}>
                  AI Language Predictor
                </Text>
                <Text style={[styles.subtitle, { color: colors.icon }]}>
                  Type in {inputLang}, get predictions in {outputLang}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.themeToggle, { backgroundColor: colors.cardBackground }]}
                onPress={toggleTheme}
              >
                <Ionicons
                  name={theme === 'dark' ? 'sunny' : 'moon'}
                  size={24}
                  color={colors.tint}
                />
              </TouchableOpacity>
            </View>

            {/* Enhanced Stats Overview */}
            <View style={styles.statsOverview}>
              <View style={[styles.statCard, { 
                backgroundColor: theme === 'dark' ? '#451a03' : '#fef3c7',
                borderWidth: 1,
                borderColor: theme === 'dark' ? '#f59e0b40' : '#fbbf2460',
                ...Shadows.sm
              }]}>
                <Ionicons name="flame" size={28} color="#f59e0b" />
                <Text style={[styles.statValue, { color: theme === 'dark' ? '#fbbf24' : '#92400e' }]}>{streak}</Text>
                <Text style={[styles.statName, { color: theme === 'dark' ? '#fbbf24' : '#92400e' }]}>Day Streak</Text>
              </View>
              <View style={[styles.statCard, { 
                backgroundColor: theme === 'dark' ? '#2e1065' : '#f3e8ff',
                borderWidth: 1,
                borderColor: theme === 'dark' ? '#8b5cf640' : '#a78bfa60',
                ...Shadows.sm
              }]}>
                <Ionicons name="trophy" size={28} color="#8b5cf6" />
                <Text style={[styles.statValue, { color: theme === 'dark' ? '#a78bfa' : '#5b21b6' }]}>{level}</Text>
                <Text style={[styles.statName, { color: theme === 'dark' ? '#a78bfa' : '#5b21b6' }]}>Level</Text>
              </View>
              <View style={[styles.statCard, { 
                backgroundColor: theme === 'dark' ? '#052e16' : '#dcfce7',
                borderWidth: 1,
                borderColor: theme === 'dark' ? '#22c55e40' : '#4ade8060',
                ...Shadows.sm
              }]}>
                <Ionicons name="star" size={28} color="#22c55e" />
                <Text style={[styles.statValue, { color: theme === 'dark' ? '#4ade80' : '#166534' }]}>{xp}</Text>
                <Text style={[styles.statName, { color: theme === 'dark' ? '#4ade80' : '#166534' }]}>Total XP</Text>
              </View>
            </View>

          {/* Enhanced Language Selectors */}
          <View style={[styles.languageRow, { backgroundColor: colors.cardBackground, ...Shadows.sm }]}>
            <View style={styles.languageSelector}>
              <Text style={[styles.selectorLabel, { color: colors.text }]}>
                From
              </Text>
              <CustomPicker
                selectedValue={inputLang}
                onValueChange={setInputLang}
                options={LANGUAGES.map(l => ({ label: l.label, displayLabel: l.displayLabel, value: l.value }))}
                theme={theme}
              />
            </View>
            
            {/* Language Swap Button */}
            <TouchableOpacity
              style={[styles.swapButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                const temp = inputLang;
                setInputLang(outputLang);
                setOutputLang(temp);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.languageSelector}>
              <Text style={[styles.selectorLabel, { color: colors.text }]}>
                To
              </Text>
              <CustomPicker
                selectedValue={outputLang}
                onValueChange={setOutputLang}
                options={LANGUAGES.map(l => ({ label: l.label, displayLabel: l.displayLabel, value: l.value }))}
                theme={theme}
              />
            </View>
          </View>

          {/* Enhanced Tone Selector */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tone & Style
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.toneScroll}
          >
            {TONES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.toneChip,
                  { 
                    backgroundColor: tone === t.value ? colors.tint : colors.cardBackground,
                    borderColor: tone === t.value ? colors.tint : colors.border,
                    ...Shadows.sm
                  }
                ]}
                onPress={() => {
                  setTone(t.value);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Ionicons
                  name={t.icon as any}
                  size={18}
                  color={tone === t.value ? "#fff" : colors.tint}
                />
                <Text
                  style={[
                    styles.toneLabel,
                    { color: tone === t.value ? "#fff" : colors.text },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Level & Scenario Row */}
          <View style={[styles.settingsRow, { backgroundColor: colors.cardBackground, ...Shadows.sm }]}>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.icon }]}>
                Level
              </Text>
              <CustomPicker
                selectedValue={cefrLevel}
                onValueChange={setCefrLevel}
                options={CEFR_LEVELS}
                theme={theme}
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.icon }]}>
                Scenario
              </Text>
              <CustomPicker
                selectedValue={scenario}
                onValueChange={setScenario}
                options={SCENARIOS}
                theme={theme}
              />
            </View>
          </View>

          {/* Enhanced Input with Smart Features */}
          <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, ...Shadows.md }]}>
            <View style={styles.inputHeader}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                What would you like to say?
              </Text>
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background }]}
                  onPress={() => Alert.alert("Voice Input", "Coming soon!")}
                >
                  <Ionicons name="mic-outline" size={20} color={colors.tint} />
                </TouchableOpacity>
                {inputText.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: colors.background }]} 
                    onPress={clearInput}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: loading ? colors.tint : colors.border,
                  },
                ]}
                value={inputText}
                onChangeText={handleType}
                placeholder={`Type in ${inputLang}...`}
                placeholderTextColor={colors.muted}
                multiline
                maxLength={500}
              />
              
              {/* Enhanced Ghost Text with Animation */}
              {ghostText && inputText.length > 0 && (
                <Animated.View
                  style={[
                    styles.ghostTextContainer,
                    {
                      opacity: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1],
                      }),
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={acceptGhostText}
                    activeOpacity={0.8}
                    style={styles.ghostTextTouchable}
                  >
                    <Text style={[styles.ghostText, { color: colors.text }]}>
                      {inputText.trimEnd()} <Text style={[styles.ghostWord, { color: colors.tint }]}>{ghostText}</Text>
                    </Text>
                    <View style={[styles.tabHint, { backgroundColor: colors.tint }]}>
                      <Text style={styles.tabHintText}>Tap to accept</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
              
              {/* Character Counter */}
              <Text style={[styles.charCounter, { color: colors.muted }]}>
                {inputText.length}/500
              </Text>
            </View>
          </View>

          {/* Enhanced Translation Result */}
          <View style={[styles.resultBox, { backgroundColor: colors.cardBackground, ...Shadows.md }]}>
            {loading ? (
              <View style={styles.loadingBox}>
                <Animated.View
                  style={[
                    styles.skeletonTranslation,
                    {
                      backgroundColor: colors.border,
                      opacity: skeletonAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.7],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.skeletonPronunciation,
                    {
                      backgroundColor: colors.border,
                      opacity: skeletonAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.7],
                      }),
                    },
                  ]}
                />
              </View>
            ) : (
              <>
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultLabel, { color: colors.muted }]}>
                    Translation in {outputLang}
                  </Text>
                  {data.translation && (
                    <View style={styles.resultActions}>
                      <TouchableOpacity
                        style={[styles.audioButton, { backgroundColor: colors.tint + "20" }]}
                        onPress={playTranslation}
                      >
                        <Ionicons name="volume-high" size={20} color={colors.tint} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.audioButton, { backgroundColor: colors.success + "20" }]}
                        onPress={saveCurrentPhrase}
                      >
                        <Ionicons name="bookmark-outline" size={20} color={colors.success} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <Text style={[styles.translation, { color: colors.text }]}>
                  {data.translation || "Your translation will appear here"}
                </Text>
                
                {data.pronunciation && (
                  <View style={styles.pronunciationContainer}>
                    <Ionicons name="musical-notes" size={16} color={colors.muted} />
                    <Text style={[styles.pronunciation, { color: colors.muted }]}>
                      {data.pronunciation}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Enhanced AI Predictions */}
          <View style={styles.predictionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                AI Suggestions
              </Text>
              {data.predictions && data.predictions.length > 0 && (
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                  Tap to use • Hold for details
                </Text>
              )}
            </View>
            
            {loading ? (
              <SkeletonLoader />
            ) : (
              <View style={styles.predictionsGrid}>
                {data.predictions && data.predictions.length > 0 ? (
                  data.predictions.map((p, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.predictionChip,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: getProbabilityColor(p.probability),
                          ...Shadows.sm,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => selectPrediction(p)}
                        onLongPress={() => openPredictionDetail(p)}
                        delayLongPress={300}
                        style={styles.predictionContent}
                      >
                        {/* Confidence Indicator */}
                        <View style={[styles.confidenceIndicator, { backgroundColor: getProbabilityColor(p.probability) }]} />
                        
                        <View style={styles.predictionHeader}>
                          <View style={styles.predictionWordRow}>
                            <Text style={[styles.predictionWord, { color: colors.text }]}>
                              {p.word}
                            </Text>
                            {p.cult_warn && (
                              <TouchableOpacity
                                onPress={() => Alert.alert("Cultural Note", p.cult_warn || "")}
                                style={styles.warningButton}
                              >
                                <Ionicons name="warning" size={14} color={colors.warning} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={[styles.predictionProb, { color: getProbabilityColor(p.probability) }]}>
                            {Math.round(p.probability * 100)}%
                          </Text>
                        </View>
                        
                        <Text style={[styles.predictionTrans, { color: colors.muted }]}>
                          {p.translation}
                        </Text>
                        
                        <Text style={[styles.predictionReason, { color: colors.muted }]} numberOfLines={2}>
                          {p.reason}
                        </Text>
                        
                        <View style={styles.chipActions}>
                          <TouchableOpacity
                            style={[styles.chipAudioButton, { backgroundColor: colors.tint + "20" }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              playWord(p.word, outputLang);
                            }}
                          >
                            <Ionicons name="volume-medium" size={14} color={colors.tint} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="bulb-outline" size={48} color={colors.muted} />
                    <Text style={[styles.placeholderText, { color: colors.muted }]}>
                      Start typing to see AI suggestions...
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Enhanced Recently Saved */}
          {savedPhrases.length > 0 && (
            <View style={styles.savedSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Recently Saved
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                  {savedPhrases.length} phrases in your deck
                </Text>
              </View>
              <View style={styles.savedPhrases}>
                {savedPhrases.slice(-3).reverse().map((phrase, i) => (
                  <View
                    key={i}
                    style={[
                      styles.savedPhraseCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border,
                        ...Shadows.sm,
                      },
                    ]}
                  >
                    <View style={styles.savedPhraseHeader}>
                      <View style={styles.savedPhraseText}>
                        <Text style={[styles.savedOriginal, { color: colors.muted }]}>
                          {phrase.original}
                        </Text>
                        <Text style={[styles.savedTranslation, { color: colors.text }]}>
                          {phrase.translation}
                        </Text>
                      </View>
                      <View style={styles.savedPhraseActions}>
                        <TouchableOpacity
                          style={[styles.savedAudioButton, { backgroundColor: colors.background }]}
                          onPress={() => playOriginalPhrase(phrase.original)}
                        >
                          <Ionicons name="volume-medium" size={16} color={colors.tint} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.savedAudioButton, { backgroundColor: colors.background }]}
                          onPress={() => playWord(phrase.translation, outputLang)}
                        >
                          <Ionicons name="volume-high" size={16} color={colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.savedAudioButton, { backgroundColor: colors.background }]}
                          onPress={() => handleDeletePhrase(phrase)}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          </View>
        </ScrollView>

        {/* Bottom Sheet for Grammar Details */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={["50%"]}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: colors.background }}
          handleIndicatorStyle={{ backgroundColor: colors.icon }}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
            {selectedPrediction && (
              <>
                <View style={styles.bottomSheetHeader}>
                  <Text style={[styles.bottomSheetWord, { color: colors.text }]}>
                    {selectedPrediction.word}
                  </Text>
                  <TouchableOpacity onPress={() => playWord(selectedPrediction.word)}>
                    <Ionicons name="volume-high" size={28} color={colors.tint} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.bottomSheetTranslation, { color: colors.tint }]}>
                  {selectedPrediction.translation}
                </Text>
                <View style={styles.bottomSheetSection}>
                  <Text style={[styles.bottomSheetLabel, { color: colors.icon }]}>
                    Confidence
                  </Text>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        {
                          width: `${selectedPrediction.probability * 100}%`,
                          backgroundColor: getProbabilityColor(
                            selectedPrediction.probability
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.confidenceText,
                      {
                        color: getProbabilityColor(selectedPrediction.probability),
                      },
                    ]}
                  >
                    {Math.round(selectedPrediction.probability * 100)}%
                  </Text>
                </View>
                <View style={styles.bottomSheetSection}>
                  <Text style={[styles.bottomSheetLabel, { color: colors.icon }]}>
                    Why this word?
                  </Text>
                  <Text style={[styles.bottomSheetReason, { color: colors.text }]}>
                    {selectedPrediction.reason}
                  </Text>
                </View>
                {selectedPrediction.cult_warn && (
                  <View
                    style={[
                      styles.culturalWarning,
                      { backgroundColor: "#fef3c7" },
                    ]}
                  >
                    <Ionicons name="warning" size={20} color="#d97706" />
                    <Text style={styles.culturalWarningText}>
                      {selectedPrediction.cult_warn}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.useWordButton, { backgroundColor: colors.tint }]}
                  onPress={() => {
                    selectPrediction(selectedPrediction);
                    bottomSheetRef.current?.close();
                  }}
                >
                  <Text style={styles.useWordButtonText}>Use This Word</Text>
                </TouchableOpacity>
              </>
            )}
          </BottomSheetView>
        </BottomSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: Spacing.md, paddingBottom: 100 },
  content: {
    padding: Spacing.lg,
  },
  
  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  themeToggle: {
    padding: Spacing.md,
    borderRadius: Radius.full,
    marginLeft: Spacing.md,
  },
  
  // Stats Overview
  statsOverview: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  gradientCard: {
    borderWidth: 0,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: Spacing.xs,
  },
  statName: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Language Selector Styles
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  languageSelector: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  pickerContainer: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  pickerSmall: {
    height: 45,
  },
  swapButton: {
    padding: Spacing.md,
    borderRadius: Radius.full,
    alignSelf: "flex-end",
    marginBottom: Spacing.xs,
  },
  // Section Headers
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  
  // Tone Selector
  toneScroll: {
    marginBottom: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  toneChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginRight: Spacing.md,
    borderWidth: 1,
    minWidth: 90,
  },
  toneLabel: {
    marginLeft: Spacing.xs,
    fontWeight: "600",
    fontSize: 14,
  },
  settingsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  settingItem: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  pickerWrapper: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  
  // Enhanced Input Styles
  inputContainer: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    minHeight: 100,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    fontSize: 16,
    borderWidth: 2,
    textAlignVertical: "top",
  },
  charCounter: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.md,
    fontSize: 12,
  },
  // Ghost Text Styles
  ghostTextContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ghostTextTouchable: {
    padding: Spacing.lg,
    flex: 1,
  },
  ghostText: {
    fontSize: 16,
    color: "transparent",
  },
  ghostWord: {
    fontStyle: "italic",
  },
  tabHint: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  tabHintText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  // Result Box Styles
  resultBox: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
  },
  loadingBox: {
    gap: Spacing.md,
  },
  skeletonTranslation: {
    height: 24,
    borderRadius: Radius.sm,
    width: "80%",
  },
  skeletonPronunciation: {
    height: 16,
    borderRadius: Radius.sm,
    width: "50%",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  translation: {
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 30,
    marginBottom: Spacing.md,
  },
  pronunciationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  pronunciation: {
    fontSize: 16,
    fontStyle: "italic",
  },
  audioButton: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  // Predictions Styles
  predictionsSection: {
    marginBottom: Spacing.xl,
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  skeletonChip: {
    width: "48%",
    padding: Spacing.lg,
    borderRadius: Radius.md,
  },
  skeletonWord: {
    height: 20,
    borderRadius: Radius.sm,
    width: "60%",
    marginBottom: Spacing.sm,
  },
  skeletonText: {
    height: 14,
    borderRadius: Radius.sm,
    width: "80%",
  },
  predictionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  predictionChip: {
    width: "48%",
    borderRadius: Radius.md,
    borderWidth: 2,
    overflow: "hidden",
  },
  predictionContent: {
    padding: Spacing.lg,
  },
  confidenceIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  predictionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  predictionWordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  predictionWord: {
    fontSize: 18,
    fontWeight: "bold",
  },
  warningButton: {
    padding: 2,
  },
  predictionProb: {
    fontSize: 12,
    fontWeight: "bold",
  },
  predictionTrans: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  predictionReason: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  chipActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  chipAudioButton: {
    padding: Spacing.xs,
    borderRadius: Radius.sm,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxl,
    width: "100%",
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  // Saved Phrases Styles
  savedSection: {
    marginBottom: Spacing.xl,
  },
  savedPhrases: {
    gap: Spacing.md,
  },
  savedPhraseCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  savedPhraseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  savedPhraseText: {
    flex: 1,
  },
  savedOriginal: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  savedTranslation: {
    fontSize: 16,
    fontWeight: "600",
  },
  savedPhraseActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  savedAudioButton: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  bottomSheetContent: {
    padding: 20,
    flex: 1,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bottomSheetWord: {
    fontSize: 32,
    fontWeight: "bold",
  },
  bottomSheetTranslation: {
    fontSize: 20,
    marginBottom: 20,
  },
  bottomSheetSection: {
    marginBottom: 20,
  },
  bottomSheetLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  bottomSheetReason: {
    fontSize: 16,
    lineHeight: 24,
  },
  culturalWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 15,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  culturalWarningText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
  },
  useWordButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  useWordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
