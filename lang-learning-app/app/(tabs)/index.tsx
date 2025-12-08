import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { debounce } from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

const API_URL = "http://10.13.113.147:3000/api/predict";

interface Prediction {
  word: string;
  translation: string;
  pronunciation: string;
  probability: number;
  reason: string;
}

interface ApiData {
  translation: string;
  pronunciation: string;
  predictions: Prediction[];
}

interface SavedPhrase {
  original: string;
  translation: string;
  pronunciation: string;
  timestamp: number;
}

const LANGUAGES = [
  { label: "English", value: "English" },
  { label: "Spanish", value: "Spanish" },
  { label: "French", value: "French" },
  { label: "German", value: "German" },
  { label: "Italian", value: "Italian" },
  { label: "Portuguese", value: "Portuguese" },
  { label: "Russian", value: "Russian" },
  { label: "Chinese", value: "Chinese" },
  { label: "Japanese", value: "Japanese" },
  { label: "Korean", value: "Korean" },
];

const TONES = [
  { label: "Casual", value: "casual", icon: "happy-outline" },
  { label: "Formal", value: "formal", icon: "business-outline" },
  { label: "Humorous", value: "humorous", icon: "happy-outline" },
  { label: "Academic", value: "academic", icon: "school-outline" },
  { label: "Sarcastic", value: "sarcastic", icon: "eye-roll-outline" },
];

const DIFFICULTY_LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function App() {
  const [inputText, setInputText] = useState<string>("");
  const [inputLang, setInputLang] = useState<string>("English");
  const [outputLang, setOutputLang] = useState<string>("Spanish");
  const [tone, setTone] = useState<string>("casual");
  const [difficulty, setDifficulty] = useState<number>(5);
  const [data, setData] = useState<ApiData>({
    translation: "",
    pronunciation: "",
    predictions: [],
  });
  const [loading, setLoading] = useState(false);
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);
  const [xp, setXp] = useState(1250);
  const [level, setLevel] = useState(5);
  const [xpProgress, setXpProgress] = useState(0.6); // 60% to next level
  const colorScheme = "light";
  const colors = Colors[colorScheme];
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Load saved phrases on mount
  useEffect(() => {
    loadSavedPhrases();
  }, []);

  const loadSavedPhrases = async () => {
    try {
      const saved = await AsyncStorage.getItem("savedPhrases");
      if (saved) {
        setSavedPhrases(JSON.parse(saved));
      }
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

    const newPhrase: SavedPhrase = {
      original: inputText,
      translation: data.translation,
      pronunciation: data.pronunciation,
      timestamp: Date.now(),
    };

    const updatedPhrases = [...savedPhrases, newPhrase];
    setSavedPhrases(updatedPhrases);
    await AsyncStorage.setItem("savedPhrases", JSON.stringify(updatedPhrases));

    // Animate save button
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

    // Reward XP
    setXp((prev) => prev + 25);
    Alert.alert("Phrase Saved!", "You earned 25 XP!");
  };

  const fetchAI = async (text: string) => {
    if (!text.trim()) return;
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
          difficulty,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setData({
        translation: json.translation || "",
        pronunciation: json.pronunciation || "",
        predictions: json.predictions || [],
      });
    } catch (err) {
      console.error("Fetch error:", err);
      Alert.alert("Connection Error", "Could not connect to the AI server.");
      // Reset data to empty state on error
      setData({
        translation: "",
        pronunciation: "",
        predictions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(debounce(fetchAI, 500), [
    inputLang,
    outputLang,
    tone,
    difficulty,
  ]);

  const handleType = (text: string) => {
    setInputText(text);
    debouncedFetch(text);
  };

  const selectPrediction = (pred: Prediction) => {
    const newText = inputText + " " + pred.word;
    setInputText(newText);
    fetchAI(newText);
    setXp((prevXp) => prevXp + 10);
  };

  const clearInput = () => {
    setInputText("");
    setData({ translation: "", pronunciation: "", predictions: [] });
  };

  const toggleColorScheme = () => {
    // This would require a global state manager to toggle, but for now we'll just show an alert.
    Alert.alert(
      "Theme Toggle",
      "Dark/light mode toggle would be implemented with a context provider."
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header with Gamification */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={20} color="#fff" />
            <Text style={styles.statText}>Day {12}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={20} color="#fff" />
            <Text style={styles.statText}>Level {level}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={20} color="#fff" />
            <Text style={styles.statText}>{xp} XP</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${xpProgress * 100}%` }]}
          />
        </View>
        <TouchableOpacity
          style={styles.themeToggle}
          onPress={toggleColorScheme}
        >
          <Ionicons name="moon" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          AI Language Predictor
        </Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          Practice {inputLang} to {outputLang} with AI suggestions
        </Text>

        {/* Language Selectors */}
        <View style={styles.languageRow}>
          <View style={styles.languageSelector}>
            <Text style={[styles.selectorLabel, { color: colors.text }]}>
              From
            </Text>
            <Picker
              selectedValue={inputLang}
              onValueChange={setInputLang}
              style={[
                styles.picker,
                { color: colors.text, backgroundColor: colors.background },
              ]}
              dropdownIconColor={colors.text}
            >
              {LANGUAGES.map((lang) => (
                <Picker.Item
                  key={lang.value}
                  label={lang.label}
                  value={lang.value}
                />
              ))}
            </Picker>
          </View>
          <View style={styles.languageSelector}>
            <Text style={[styles.selectorLabel, { color: colors.text }]}>
              To
            </Text>
            <Picker
              selectedValue={outputLang}
              onValueChange={setOutputLang}
              style={[
                styles.picker,
                { color: colors.text, backgroundColor: colors.background },
              ]}
              dropdownIconColor={colors.text}
            >
              {LANGUAGES.map((lang) => (
                <Picker.Item
                  key={lang.value}
                  label={lang.label}
                  value={lang.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Tone Selector */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Select Tone
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
                tone === t.value && { backgroundColor: colors.tint },
              ]}
              onPress={() => setTone(t.value)}
            >
              <Ionicons
                name={t.icon as any}
                size={20}
                color={tone === t.value ? "#fff" : colors.text}
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

        {/* Difficulty */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Difficulty Level: {difficulty}
        </Text>
        <Picker
          selectedValue={difficulty}
          onValueChange={setDifficulty}
          style={[
            styles.picker,
            { color: colors.text, backgroundColor: colors.background },
          ]}
          dropdownIconColor={colors.text}
        >
          {DIFFICULTY_LEVELS.map((level) => (
            <Picker.Item key={level} label={`Level ${level}`} value={level} />
          ))}
        </Picker>

        {/* Input Box */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.icon,
              },
            ]}
            value={inputText}
            onChangeText={handleType}
            placeholder="Type a sentence in your language..."
            placeholderTextColor={colors.icon}
            multiline
          />
          {inputText.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearInput}>
              <Ionicons name="close-circle" size={24} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>

        {/* Translation Result */}
        <View
          style={[styles.resultBox, { backgroundColor: colors.tint + "20" }]}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} />
          ) : (
            <>
              <Text style={[styles.translation, { color: colors.tint }]}>
                {data.translation || "Your translation will appear here"}
              </Text>
              {data.pronunciation ? (
                <View style={styles.pronunciationRow}>
                  <Ionicons name="volume-high" size={20} color={colors.icon} />
                  <Text style={[styles.pronunciation, { color: colors.icon }]}>
                    {data.pronunciation}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveCurrentPhrase}
              >
                <Animated.View style={{ opacity: fadeAnim }}>
                  <Ionicons name="bookmark" size={20} color={colors.tint} />
                </Animated.View>
                <Text style={[styles.saveButtonText, { color: colors.tint }]}>
                  Save Phrase
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Predictions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          AI Word Suggestions
        </Text>
        <View style={styles.predictionsGrid}>
          {data.predictions && data.predictions.length > 0 ? (
            data.predictions.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.predictionChip,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.icon,
                  },
                ]}
                onPress={() => selectPrediction(p)}
              >
                <View style={styles.predictionHeader}>
                  <Text style={[styles.predictionWord, { color: colors.text }]}>
                    {p.word}
                  </Text>
                  <Text style={[styles.predictionProb, { color: colors.tint }]}>
                    {Math.round(p.probability * 100)}%
                  </Text>
                </View>
                <Text style={[styles.predictionTrans, { color: colors.icon }]}>
                  {p.translation}
                </Text>
                <Text style={[styles.predictionReason, { color: colors.icon }]}>
                  {p.reason}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.placeholderText, { color: colors.icon }]}>
              AI suggestions will appear here as you type...
            </Text>
          )}
        </View>

        {/* Saved Phrases Preview */}
        {savedPhrases.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recently Saved Phrases
            </Text>
            <View style={styles.savedPhrases}>
              {savedPhrases.slice(0, 3).map((phrase, i) => (
                <View
                  key={i}
                  style={[
                    styles.savedPhraseCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.icon,
                    },
                  ]}
                >
                  <Text style={[styles.savedOriginal, { color: colors.text }]}>
                    {phrase.original}
                  </Text>
                  <Text
                    style={[styles.savedTranslation, { color: colors.tint }]}
                  >
                    {phrase.translation}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation Hint */}
      <View style={[styles.bottomHint, { backgroundColor: colors.tint }]}>
        <Text style={styles.bottomHintText}>
          Swipe up on the Explore tab for grammar lessons!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    marginTop: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  themeToggle: {
    position: "absolute",
    right: 20,
    top: 40,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 25,
  },
  languageRow: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 25,
  },
  languageSelector: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  picker: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },
  toneScroll: {
    marginBottom: 20,
  },
  toneChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toneLabel: {
    marginLeft: 5,
    fontWeight: "600",
  },
  inputContainer: {
    position: "relative",
    marginBottom: 20,
  },
  input: {
    height: 100,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    textAlignVertical: "top",
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  resultBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
  },
  translation: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  pronunciationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  pronunciation: {
    fontSize: 16,
    fontStyle: "italic",
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  saveButtonText: {
    marginLeft: 8,
    fontWeight: "600",
  },
  predictionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 25,
  },
  predictionChip: {
    width: "48%",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  predictionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  predictionWord: {
    fontSize: 18,
    fontWeight: "bold",
  },
  predictionProb: {
    fontSize: 16,
    fontWeight: "bold",
  },
  predictionTrans: {
    fontSize: 14,
    marginBottom: 5,
  },
  predictionReason: {
    fontSize: 12,
    fontStyle: "italic",
  },
  savedPhrases: {
    marginBottom: 25,
  },
  savedPhraseCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  savedOriginal: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  savedTranslation: {
    fontSize: 14,
  },
  placeholderText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    width: "100%",
    padding: 20,
  },
  bottomHint: {
    padding: 10,
    alignItems: "center",
  },
  bottomHintText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
