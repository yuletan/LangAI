import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getTotalStats,
  getActivityByDate,
  getStatsByType,
  getAllPhrases,
  getWeakAreas,
  getAccuracyTrend,
} from "@/db";
import { useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "@/constants/config";
import { LineChart, BarChart } from "react-native-gifted-charts";

const API_URL = `${API_BASE_URL}/insights`;

export default function DashboardScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const { colors, theme } = useTheme();
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalDays: 0,
    currentStreak: 0,
  });
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [typeStats, setTypeStats] = useState<{ type: string; avg_score: number; count: number }[]>([]);
  const [phrasesCount, setPhrasesCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [weakAreas, setWeakAreas] = useState<{ area: string; score: number }[]>([]);
  const [accuracyTrend, setAccuracyTrend] = useState<{ date: string; accuracy: number }[]>([]);
  
  // Simulated leaderboard data
  const leaderboard = [
    { rank: 1, name: "Player 1", xp: 12500, avatar: "🥇" },
    { rank: 2, name: "Player 2", xp: 11200, avatar: "🥈" },
    { rank: 3, name: "Player 3", xp: 9800, avatar: "🥉" },
    { rank: 4, name: "You", xp: xp, avatar: "👤", isUser: true },
    { rank: 5, name: "Player 4", xp: Math.max(xp - 500, 100), avatar: "🧙" },
  ].sort((a, b) => b.xp - a.xp).map((u, i) => ({ ...u, rank: i + 1 }));

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      let allPhrasesData: any[] = [];
      
      // Load phrases from both sources for accurate count
      if (Platform.OS !== "web") {
        allPhrasesData = await getAllPhrases();
      }
      
      // Also check AsyncStorage
      try {
        const savedPhrasesKey = "saved_phrases";
        const savedData = await AsyncStorage.getItem(savedPhrasesKey);
        if (savedData) {
          const asyncPhrases = JSON.parse(savedData);
          // Merge, avoiding duplicates
          asyncPhrases.forEach((phrase: any) => {
            if (!allPhrasesData.some(p => p.original === phrase.original)) {
              allPhrasesData.push(phrase);
            }
          });
        }
      } catch (asyncError) {
        console.log("AsyncStorage phrases load error:", asyncError);
      }

      const [statsData, activity, types, savedXp, areas, trend] = await Promise.all([
        getTotalStats(),
        getActivityByDate(),
        getStatsByType(),
        AsyncStorage.getItem("totalXp"),
        getWeakAreas(),
        getAccuracyTrend(7),
      ]);

      setStats(statsData);
      setActivityData(activity || []);
      setTypeStats(types || []);
      setPhrasesCount(allPhrasesData.length);
      if (savedXp) setXp(parseInt(savedXp, 10));
      setWeakAreas(areas || []);
      setAccuracyTrend(trend || []);
      
      console.log("Dashboard data loaded:", {
        stats: statsData,
        activityCount: activity?.length || 0,
        typeStatsCount: types?.length || 0,
        phrasesCount: allPhrasesData.length,
        xp: savedXp,
        weakAreasCount: areas?.length || 0,
        trendCount: trend?.length || 0,
      });
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    }
  };

  const generateInsight = async () => {
    setIsLoadingInsight(true);
    try {
      // Create compressed summary for AI
      const summary = `
        Streak: ${stats.currentStreak} days.
        Total activities: ${stats.totalActivities}.
        Phrases saved: ${phrasesCount}.
        Activity breakdown: ${typeStats.map((t) => `${t.type}(${t.count})`).join(", ")}.
        XP earned: ${xp}.
      `;

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.insight || "Keep up the great work!");
      }
    } catch (e) {
      console.error("Insight error:", e);
      setAiInsight("Keep practicing daily to see progress!");
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const generateDemoData = async () => {
    try {
      // Generate sample activity data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        // Add random activities
        const activitiesCount = Math.floor(Math.random() * 15) + 5;
        for (let j = 0; j < activitiesCount; j++) {
          const types = ["prediction", "chat", "review", "correction"];
          const type = types[Math.floor(Math.random() * types.length)];
          const score = Math.floor(Math.random() * 100);
          
          if (Platform.OS !== "web") {
            const { recordActivity } = await import("@/db");
            await recordActivity(type as any, score);
          }
        }
      }
      
      Alert.alert("Demo Data Generated", "Sample activity data has been added. Refresh to see charts!");
      loadData();
    } catch (e) {
      console.error("Demo data error:", e);
      Alert.alert("Error", "Could not generate demo data");
    }
  };

  const exportData = async () => {
    try {
      let allPhrasesData: any[] = [];
      
      // Load phrases from both sources
      if (Platform.OS !== "web") {
        allPhrasesData = await getAllPhrases();
      }
      
      // Also check AsyncStorage
      try {
        const savedPhrasesKey = "saved_phrases";
        const savedData = await AsyncStorage.getItem(savedPhrasesKey);
        if (savedData) {
          const asyncPhrases = JSON.parse(savedData);
          asyncPhrases.forEach((phrase: any) => {
            if (!allPhrasesData.some(p => p.original === phrase.original)) {
              allPhrasesData.push(phrase);
            }
          });
        }
      } catch (asyncError) {
        console.log("AsyncStorage phrases load error:", asyncError);
      }

      if (allPhrasesData.length === 0) {
        Alert.alert("No Data", "You don't have any saved phrases to export yet.");
        return;
      }
      
      // Create CSV content
      let csv = "ID,Original,Translation,Pronunciation,Next Review,Created\n";
      allPhrasesData.forEach((p, index) => {
        const id = p.id || index + 1;
        const original = (p.original || "").replace(/"/g, '""');
        const translated = (p.translated || p.translation || "").replace(/"/g, '""');
        const pronunciation = (p.pronunciation || "").replace(/"/g, '""');
        const nextReview = p.next_review ? new Date(p.next_review).toISOString() : "N/A";
        const created = p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString();
        
        csv += `${id},"${original}","${translated}","${pronunciation}",${nextReview},${created}\n`;
      });

      if (Platform.OS === "web") {
        // For web, create a download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `language_progress_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert("Success", "CSV file downloaded!");
        return;
      }

      const fileName = `language_progress_${new Date().toISOString().split("T")[0]}.csv`;
      const filePath = `${(FileSystem as any).documentDirectory}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(filePath, csv, {
        encoding: (FileSystem as any).EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert("Success", `Report saved to ${filePath}`);
      }
    } catch (e) {
      console.error("Export error:", e);
      Alert.alert("Error", "Failed to export data. Please try again.");
    }
  };

  // Generate heatmap data (last 28 days in a 4-week grid)
  const renderHeatmap = () => {
    const weeks: { date: string; count: number; day: number }[][] = [];
    let currentWeek: { date: string; count: number; day: number }[] = [];

    for (let i = 27; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayData = activityData.find((d) => d.date === dateStr);
      
      // Add some demo data for visualization if no real data exists
      let count = dayData?.count || 0;
      if (stats.totalActivities === 0 && i < 7) {
        // Show demo pattern for last week if no real data
        count = Math.floor(Math.random() * 8);
      }
      
      currentWeek.push({
        date: dateStr,
        count: count,
        day: date.getDay(),
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    console.log("Rendering heatmap with weeks:", weeks.length, "Total activity data:", activityData.length);

    return (
      <View style={styles.heatmapGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.heatmapWeek}>
            {week.map((day, di) => (
              <View
                key={di}
                style={[
                  styles.heatmapCell,
                  {
                    backgroundColor:
                      day.count === 0
                        ? "#e5e7eb"
                        : day.count < 3
                        ? "#bbf7d0"
                        : day.count < 6
                        ? "#4ade80"
                        : day.count < 10
                        ? "#22c55e"
                        : "#15803d",
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    );
  };

  // Enhanced activity breakdown with insights
  const renderSkillBars = () => {
    const skills = [
      { 
        name: "Predictions", 
        icon: "bulb-outline",
        value: typeStats.find((t) => t.type === "prediction")?.count || 0,
        avgScore: typeStats.find((t) => t.type === "prediction")?.avg_score || 0,
        color: "#3b82f6" 
      },
      { 
        name: "Chat", 
        icon: "chatbubble-outline",
        value: typeStats.find((t) => t.type === "chat")?.count || 0,
        avgScore: typeStats.find((t) => t.type === "chat")?.avg_score || 0,
        color: "#8b5cf6" 
      },
      { 
        name: "Reviews", 
        icon: "refresh-outline",
        value: typeStats.find((t) => t.type === "review")?.count || 0,
        avgScore: typeStats.find((t) => t.type === "review")?.avg_score || 0,
        color: "#22c55e" 
      },
      { 
        name: "Corrections", 
        icon: "checkmark-circle-outline",
        value: typeStats.find((t) => t.type === "correction")?.count || 0,
        avgScore: typeStats.find((t) => t.type === "correction")?.avg_score || 0,
        color: "#f59e0b" 
      },
    ];

    // Add demo data if no real data exists
    if (stats.totalActivities === 0) {
      skills[0].value = 12; skills[0].avgScore = 75;
      skills[1].value = 8;  skills[1].avgScore = 68;
      skills[2].value = 15; skills[2].avgScore = 82;
      skills[3].value = 5;  skills[3].avgScore = 90;
    }

    const totalActivities = skills.reduce((sum, s) => sum + s.value, 0);
    const maxValue = Math.max(...skills.map((s) => s.value), 1);

    return (
      <View style={styles.skillBars}>
        {skills.map((skill, i) => {
          const percentage = totalActivities > 0 ? Math.round((skill.value / totalActivities) * 100) : 0;
          
          return (
            <View key={i} style={[styles.skillCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.skillHeader}>
                <View style={styles.skillTitleRow}>
                  <Ionicons name={skill.icon as any} size={20} color={skill.color} />
                  <Text style={[styles.skillLabel, { color: colors.text }]}>{skill.name}</Text>
                </View>
                <View style={styles.skillStats}>
                  <Text style={[styles.skillCount, { color: skill.color }]}>{skill.value}</Text>
                  <Text style={[styles.skillUnit, { color: colors.icon }]}>
                    {skill.value === 1 ? 'activity' : 'activities'}
                  </Text>
                </View>
              </View>
              <View style={styles.skillBarBg}>
                <View
                  style={[
                    styles.skillBarFill,
                    {
                      width: `${(skill.value / maxValue) * 100}%`,
                      backgroundColor: skill.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.skillFooter}>
                <Text style={[styles.skillPercentage, { color: colors.icon }]}>
                  {percentage}% of total activity
                </Text>
                {skill.avgScore > 0 && (
                  <Text style={[styles.skillAvgScore, { color: colors.icon }]}>
                    {Math.round(skill.avgScore)}% avg accuracy
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Your Progress</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Track your language learning journey
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.cardBackground }]}
              onPress={loadData}
            >
              <Ionicons name="refresh" size={24} color={colors.tint} />
            </TouchableOpacity>
            {stats.totalActivities === 0 && (
              <TouchableOpacity
                style={[styles.demoButton, { backgroundColor: colors.tint + "20" }]}
                onPress={generateDemoData}
              >
                <Ionicons name="sparkles" size={20} color={colors.tint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { 
            backgroundColor: theme === 'dark' ? '#451a03' : '#fef3c7',
            borderWidth: 1,
            borderColor: theme === 'dark' ? '#f59e0b40' : '#fbbf2460',
          }]}>
            <View style={styles.statCardGlow}>
              <Ionicons name="flame" size={32} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, { color: theme === 'dark' ? '#fbbf24' : '#92400e' }]}>{stats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme === 'dark' ? '#fbbf2490' : '#92400e90' }]}>Day Streak</Text>
            <Text style={[styles.statDescription, { color: theme === 'dark' ? '#fbbf2460' : '#92400e60' }]}>Keep it going!</Text>
          </View>
          <View style={[styles.statCard, { 
            backgroundColor: theme === 'dark' ? '#172554' : '#dbeafe',
            borderWidth: 1,
            borderColor: theme === 'dark' ? '#3b82f640' : '#60a5fa60',
          }]}>
            <View style={styles.statCardGlow}>
              <Ionicons name="star" size={32} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, { color: theme === 'dark' ? '#60a5fa' : '#1e40af' }]}>{xp}</Text>
            <Text style={[styles.statLabel, { color: theme === 'dark' ? '#60a5fa90' : '#1e40af90' }]}>Total XP</Text>
            <Text style={[styles.statDescription, { color: theme === 'dark' ? '#60a5fa60' : '#1e40af60' }]}>All-time earnings</Text>
          </View>
          <View style={[styles.statCard, { 
            backgroundColor: theme === 'dark' ? '#052e16' : '#dcfce7',
            borderWidth: 1,
            borderColor: theme === 'dark' ? '#22c55e40' : '#4ade8060',
          }]}>
            <View style={styles.statCardGlow}>
              <Ionicons name="library" size={32} color="#22c55e" />
            </View>
            <Text style={[styles.statValue, { color: theme === 'dark' ? '#4ade80' : '#166534' }]}>{phrasesCount}</Text>
            <Text style={[styles.statLabel, { color: theme === 'dark' ? '#4ade8090' : '#16653490' }]}>Phrases Saved</Text>
            <Text style={[styles.statDescription, { color: theme === 'dark' ? '#4ade8060' : '#16653460' }]}>In your library</Text>
          </View>
          <View style={[styles.statCard, { 
            backgroundColor: theme === 'dark' ? '#2e1065' : '#f3e8ff',
            borderWidth: 1,
            borderColor: theme === 'dark' ? '#8b5cf640' : '#a78bfa60',
          }]}>
            <View style={styles.statCardGlow}>
              <Ionicons name="checkmark-done" size={32} color="#8b5cf6" />
            </View>
            <Text style={[styles.statValue, { color: theme === 'dark' ? '#a78bfa' : '#5b21b6' }]}>{stats.totalActivities}</Text>
            <Text style={[styles.statLabel, { color: theme === 'dark' ? '#a78bfa90' : '#5b21b690' }]}>Total Activities</Text>
            <Text style={[styles.statDescription, { color: theme === 'dark' ? '#a78bfa60' : '#5b21b660' }]}>All-time</Text>
          </View>
        </View>

        {/* AI Insight */}
        <View style={[styles.insightCard, { backgroundColor: colors.tint + "10" }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="bulb" size={24} color={colors.tint} />
            <Text style={[styles.insightTitle, { color: colors.text }]}>AI Insight</Text>
          </View>
          {aiInsight ? (
            <Text style={[styles.insightText, { color: colors.text }]}>{aiInsight}</Text>
          ) : (
            <TouchableOpacity
              style={[styles.insightButton, { backgroundColor: colors.tint }]}
              onPress={generateInsight}
              disabled={isLoadingInsight}
            >
              <Text style={styles.insightButtonText}>
                {isLoadingInsight ? "Analyzing..." : "Get Personalized Tip"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Activity Heatmap */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Activity (Last 4 Weeks)
          </Text>
          {renderHeatmap()}
          <View style={styles.heatmapLegend}>
            <Text style={[styles.legendText, { color: colors.icon }]}>Less</Text>
            {["#e5e7eb", "#bbf7d0", "#4ade80", "#22c55e", "#15803d"].map((c, i) => (
              <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
            ))}
            <Text style={[styles.legendText, { color: colors.icon }]}>More</Text>
          </View>
        </View>

        {/* Skill Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionWithDescription}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Activity Breakdown
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.icon }]}>
              Your learning activities from the last 7 days
            </Text>
          </View>
          {renderSkillBars()}
        </View>

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📉 Areas to Improve
            </Text>
            <View style={styles.weakAreasContainer}>
              {weakAreas.slice(0, 3).map((area, i) => (
                <View key={i} style={[styles.weakAreaCard, { backgroundColor: i === 0 ? '#fef2f2' : colors.cardBackground }]}>
                  <View style={styles.weakAreaHeader}>
                    <Text style={[styles.weakAreaName, { color: i === 0 ? '#dc2626' : colors.text }]}>
                      {area.area}
                    </Text>
                    {i === 0 && <Text style={styles.weakAreaBadge}>Focus</Text>}
                  </View>
                  <View style={styles.weakAreaBar}>
                    <View style={[styles.weakAreaFill, { width: `${area.score}%`, backgroundColor: i === 0 ? '#dc2626' : '#f59e0b' }]} />
                  </View>
                  <Text style={[styles.weakAreaScore, { color: colors.icon }]}>{area.score}% accuracy</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Accuracy Trend */}
        <View style={styles.section}>
          <View style={styles.sectionWithDescription}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📈 Accuracy Trend
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.icon }]}>
              Your performance over the last 7 days
            </Text>
          </View>
          
          {(() => {
            const trendData = accuracyTrend.length > 0 ? accuracyTrend : [
              { date: "12-08", accuracy: 65 },
              { date: "12-09", accuracy: 72 },
              { date: "12-10", accuracy: 68 },
              { date: "12-11", accuracy: 85 },
              { date: "12-12", accuracy: 78 },
              { date: "12-13", accuracy: 92 },
              { date: "12-14", accuracy: 88 },
            ];
            
            const avgAccuracy = trendData.reduce((sum, d) => sum + d.accuracy, 0) / trendData.length;
            const firstAccuracy = trendData[0]?.accuracy || 0;
            const lastAccuracy = trendData[trendData.length - 1]?.accuracy || 0;
            const trendChange = lastAccuracy - firstAccuracy;
            const trendDirection = trendChange > 5 ? "↑" : trendChange < -5 ? "↓" : "→";
            const trendColor = trendChange > 5 ? "#22c55e" : trendChange < -5 ? "#ef4444" : colors.icon;
            
            // Prepare data for LineChart
            const lineData = trendData.map((day) => ({
              value: day.accuracy,
              label: day.date.slice(-5),
              dataPointText: `${day.accuracy}%`,
            }));
            
            return (
              <>
                <View style={[styles.trendSummary, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.trendSummaryItem}>
                    <Text style={[styles.trendSummaryLabel, { color: colors.icon }]}>7-Day Average</Text>
                    <Text style={[styles.trendSummaryValue, { color: colors.text }]}>
                      {Math.round(avgAccuracy)}%
                    </Text>
                  </View>
                  <View style={styles.trendSummaryItem}>
                    <Text style={[styles.trendSummaryLabel, { color: colors.icon }]}>vs. Last Week</Text>
                    <Text style={[styles.trendSummaryValue, { color: trendColor }]}>
                      {trendDirection} {Math.abs(trendChange)}%
                    </Text>
                  </View>
                  <View style={styles.trendSummaryItem}>
                    <Text style={[styles.trendSummaryLabel, { color: colors.icon }]}>Today</Text>
                    <Text style={[styles.trendSummaryValue, { color: lastAccuracy >= 70 ? '#22c55e' : '#f59e0b' }]}>
                      {lastAccuracy}%
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.chartContainer, { backgroundColor: colors.cardBackground }]}>
                  <LineChart
                    data={lineData}
                    width={windowWidth - 100} // Full width minus padding
                    height={220} // Taller chart
                    spacing={(windowWidth - 140) / Math.max(lineData.length - 1, 1)} // Evenly distribute points
                    initialSpacing={20}
                    endSpacing={20}
                    thickness={3}
                    color="#3b82f6"
                    startFillColor="rgba(59, 130, 246, 0.3)"
                    endFillColor="rgba(59, 130, 246, 0.05)"
                    areaChart
                    curved
                    hideDataPoints={false}
                    dataPointsColor="#3b82f6"
                    dataPointsRadius={6}
                    textColor1={colors.icon}
                    textShiftY={-8}
                    textShiftX={-5}
                    textFontSize={11}
                    hideRules={false}
                    rulesType="solid"
                    yAxisColor={colors.icon + "40"}
                    xAxisColor={colors.icon + "40"}
                    yAxisTextStyle={{ color: colors.icon, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.icon, fontSize: 10 }}
                    noOfSections={4}
                    maxValue={100}
                    yAxisLabelPrefix=""
                    yAxisLabelSuffix="%"
                    showVerticalLines={false}
                    verticalLinesColor={colors.icon + "20"}
                    rulesColor={colors.icon + "15"}
                    yAxisThickness={1}
                    xAxisThickness={1}
                  />
                </View>
              </>
            );
          })()}
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🏆 Weekly Leaderboard
          </Text>
          <View style={[styles.leaderboardCard, { backgroundColor: colors.cardBackground }]}>
            {leaderboard.map((user, i) => (
              <View 
                key={i} 
                style={[
                  styles.leaderboardRow, 
                  (user as any).isUser && styles.leaderboardUserRow,
                  i < leaderboard.length - 1 && styles.leaderboardRowBorder
                ]}
              >
                <Text style={styles.leaderboardRank}>{user.rank}</Text>
                <Text style={styles.leaderboardAvatar}>{user.avatar}</Text>
                <Text style={[styles.leaderboardName, { color: (user as any).isUser ? colors.tint : colors.text }]}>
                  {user.name}
                </Text>
                <Text style={[styles.leaderboardXp, { color: colors.icon }]}>
                  {user.xp.toLocaleString()} XP
                </Text>
              </View>
            ))}
          </View>
        </View>



        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportButton, { borderColor: colors.tint }]}
          onPress={exportData}
        >
          <Ionicons name="download-outline" size={20} color={colors.tint} />
          <Text style={[styles.exportText, { color: colors.tint }]}>
            Export Progress (CSV)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    padding: Platform.OS === 'web' ? Spacing.lg : Spacing.md, 
    paddingTop: Platform.OS === 'web' ? Spacing.xxl : Spacing.lg, 
    paddingBottom: Spacing.xxl 
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start",
    marginBottom: Spacing.lg 
  },
  headerButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  refreshButton: {
    padding: Spacing.md,
    borderRadius: Radius.full,
    ...Shadows.sm,
  },
  demoButton: {
    padding: Spacing.md,
    borderRadius: Radius.full,
    ...Shadows.sm,
  },
  title: { 
    fontSize: Platform.OS === 'web' ? 28 : 24, 
    fontWeight: "bold", 
    marginBottom: Spacing.xs 
  },
  subtitle: { 
    fontSize: Platform.OS === 'web' ? 16 : 14, 
    marginBottom: Spacing.sm 
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: {
    width: "47%",
    padding: Platform.OS === 'web' ? Spacing.lg : Spacing.md,
    borderRadius: Radius.lg,
    alignItems: "center",
    ...Shadows.md,
  },
  statCardGlow: {
    marginBottom: Spacing.xs,
  },
  statValue: { 
    fontSize: Platform.OS === 'web' ? 28 : 22, 
    fontWeight: "bold", 
    marginVertical: Spacing.xs 
  },
  statLabel: { fontSize: 13, color: "#666", fontWeight: "600" },
  statDescription: { fontSize: 10, marginTop: 2, textAlign: "center" },
  insightCard: { padding: Spacing.lg, borderRadius: Radius.lg, marginBottom: Spacing.xl, ...Shadows.sm },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  insightTitle: { fontSize: 18, fontWeight: "bold" },
  insightText: { fontSize: 16, lineHeight: 24 },
  insightButton: { paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: "center" },
  insightButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: Spacing.xs },
  sectionDescription: { fontSize: 13, marginBottom: Spacing.lg },
  sectionWithDescription: { marginBottom: 0 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  heatmapGrid: { flexDirection: "column", gap: Spacing.xs },
  heatmapWeek: { flexDirection: "row", gap: Spacing.xs },
  heatmapCell: { flex: 1, aspectRatio: 1, borderRadius: Radius.sm },
  heatmapLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  legendCell: { width: 16, height: 16, borderRadius: Radius.sm },
  legendText: { fontSize: 11 },
  skillBars: { gap: Spacing.md },
  skillCard: { padding: Spacing.lg, borderRadius: Radius.md, ...Shadows.sm, marginBottom: Spacing.sm },
  skillHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  skillTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  skillStats: { flexDirection: "row", alignItems: "baseline", gap: Spacing.sm },
  skillLabel: { fontSize: 15, fontWeight: "600" },
  skillCount: { fontSize: 20, fontWeight: "bold" },
  skillUnit: { fontSize: 13 },
  skillPercentage: { fontSize: 12 },
  skillBarBg: { height: 8, backgroundColor: "#e5e7eb", borderRadius: Radius.sm, overflow: "hidden", marginBottom: Spacing.xs },
  skillBarFill: { height: "100%", borderRadius: Radius.sm },
  skillFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: Spacing.xs },
  skillAvgScore: { fontSize: 12 },
  levelCard: { padding: Spacing.lg, borderRadius: Radius.lg, marginBottom: Spacing.lg, ...Shadows.md },
  levelHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
  levelTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  levelXp: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  levelBar: { height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: Radius.sm, overflow: "hidden" },
  levelFill: { height: "100%", backgroundColor: "#fff", borderRadius: Radius.sm },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 2,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  exportText: { fontSize: 16, fontWeight: "600" },
  // Weak Areas styles
  weakAreasContainer: { gap: Spacing.md },
  weakAreaCard: { padding: Spacing.lg, borderRadius: Radius.md, ...Shadows.sm },
  weakAreaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  weakAreaName: { fontSize: 15, fontWeight: "600" },
  weakAreaBadge: { backgroundColor: "#dc2626", color: "#fff", fontSize: 10, fontWeight: "bold", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  weakAreaBar: { height: 8, backgroundColor: "#e5e7eb", borderRadius: Radius.sm, overflow: "hidden" },
  weakAreaFill: { height: "100%", borderRadius: Radius.sm },
  weakAreaScore: { fontSize: 12, marginTop: Spacing.xs },
  // Accuracy Trend styles
  trendSummary: { flexDirection: "row", justifyContent: "space-around", padding: Spacing.lg, borderRadius: Radius.md, marginBottom: Spacing.lg, ...Shadows.sm },
  trendSummaryItem: { alignItems: "center" },
  trendSummaryLabel: { fontSize: 11, marginBottom: Spacing.xs },
  trendSummaryValue: { fontSize: 20, fontWeight: "bold" },
  chartContainer: { 
    padding: Spacing.lg, 
    borderRadius: Radius.md, 
    marginTop: Spacing.sm, 
    ...Shadows.sm, 
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 280,
    overflow: "hidden",
  },
  trendContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 140, paddingTop: Spacing.md },
  trendBar: { flex: 1, alignItems: "center" },
  trendBarWrapper: { width: 24, height: 100, backgroundColor: "#e5e7eb", borderRadius: Radius.sm, overflow: "hidden", justifyContent: "flex-end" },
  trendBarFill: { width: "100%", borderRadius: Radius.sm },
  trendAccuracy: { fontSize: 11, fontWeight: "bold", marginTop: Spacing.xs },
  trendLabel: { fontSize: 9, marginTop: 2 },
  // Leaderboard styles
  leaderboardCard: { borderRadius: Radius.md, overflow: "hidden", ...Shadows.sm },
  leaderboardRow: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, gap: Spacing.md },
  leaderboardUserRow: { backgroundColor: "#dbeafe" },
  leaderboardRowBorder: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  leaderboardRank: { fontSize: 16, fontWeight: "bold", width: 24, color: "#6b7280" },
  leaderboardAvatar: { fontSize: 20 },
  leaderboardName: { flex: 1, fontSize: 15, fontWeight: "500" },
  leaderboardXp: { fontSize: 14 },
});
