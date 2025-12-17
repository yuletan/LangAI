import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { recordActivity, saveConversation, getConversations, findCachedResponse } from "@/db";
import { API_BASE_URL } from "@/constants/config";

const API_URL = `${API_BASE_URL}/chat`;

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  translation?: string;
  corrections?: { wrong: string; correct: string; tip: string }[];
  timestamp: number;
}

const SCENARIOS = [
  { label: "Free Chat", value: "casual conversation", icon: "chatbubbles-outline", color: "#8b5cf6" },
  { label: "Restaurant", value: "ordering food at a restaurant", icon: "restaurant-outline", color: "#ef4444" },
  { label: "Shopping", value: "shopping at a store", icon: "cart-outline", color: "#f59e0b" },
  { label: "Travel", value: "asking for directions while traveling", icon: "airplane-outline", color: "#3b82f6" },
  { label: "Business", value: "a professional business meeting", icon: "briefcase-outline", color: "#10b981" },
  { label: "Doctor", value: "visiting a doctor", icon: "medkit-outline", color: "#ec4899" },
];

const LANGUAGES = [
  { label: "Spanish", value: "Spanish", code: "es-ES" },
  { label: "French", value: "French", code: "fr-FR" },
  { label: "German", value: "German", code: "de-DE" },
  { label: "Italian", value: "Italian", code: "it-IT" },
  { label: "Portuguese", value: "Portuguese", code: "pt-BR" },
  { label: "Japanese", value: "Japanese", code: "ja-JP" },
];

export default function ChatScreen() {
  const { colors, theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [showSettings, setShowSettings] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Load default language on mount
  useFocusEffect(
    useCallback(() => {
      loadDefaultLanguage();
    }, [])
  );

  const loadDefaultLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem("targetLanguage");
      if (savedLang) {
        const langObj = LANGUAGES.find(l => l.value === savedLang);
        if (langObj) setSelectedLanguage(langObj);
      }
    } catch (e) {
      console.log("Error loading default language", e);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const startConversation = () => {
    setShowSettings(false);
    // Add initial AI greeting
    const greeting: Message = {
      id: Date.now().toString(),
      role: "ai",
      content: getInitialGreeting(),
      translation: getInitialGreetingTranslation(),
      timestamp: Date.now(),
    };
    setMessages([greeting]);
  };

  const getInitialGreeting = () => {
    const greetings: { [key: string]: string } = {
      Spanish: "¡Hola! Estoy aquí para ayudarte a practicar español. ¿De qué te gustaría hablar?",
      French: "Bonjour! Je suis là pour vous aider à pratiquer le français. De quoi aimeriez-vous parler?",
      German: "Hallo! Ich bin hier, um Ihnen beim Deutschüben zu helfen. Worüber möchten Sie sprechen?",
      Italian: "Ciao! Sono qui per aiutarti a praticare l'italiano. Di cosa vorresti parlare?",
      Portuguese: "Olá! Estou aqui para ajudá-lo a praticar português. Sobre o que você gostaria de falar?",
      Japanese: "こんにちは！日本語の練習をお手伝いします。何について話したいですか？",
    };
    return greetings[selectedLanguage.value] || greetings.Spanish;
  };

  const getInitialGreetingTranslation = () => {
    return "Hello! I'm here to help you practice. What would you like to talk about?";
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Prepare history for context (sliding window - last 6 messages)
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Check cache for similar inputs in this scenario
      const cached = await findCachedResponse(inputText.trim(), selectedScenario.value, selectedLanguage.value);
      
      let data;
      if (cached) {
        console.log("⚡ Used cached chat response");
        data = cached;
      } else {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: inputText.trim(),
            history,
            language: selectedLanguage.value,
            scenario: selectedScenario.value,
            difficulty: "B1",
          }),
        });

        if (!res.ok) throw new Error("Chat API error");
        data = await res.json();
      }

      await recordActivity("chat", 15);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.response || "...",
        translation: data.translation,
        corrections: data.corrections,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Sorry, I couldn't respond. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakMessage = (text: string) => {
    Speech.speak(text, {
      language: selectedLanguage.code,
      rate: 0.85,
    });
  };

  const saveCurrentConversation = async () => {
    if (messages.length < 2) return;
    
    try {
      await saveConversation(selectedScenario.value, selectedLanguage.value, messages);
      Alert.alert("Saved", "Conversation saved to history!");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error("Failed to save chat", e);
      Alert.alert("Error", "Could not save conversation.");
    }
  };

  const resetChat = () => {
    if (messages.length > 2) {
      Alert.alert(
        "End Conversation?",
        "Do you want to save this chat before exiting?",
        [
          { text: "Discard", style: "destructive", onPress: () => {
            setMessages([]);
            setShowSettings(true);
          }},
          { text: "Save & Exit", onPress: async () => {
            await saveCurrentConversation();
            setMessages([]);
            setShowSettings(true);
          }},
          { text: "Cancel", style: "cancel" }
        ]
      );
    } else {
      setMessages([]);
      setShowSettings(true);
    }
  };

  if (showSettings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          style={styles.settingsScrollView}
          contentContainerStyle={styles.settingsContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.settingsTitle, { color: colors.text }]}>
            Conversation Practice
          </Text>
          <Text style={[styles.settingsSubtitle, { color: colors.icon }]}>
            Chat with an AI partner to improve your speaking skills
          </Text>

          <Text style={[styles.settingsLabel, { color: colors.text }]}>
            Select Language
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[
                  styles.langChip,
                  selectedLanguage.value === lang.value && { backgroundColor: colors.tint },
                ]}
                onPress={() => setSelectedLanguage(lang)}
              >
                <Text
                  style={[
                    styles.langChipText,
                    { color: selectedLanguage.value === lang.value ? "#fff" : colors.text },
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.settingsLabel, { color: colors.text }]}>
            Choose a Scenario
          </Text>
          <View style={styles.scenarioGrid}>
            {SCENARIOS.map((scenario) => (
              <TouchableOpacity
                key={scenario.value}
                style={[
                  styles.scenarioCard,
                  { backgroundColor: scenario.color + "15", borderColor: scenario.color + "40" },
                  selectedScenario.value === scenario.value && {
                    borderColor: scenario.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedScenario(scenario)}
              >
                <View style={[styles.scenarioIcon, { backgroundColor: scenario.color }]}>
                  <Ionicons name={scenario.icon as any} size={24} color="#fff" />
                </View>
                <Text style={[styles.scenarioLabel, { color: colors.text }]}>
                  {scenario.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.tint }]}
            onPress={startConversation}
          >
            <Ionicons name="chatbubbles" size={20} color="#fff" />
            <Text style={styles.startButtonText}>Start Conversation</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity onPress={resetChat} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{selectedLanguage.label} Practice</Text>
          <Text style={styles.headerSubtitle}>{selectedScenario.label}</Text>
        </View>
        <TouchableOpacity onPress={saveCurrentConversation} style={styles.headerButton}>
          <Ionicons name="save-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View key={message.id}>
              <View
                style={[
                  styles.messageBubble,
                  message.role === "user"
                    ? [styles.userBubble, { backgroundColor: colors.tint }]
                    : [styles.aiBubble, { backgroundColor: "#f3f4f6" }],
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: message.role === "user" ? "#fff" : colors.text },
                  ]}
                >
                  {message.content}
                </Text>
                {message.translation && (
                  <Text
                    style={[
                      styles.translationText,
                      { color: message.role === "user" ? "rgba(255,255,255,0.8)" : colors.icon },
                    ]}
                  >
                    {message.translation}
                  </Text>
                )}
                {message.role === "ai" && (
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => speakMessage(message.content)}
                  >
                    <Ionicons name="volume-high" size={18} color={colors.tint} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Corrections */}
              {message.corrections && message.corrections.length > 0 && (
                <View style={styles.correctionsContainer}>
                  {message.corrections.map((correction, idx) => (
                    <View key={idx} style={styles.correctionCard}>
                      <View style={styles.correctionHeader}>
                        <Ionicons name="school" size={14} color="#f59e0b" />
                        <Text style={styles.correctionTitle}>Correction</Text>
                      </View>
                      <View style={styles.correctionContent}>
                        <Text style={styles.correctionWrong}>
                          <Text style={styles.strikethrough}>{correction.wrong}</Text>
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#22c55e" />
                        <Text style={styles.correctionCorrect}>{correction.correct}</Text>
                      </View>
                      <Text style={styles.correctionTip}>{correction.tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: "#f3f4f6" }]}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.typingText, { color: colors.icon }]}>Typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: "#f3f4f6", color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Type in ${selectedLanguage.label} or English...`}
            placeholderTextColor={colors.icon}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? colors.tint : colors.icon },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  settingsScrollView: { flex: 1 },
  settingsContainer: { padding: 25, paddingTop: 60, paddingBottom: 40 },
  settingsTitle: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  settingsSubtitle: { fontSize: 16, marginBottom: 30 },
  settingsLabel: { fontSize: 16, fontWeight: "600", marginBottom: 12, marginTop: 20 },
  optionScroll: { marginBottom: 10 },
  langChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  langChipText: { fontWeight: "600" },
  scenarioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 30 },
  scenarioCard: {
    width: "47%",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  scenarioIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  scenarioLabel: { fontSize: 14, fontWeight: "600" },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  startButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  headerButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 15, paddingBottom: 20 },
  messageBubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  translationText: { fontSize: 13, marginTop: 8, fontStyle: "italic" },
  speakButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    padding: 4,
  },
  correctionsContainer: { marginLeft: 10, marginBottom: 10 },
  correctionCard: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 10,
    marginTop: 5,
    maxWidth: "80%",
  },
  correctionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  correctionTitle: { fontSize: 12, fontWeight: "600", color: "#b45309" },
  correctionContent: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  correctionWrong: { color: "#dc2626" },
  strikethrough: { textDecorationLine: "line-through" },
  correctionCorrect: { color: "#16a34a", fontWeight: "600" },
  correctionTip: { fontSize: 12, color: "#92400e" },
  typingIndicator: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 14 },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
