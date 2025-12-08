import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { debounce } from "lodash";

// ⚠️ REPLACE THIS WITH YOUR COMPUTER\'S IP ADDRESS ⚠️
const API_URL = "http://YOUR_LOCAL_IP_ADDRESS:3000/api/predict";

export default function App() {
  const [inputText, setInputText] = useState("");
  const [data, setData] = useState({
    translation: "",
    pronunciation: "",
    predictions: [],
  });
  const [loading, setLoading] = useState(false);

  // Gamification (Static for demo)
  const [xp, setXp] = useState(1250);

  // Call the Backend
  const fetchAI = async (text) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          inputLang: "English",
          outputLang: "Spanish",
          tone: "casual",
          difficulty: "normal",
        }),
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce (Wait 500ms after typing stops)
  const debouncedFetch = useCallback(debounce(fetchAI, 500), []);

  const handleType = (text) => {
    setInputText(text);
    debouncedFetch(text);
  };

  const selectPrediction = (pred) => {
    const newText = inputText + " " + pred.word;
    setInputText(newText);
    fetchAI(newText); // Immediate fetch on click
    setXp(xp + 10); // Reward
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Gamification Bar */}
      <View style={styles.header}>
        <Text style={styles.xpText}>💎 12 Day Streak</Text>
        <Text style={styles.xpText}>⚡ {xp} XP</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>English ➡️ Spanish</Text>

        {/* Input Box */}
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleType}
          placeholder="Type here (e.g., I want to...)"
          placeholderTextColor="#999"
        />

        {/* Live Translation */}
        <View style={styles.resultBox}>
          {loading && (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={{ marginBottom: 10 }}
            />
          )}

          <Text style={styles.translation}>
            {data.translation || "Translation will appear here..."}
          </Text>
          <Text style={styles.pronunciation}>{data.pronunciation}</Text>
        </View>

        {/* Predictions */}
        <Text style={styles.subTitle}>Next Word Suggestions:</Text>
        <View style={styles.chipsContainer}>
          {data.predictions.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={styles.chip}
              onPress={() => selectPrediction(p)}
            >
              <View style={styles.chipTop}>
                <Text style={styles.chipWord}>{p.word}</Text>
                <Text style={styles.chipProb}>
                  {Math.round(p.probability * 100)}%
                </Text>
              </View>
              <Text style={styles.chipTrans}>{p.translation}</Text>
              <Text style={styles.chipReason}>{p.reason}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F7", paddingTop: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#fff",
  },
  xpText: { fontWeight: "bold", fontSize: 16, color: "#333" },
  content: { padding: 20 },
  title: { fontSize: 18, fontWeight: "bold", color: "#555", marginBottom: 15 },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },
  resultBox: {
    backgroundColor: "#E3F2FD",
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
  },
  translation: { fontSize: 22, fontWeight: "bold", color: "#007AFF" },
  pronunciation: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#666",
    marginTop: 5,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#444",
  },
  chipsContainer: { gap: 10 },
  chip: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  chipTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  chipWord: { fontSize: 18, fontWeight: "bold" },
  chipProb: { color: "green", fontWeight: "bold" },
  chipTrans: { fontSize: 14, color: "#555" },
  chipReason: { fontSize: 12, color: "#999", marginTop: 4 },
});
