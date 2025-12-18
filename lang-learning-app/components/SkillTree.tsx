import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CEFRColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SkillNode {
  id: string;
  title: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  icon: string;
  unlocked: boolean;
  completed: boolean;
  xpRequired: number;
}

interface SkillTreeProps {
  currentXP: number;
  currentLevel: string;
  onNodePress?: (node: SkillNode) => void;
}

const SKILL_NODES: SkillNode[] = [
  // A1 Level
  { id: "present_tense", title: "Present Tense", level: "A1", icon: "time-outline", unlocked: true, completed: false, xpRequired: 0 },
  { id: "basic_nouns", title: "Basic Nouns", level: "A1", icon: "cube-outline", unlocked: true, completed: false, xpRequired: 0 },
  // A2 Level
  { id: "past_tense", title: "Past Tense", level: "A2", icon: "arrow-back-outline", unlocked: false, completed: false, xpRequired: 100 },
  { id: "adjectives", title: "Adjectives", level: "A2", icon: "color-palette-outline", unlocked: false, completed: false, xpRequired: 150 },
  // B1 Level
  { id: "future_tense", title: "Future Tense", level: "B1", icon: "arrow-forward-outline", unlocked: false, completed: false, xpRequired: 300 },
  { id: "compound_sents", title: "Compound Sentences", level: "B1", icon: "git-merge-outline", unlocked: false, completed: false, xpRequired: 400 },
  // B2 Level
  { id: "subjunctive", title: "Subjunctive Mood", level: "B2", icon: "help-circle-outline", unlocked: false, completed: false, xpRequired: 600 },
  { id: "idioms", title: "Common Idioms", level: "B2", icon: "chatbubble-ellipses-outline", unlocked: false, completed: false, xpRequired: 750 },
  // C1 Level
  { id: "passive_voice", title: "Passive Voice", level: "C1", icon: "swap-horizontal-outline", unlocked: false, completed: false, xpRequired: 1000 },
  { id: "advanced_connectors", title: "Advanced Connectors", level: "C1", icon: "link-outline", unlocked: false, completed: false, xpRequired: 1200 },
];

export default function SkillTree({ currentXP, currentLevel, onNodePress }: SkillTreeProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  
  const getNodeStatus = (node: SkillNode) => {
    if (node.xpRequired <= currentXP) {
      return { unlocked: true, completed: node.xpRequired < currentXP * 0.7 };
    }
    return { unlocked: false, completed: false };
  };

  const renderLevel = (level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2") => {
    const levelNodes = SKILL_NODES.filter(n => n.level === level);
    const levelColor = CEFRColors[level];

    return (
      <View key={level} style={styles.levelRow}>
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <View style={styles.nodesContainer}>
          {levelNodes.map((node) => {
            const status = getNodeStatus(node);
            return (
              <TouchableOpacity
                key={node.id}
                style={[
                  styles.node,
                  { 
                    backgroundColor: status.unlocked 
                      ? levelColor + "20" 
                      : isDark ? "#1e293b" : "#f1f5f9",
                    borderColor: status.unlocked 
                      ? levelColor 
                      : isDark ? "#334155" : "#e2e8f0",
                  },
                  status.completed && styles.completedNode,
                  !status.unlocked && styles.lockedNode,
                ]}
                onPress={() => status.unlocked && onNodePress?.(node)}
                disabled={!status.unlocked}
              >
                <View style={[styles.nodeIcon, { backgroundColor: status.unlocked ? levelColor : isDark ? "#475569" : "#cbd5e1" }]}>
                  <Ionicons 
                    name={node.icon as any} 
                    size={18} 
                    color={status.unlocked ? "#fff" : isDark ? "#94a3b8" : "#94a3b8"} 
                  />
                </View>
                <Text 
                  style={[
                    styles.nodeTitle, 
                    { color: status.unlocked ? colors.text : colors.muted }
                  ]}
                  numberOfLines={2}
                >
                  {node.title}
                </Text>
                {status.completed && (
                  <View style={[styles.checkmark, { backgroundColor: levelColor }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
                {!status.unlocked && (
                  <View style={[styles.lockOverlay, { backgroundColor: isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.8)" }]}>
                    <Ionicons name="lock-closed" size={14} color={isDark ? "#64748b" : "#94a3b8"} />
                    <Text style={[styles.xpRequired, { color: isDark ? "#94a3b8" : "#64748b" }]}>{node.xpRequired} XP</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🌳 Skill Tree</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          Progress through grammar skills
        </Text>
      </View>
      
      <View style={styles.progressInfo}>
        <Text style={[styles.progressText, { color: colors.tint }]}>
          Your XP: {currentXP} | Level: {currentLevel}
        </Text>
      </View>

      <View style={styles.tree}>
        {/* Connector line */}
        <View style={[styles.connector, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]} />
        
        {renderLevel("A1")}
        {renderLevel("A2")}
        {renderLevel("B1")}
        {renderLevel("B2")}
        {renderLevel("C1")}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  progressInfo: {
    marginBottom: 20,
    alignItems: "center",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
  },
  tree: {
    flex: 1,
    position: "relative",
    paddingLeft: 70,
    paddingRight: 20,
  },
  connector: {
    position: "absolute",
    left: 35,
    top: 30,
    bottom: 30,
    width: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 30,
    minHeight: 120,
  },
  levelBadge: {
    position: "absolute",
    left: -55,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  nodesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    flex: 1,
    justifyContent: "space-between",
  },
  node: {
    width: (SCREEN_WIDTH - 140) / 2,
    minHeight: 100,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedNode: {
    borderWidth: 3,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  lockedNode: {
    opacity: 0.6,
  },
  nodeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  nodeTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  checkmark: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  xpRequired: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },
});
