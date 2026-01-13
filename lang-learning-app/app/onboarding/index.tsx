import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import CustomPicker from "@/components/CustomPicker";
import { API_BASE_URL } from "@/constants/config";
import * as Speech from "expo-speech";

// --- Types ---
type PlacementSession = {
  session_id: string;
  status: string;
};

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_index?: number;
};

type Descriptor = {
  [level: string]: string;
};

// --- Constants ---
const LANGUAGES = [
  { label: "Spanish", displayLabel: "ES", value: "Spanish" },
  { label: "French", displayLabel: "FR", value: "French" },
  { label: "German", displayLabel: "DE", value: "German" },
  { label: "Italian", displayLabel: "IT", value: "Italian" },
  { label: "Japanese", displayLabel: "JA", value: "Japanese" },
  { label: "Chinese", displayLabel: "ZH", value: "Chinese" },
  { label: "Portuguese", displayLabel: "PT", value: "Portuguese" },
];

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function OnboardingScreen() {
  const { colors, theme } = useTheme();
  
  // Steps: 
  // 1: Language Select 
  // 2: Self Assessment 
  // 3: Adaptive Test 
  // 4: Result
  const [step, setStep] = useState(1);
  const [selectedLang, setSelectedLang] = useState("Spanish");
  
  // User Identity (Temporary for session)
  const [userId, setUserId] = useState<string>("");

  // Self Assessment State
  const [descriptors, setDescriptors] = useState<Descriptor | null>(null);
  const [selfAssessedLevel, setSelfAssessedLevel] = useState<string | null>(null);
  
  // Placement Test State
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<PlacementSession | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentBucketIndex, setCurrentBucketIndex] = useState(0); // Index within the bucket (0-4)
  const [bucketResponses, setBucketResponses] = useState<any[]>([]);
  
  // UI State for current question
  const [confidence, setConfidence] = useState<"HIGH" | "LOW">("HIGH");
  
  // Result State
  const [finalResult, setFinalResult] = useState<{
    level: string;
    plus_level: boolean;
    confidence_score: number;
    message?: string;
  } | null>(null);

  // Pagination/Grouping State
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  useEffect(() => {
    // Generate or retrieve a user ID
    const initUser = async () => {
      let storedId = await AsyncStorage.getItem("temp_user_id");
      if (!storedId) {
        storedId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem("temp_user_id", storedId);
      }
      setUserId(storedId);
    };
    initUser();
  }, []);

  // --- API Actions ---

  const fetchDescriptors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cefr/placement/start?skill=listening`);
      const data = await res.json();
      if (data.success) {
        setDescriptors(data.data.descriptors);
        setStep(2);
      } else {
        Alert.alert("Error", "Failed to load assessment data.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Network request failed");
    } finally {
      setLoading(false);
    }
  };

  const startPlacementSession = async (level: string) => {
    setSelfAssessedLevel(level);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cefr/placement/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          selfAssessedLevel: level,
          language: selectedLang,
          skill: "listening" // Default to listening for placement
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSession(data.data); // Store full session object
        setCurrentQuestions(data.data.current_questions);
        setCurrentBucketIndex(0);
        setCurrentGroupIndex(0); // Reset group index for new session
        setBucketResponses([]);
        setStep(3);
      } else {
        Alert.alert("Error", data.error || "Failed to start session");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to start placement session");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (optionIndex: number) => {
    const currentQ = currentQuestions[currentBucketIndex];
    
    // We assume backend validates correctness, but for the 'response' object
    // we need to tell the backend if it was correct (based on received data)
    // or simply send the selected index and let backend decide.
    // The backend `evaluateBucket` logic (as seen in `DIALANGPlacementService.js`)
    // iterates over `responses` and checks `question.is_correct`.
    // It seems the backend expects the client to have flagged it as correct?
    // Let's verify: In `DIALANGPlacementService.js`: `if (question.is_correct) ...`
    // This implies the `question` object in the `responses` array has `is_correct`.
    // So yes, we must determine correctness here.
    
    const isCorrect = optionIndex === currentQ.correct_index;

    const response = {
      question_id: currentQ.id,
      selected_index: optionIndex,
      is_correct: isCorrect,
      confidence: confidence, // "HIGH" or "LOW"
      time_taken: 0 
    };

    const newResponses = [...bucketResponses, response];
    setBucketResponses(newResponses);

    // If bucket is not full, move to next question within the group or next group
    if (newResponses.length < currentQuestions.length) {
      setCurrentBucketIndex(currentBucketIndex + 1);
      setConfidence("HIGH"); // Reset confidence
    } else {
      // Bucket full, submit to backend
      await processBucketSubmission(newResponses);
    }
  };

  const processBucketSubmission = async (responses: any[]) => {
    setLoading(true);
    try {
        const payload = {
            session: session, 
            responses: responses,
            language: selectedLang
        };
        
        const res = await fetch(`${API_BASE_URL}/cefr/placement/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.success) {
            const updatedSession = data.data;
            setSession(updatedSession);
            
            if (updatedSession.next_action && updatedSession.next_action.continue_testing) {
                 // Load next questions
                 setCurrentQuestions(updatedSession.current_questions);
                 setCurrentBucketIndex(0);
                 setCurrentGroupIndex(0); // Reset group index for next bucket
                 setBucketResponses([]);
                 setConfidence("HIGH");
                 
                 // Optional: Show a toast or small alert about level change?
                 // Alert.alert("Adaptation", updatedSession.next_action.message);
            } else {
                 // Finalize
                 // If session.status is COMPLETED, we are done.
                 setFinalResult(updatedSession.final_result);
                 await saveProfile(updatedSession.final_result);
                 setStep(4);
            }
        } else {
            Alert.alert("Error", "Submission failed");
        }

    } catch(e) {
        Alert.alert("Error", "Network error submitting bucket");
    } finally {
        setLoading(false);
    }
  };

  const saveProfile = async (result: any) => {
    try {
      await AsyncStorage.setItem("targetLanguage", selectedLang);
      await AsyncStorage.setItem("cefrLevel", result.level);
      await AsyncStorage.setItem("isPlusLevel", result.plus_level ? "true" : "false");
      await AsyncStorage.setItem("hasCompletedOnboarding", "true");
      
      // We should also ensure the backend profile is created/linked if not already done via the placement flow.
      // The finalizePlacement endpoint (called internally or explicitly?)
      // In `DIALANGPlacementService.js`, `finalizePlacement` updates the passed `userProfile`.
      // But we didn't pass a userProfile to `submitResponses`.
      // So the transient profile in the session is updated? 
      // We might need to call `/api/cefr/profile` to ensure a permanent profile exists if we want to use it later.
      
    } catch (e) { console.error(e); }
  };

  // --- Render Helpers ---

  const renderLanguageSelect = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>Welcome to LangAI 🚀</Text>
      <Text style={[styles.subtitle, { color: colors.icon }]}>Which language do you want to learn?</Text>
      <View style={styles.pickerContainer}>
        <CustomPicker
          selectedValue={selectedLang}
          onValueChange={setSelectedLang}
          options={LANGUAGES}
          theme={theme}
        />
      </View>
      <TouchableOpacity 
        style={[styles.primaryButton, { backgroundColor: colors.tint }]}
        onPress={fetchDescriptors}
      >
        <Text style={styles.buttonText}>Next</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderSelfAssessment = () => {
     if (loading) return <ActivityIndicator size="large" color={colors.tint} />;
     if (!descriptors) return <Text style={{color:colors.error}}>Failed to load data</Text>;

     return (
       <View style={styles.stepContainer}>
         <Text style={[styles.title, { color: colors.text }]}>Self Assessment</Text>
         <Text style={[styles.subtitle, { color: colors.icon }]}>
           Select the statement that best describes your current ability.
         </Text>
         
         {CEFR_LEVELS.map((level) => (
           <TouchableOpacity
             key={level}
             style={[styles.descriptorCard, { borderColor: colors.border }]}
             onPress={() => startPlacementSession(level)}
           >
             <View style={[styles.levelBadge, { backgroundColor: colors.tint }]}>
               <Text style={styles.levelText}>{level}</Text>
             </View>
             <Text style={[styles.descriptorText, { color: colors.text }]}>
               {descriptors[level] || "Loading..."}
             </Text>
           </TouchableOpacity>
         ))}
       </View>
     );
  };

  /* Helper to play audio */
  const playAudio = async (text: string) => {
    try {
      await Speech.stop();
      // Map language names to codes if needed, or rely on device defaults. 
      // Simple mapping for demo:
      const langCodes: {[key: string]: string} = {
        "Spanish": "es-ES", "French": "fr-FR", "German": "de-DE", 
        "Italian": "it-IT", "Japanese": "ja-JP", "Chinese": "zh-CN", "Portuguese": "pt-BR"
      };
      const code = langCodes[selectedLang] || "en-US";
      
      await Speech.speak(text, { language: code, rate: 0.8 });
    } catch (e) {
      console.error(e);
    }
  };

  const renderQuiz = () => {
    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
                {bucketResponses.length >= 5 ? "Analyzing Performance..." : "Loading Questions..."}
            </Text>
        </View>
    );
    
    if (!currentQuestions || currentQuestions.length === 0) return <Text style={{color:colors.text}}>No Questions Loaded</Text>;
    
    // Grouping Logic
    const groups: any[] = [];
    currentQuestions.forEach((q: any) => {
      const passage = q.audio_script || q.scenario_text || "";
      const lastGroup = groups[groups.length - 1];
      
      if (!lastGroup || (passage !== "" && lastGroup.passage !== passage) || (passage === "" && lastGroup.passage !== "")) {
        groups.push({
          passage,
          questions: [q],
          startIndex: currentQuestions.indexOf(q)
        });
      } else {
        lastGroup.questions.push(q);
      }
    });

    const currentGroup = groups[currentGroupIndex];
    if (!currentGroup) return <Text style={{color:colors.text}}>Error: Group not found</Text>;

    const activeDifficulty = (session as any)?.bucket_state?.current_difficulty || "...";
    
    const isLastGroup = currentGroupIndex === groups.length - 1;
    const allAnsweredInGroup = currentGroup.questions.every((_: any, idx: number) => {
      const globalIdx = currentGroup.startIndex + idx;
      return bucketResponses[globalIdx] !== undefined;
    });

    return (
      <View style={styles.stepContainer}>
        <View style={styles.headerRow}>
             <Text style={[styles.progressText, { color: colors.tint }]}>
                Section {currentGroupIndex + 1} / {groups.length}
             </Text>
             <Text style={[styles.levelTag, { color: colors.icon }]}>Testing: {activeDifficulty}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
          <View style={[styles.questionCard, { backgroundColor: colors.cardBackground, marginBottom: 20 }]}>
            
            {/* Passage Section */}
            {currentGroup.passage ? (
              <View style={{ marginBottom: 20, alignItems: 'center' }}>
                 <TouchableOpacity 
                   style={{ 
                     backgroundColor: colors.tint + "20", 
                     width: 80, height: 80, 
                     borderRadius: 40, 
                     justifyContent: 'center', alignItems: 'center',
                     borderWidth: 1, borderColor: colors.tint
                   }}
                   onPress={() => playAudio(currentGroup.passage)}
                 >
                   <Ionicons name="volume-high" size={40} color={colors.tint} />
                 </TouchableOpacity>
                 <Text style={{ marginTop: 10, color: colors.icon, fontSize: 14 }}>
                   Tap to Listen to Scenario
                 </Text>
              </View>
            ) : null}

            {/* Render Questions in Current Group */}
            {currentGroup.questions.map((q: any, groupIdx: number) => {
              const globalIdx = currentGroup.startIndex + groupIdx;
              const hasAnswered = bucketResponses[globalIdx] !== undefined;
              const answer = bucketResponses[globalIdx];

              return (
                <View key={globalIdx} style={{ marginBottom: 30, opacity: hasAnswered ? 0.6 : 1 }}>
                  <Text style={[styles.questionText, { color: colors.text, fontSize: 18 }]}>
                    {groupIdx + 1}. {q.question}
                  </Text>
                  
                  {hasAnswered ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.tint + '10', padding: 12, borderRadius: 12 }}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                      <Text style={{ color: colors.text }}>Answer recorded</Text>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.optionsContainer}>
                        {q.options.map((opt: string, optIdx: number) => (
                          <TouchableOpacity
                            key={optIdx}
                            style={[styles.optionBtn, { borderColor: colors.border }]}
                            onPress={() => submitAnswer(optIdx)}
                          >
                            <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      
                      <View style={styles.divider} />
                      
                      <View style={styles.confidenceRow}>
                        <View style={styles.confidenceInfo}>
                            <Ionicons name={confidence === "HIGH" ? "flame" : "help-buoy"} size={22} color={confidence === "HIGH" ? colors.tabIconSelected : colors.icon} />
                            <Text style={[styles.confidenceLabel, { color: colors.text, fontSize: 14 }]}>
                                {confidence === "HIGH" ? "I'm Confident" : "I'm Guessing"}
                            </Text>
                        </View>
                        <Switch
                            value={confidence === "HIGH"}
                            onValueChange={(val) => setConfidence(val ? "HIGH" : "LOW")}
                            trackColor={{ false: "#767577", true: colors.tint }}
                            thumbColor={"#f4f3f4"}
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Next Group Button */}
            {allAnsweredInGroup && !isLastGroup && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.tint, marginTop: 10 }]}
                onPress={() => {
                  setCurrentGroupIndex(currentGroupIndex + 1);
                  setConfidence("HIGH");
                }}
              >
                <Text style={styles.buttonText}>Next Section</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderResult = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="trophy" size={80} color={"#FFD700"} />
      <Text style={[styles.title, { color: colors.text }]}>Assessment Complete!</Text>
      
      <View style={styles.resultContainer}>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Your Official Level:</Text>
          <View style={[styles.finalLevelBadge, { backgroundColor: colors.tint }]}>
             <Text style={styles.finalLevelText}>{finalResult?.level}</Text>
             {finalResult?.plus_level && (
                 <View style={styles.plusBadge}>
                     <Text style={styles.plusText}>+</Text>
                 </View>
             )}
          </View>
      </View>
      
      <View style={styles.statRow}>
         {/* Detailed Score Breakdown */}
         <View style={styles.statItem}>
             <Text style={[styles.statValue, {color: colors.text}]}>
                {Math.round((finalResult?.confidence_score || 0) * 100)}%
             </Text>
             <Text style={[styles.statLabel, {color: colors.icon}]}>Accuracy</Text>
         </View>
      </View>

      <Text style={[styles.messageText, { color: colors.text }]}>
         {finalResult?.message || "Great job! We've customized your learning path."}
      </Text>

      <TouchableOpacity 
        style={[styles.primaryButton, { backgroundColor: colors.tint, marginTop: 30 }]}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.buttonText}>Start Learning</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={theme === 'dark' ? ['#1e1b4b', '#0f172a'] : ['#f0f9ff', '#ffffff']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderLanguageSelect()}
        {step === 2 && renderSelfAssessment()}
        {step === 3 && renderQuiz()}
        {step === 4 && renderResult()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: "center" },
  stepContainer: { alignItems: "center", width: "100%" },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 30, lineHeight: 24, maxWidth: "80%" },
  pickerContainer: { width: "100%", marginBottom: 40 },
  primaryButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 18, paddingHorizontal: 30, borderRadius: 16, width: "100%", gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  
  // Descriptor Styles
  descriptorCard: {
    flexDirection: "row", width: "100%", padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 15,
    backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center"
  },
  levelBadge: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginRight: 15 },
  levelText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  descriptorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  
  // Quiz Styles
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 20, fontSize: 16, fontWeight: "600" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 15, alignItems: "center" },
  progressText: { fontSize: 16, fontWeight: "700" },
  levelTag: { fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  questionCard: { width: "100%", padding: 20, borderRadius: 24, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  questionText: { fontSize: 20, fontWeight: "600", marginBottom: 25, lineHeight: 28 },
  optionsContainer: { width: "100%", gap: 12 },
  optionBtn: { width: "100%", padding: 18, borderRadius: 16, borderWidth: 1.5 },
  optionText: { fontSize: 16, fontWeight: "500" },
  divider: { height: 1, backgroundColor: "rgba(150,150,150,0.2)", marginVertical: 20 },
  confidenceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, width: "100%" },
  confidenceInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  confidenceLabel: { fontSize: 16, fontWeight: "600" },
  confidenceHint: { fontSize: 12, fontStyle: "italic", textAlign: "right", alignSelf: "flex-end" },
  
  // Result Styles
  resultContainer: { alignItems: "center", marginBottom: 30 },
  finalLevelBadge: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 40, paddingVertical: 20, borderRadius: 30 },
  finalLevelText: { color: "#fff", fontSize: 60, fontWeight: "900", lineHeight: 70 },
  plusBadge: { position: "absolute", top: 10, right: 10 },
  plusText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  messageText: { fontSize: 18, textAlign: "center", marginTop: 20, lineHeight: 26, maxWidth: "90%" },
  statRow: { flexDirection: "row", gap: 30, marginBottom: 20 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 14, textTransform: "uppercase", letterSpacing: 1 },
});
