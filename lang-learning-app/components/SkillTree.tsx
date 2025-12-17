import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, CEFRColors } from "@/constants/theme";

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
  const colors = Colors["light"];
  
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
                    backgroundColor: status.unlocked ? levelColor + "20" : "#f1f5f9",
                    borderColor: status.unlocked ? levelColor : "#e2e8f0",
                  },
                  status.completed && styles.completedNode,
                  !status.unlocked && styles.lockedNode,
                ]}
                onPress={() => status.unlocked && onNodePress?.(node)}
                disabled={!status.unlocked}
              >
                <View style={[styles.nodeIcon, { backgroundColor: status.unlocked ? levelColor : "#cbd5e1" }]}>
                  <Ionicons 
                    name={node.icon as any} 
                    size={18} 
                    color={status.unlocked ? "#fff" : "#94a3b8"} 
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
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={14} color="#94a3b8" />
                    <Text style={styles.xpRequired}>{node.xpRequired} XP</Text>
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
        <View style={styles.connector} />
        
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
    marginVertical: 20,
  },
  header: {
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  progressInfo: {
    marginBottom: 15,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tree: {
    position: "relative",
    paddingLeft: 60,
  },
  connector: {
    position: "absolute",
    left: 30,
    top: 25,
    bottom: 25,
    width: 3,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  levelBadge: {
    position: "absolute",
    left: -50,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  levelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  nodesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    flex: 1,
  },
  node: {
    width: (SCREEN_WIDTH - 100) / 2 - 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    position: "relative",
  },
  completedNode: {
    borderWidth: 3,
  },
  lockedNode: {
    opacity: 0.7,
  },
  nodeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  nodeTitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  xpRequired: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
});
