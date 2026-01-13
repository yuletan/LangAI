/**
 * CEFR Type Definitions
 * TypeScript types for CEFR user profiles and placement testing
 * Based on implementation_plan.md specification
 */

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type CEFRSkillName = 
  | "listening" 
  | "reading" 
  | "spoken_interaction" 
  | "spoken_production" 
  | "writing";

export type CEFRDomain = "personal" | "public" | "occupational" | "educational";

export type LessonType = "CONSOLIDATION" | "BRIDGE_TO_NEXT" | "LEVEL_UP";

export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export type PlacementDecision = "PROMOTE" | "DEMOTE" | "STAY";

export type PlacementAction = "TEST_NEXT" | "FINALIZE";

/**
 * Skill History Entry
 */
export interface SkillHistoryEntry {
  date: string; // ISO8601
  event: string; // e.g., "placement_test", "assessment", "lesson_completed"
  result: string; // e.g., "B1", "B1+"
  previous_level?: string;
  confidence_score?: number;
}

/**
 * Individual Skill Data
 */
export interface CEFRSkill {
  level: CEFRLevel;
  plus_level: boolean; // True if level+
  confidence_score: number; // 0.0 to 1.0
  history: SkillHistoryEntry[];
}

/**
 * CEFR Profile (5 skills)
 */
export interface CEFRProfile {
  global_level: CEFRLevel;
  skills: {
    listening: CEFRSkill;
    reading: CEFRSkill;
    spoken_interaction: CEFRSkill;
    spoken_production: CEFRSkill;
    writing: CEFRSkill;
  };
}

/**
 * Bucket Test Status
 */
export interface BucketTestStatus {
  current_bucket: CEFRLevel | null;
  consecutive_correct: number;
  consecutive_wrong: number;
  adaptive_history: ("pass" | "fail")[];
}

/**
 * Placement State
 */
export interface PlacementState {
  self_assessment_complete: boolean;
  initial_seed_level: CEFRLevel | null;
  bucket_test_status: BucketTestStatus;
}

/**
 * Learning Preferences
 */
export interface LearningPreferences {
  goals: string[]; // e.g., ["work", "travel"]
  topics: string[]; // e.g., ["business", "daily_life"]
}

/**
 * Complete User Profile
 */
export interface UserCEFRProfile {
  user_id: string;
  cefr_profile: CEFRProfile;
  placement_state: PlacementState;
  learning_preferences: LearningPreferences;
}

/**
 * Placement Question
 */
export interface PlacementQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  skill: CEFRSkillName;
  cefr_level: CEFRLevel;
}

/**
 * User Response to Placement Question
 */
export interface PlacementResponse {
  question_id: string;
  user_answer: number;
  is_correct: boolean;
  confidence: ConfidenceLevel;
  time_taken_ms?: number;
}

/**
 * Bucket Evaluation Result
 */
export interface BucketEvaluation {
  decision: PlacementDecision;
  score: number;
  total: number;
  accuracy: number;
  message: string;
}

/**
 * Next Action in Placement
 */
export interface PlacementNextAction {
  action: PlacementAction;
  new_level?: CEFRLevel;
  new_index?: number;
  final_level?: CEFRLevel;
  plus_level?: boolean;
  confidence_score?: number;
  message: string;
  continue_testing: boolean;
}

/**
 * Placement Session
 */
export interface PlacementSession {
  session_id: string;
  user_id: string;
  language: string;
  skill: CEFRSkillName;
  bucket_state: {
    phase: "SELF_ASSESSMENT" | "BUCKET_TEST";
    skill: CEFRSkillName;
    current_difficulty: CEFRLevel;
    current_bucket_index: number;
    questions_per_bucket: number;
    responses: PlacementResponse[];
    adaptive_history: Array<{
      level: CEFRLevel;
      decision: PlacementDecision;
      score: number;
      accuracy: number;
    }>;
  };
  current_questions: PlacementQuestion[];
  started_at: string;
  status: "IN_PROGRESS" | "COMPLETED";
  last_evaluation?: BucketEvaluation;
  next_action?: PlacementNextAction;
  final_result?: {
    level: CEFRLevel;
    plus_level: boolean;
    confidence_score: number;
    skill: CEFRSkillName;
    completed_at: string;
  };
}

/**
 * Self-Assessment Descriptors
 */
export interface SelfAssessmentDescriptor {
  level: CEFRLevel;
  description: string;
}

/**
 * CEFR Content Metadata
 */
export interface CEFRContentMetadata {
  level: CEFRLevel;
  domain: CEFRDomain;
  vocabulary_focus: string[];
  grammar_structures: string[];
  cultural_notes?: string;
}

/**
 * Quiz Item
 */
export interface QuizItem {
  question: string;
  options: string[];
  correct_index: number;
  cefr_justification: string;
}

/**
 * Generated Content
 */
export interface GeneratedContent {
  scenario_text: string;
  english_translation: string;
  cefr_metadata: CEFRContentMetadata;
  quiz_items: QuizItem[];
}

/**
 * Lesson Recommendation
 */
export interface LessonRecommendation {
  target_skill: CEFRSkillName;
  current_level: CEFRLevel;
  target_level: string; // Can be "B1", "B1+", etc.
  lesson_type: LessonType;
  confidence_score: number;
  domains: string[];
}

/**
 * Vocabulary Item
 */
export interface VocabularyItem {
  word: string;
  translation: string;
  part_of_speech: string;
  example_sentence: string;
  example_translation: string;
  cefr_level: CEFRLevel;
}

/**
 * Assessment Breakdown
 */
export interface AssessmentBreakdown {
  range: {
    score: number;
    feedback: string;
  };
  accuracy: {
    score: number;
    feedback: string;
  };
  fluency: {
    score: number;
    feedback: string;
  };
  coherence: {
    score: number;
    feedback: string;
  };
}

/**
 * Error Correction
 */
export interface ErrorCorrection {
  error: string;
  correction: string;
  explanation: string;
}

/**
 * Assessment Result
 */
export interface AssessmentResult {
  overall_score: number;
  level_achieved: CEFRLevel;
  meets_target_level: boolean;
  breakdown: AssessmentBreakdown;
  strengths: string[];
  areas_for_improvement: string[];
  specific_errors: ErrorCorrection[];
  next_steps: string;
}

/**
 * Quiz Evaluation Result
 */
export interface QuizEvaluationResult {
  total_score: number;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  results: Array<{
    question_id: string;
    is_correct: boolean;
    points_earned: number;
    max_points: number;
    confidence: ConfidenceLevel;
  }>;
  level_mastery: {
    status: "MASTERED" | "PROFICIENT" | "DEVELOPING" | "NEEDS_WORK";
    message: string;
    ready_for_next: boolean;
    suggestion?: string;
  };
  recommendation: {
    action: "LEVEL_UP" | "PLUS_LEVEL" | "REVIEW" | "CONTINUE";
    next_level: string;
    message: string;
  };
}

/**
 * Complete Lesson
 */
export interface CompleteLesson {
  lesson_id: string;
  target_level: CEFRLevel;
  language: string;
  skill: CEFRSkillName;
  lesson_type: LessonType;
  main_content: GeneratedContent;
  vocabulary_support: VocabularyItem[] | null;
  metadata: {
    domain: string;
    generated_at: string;
    estimated_duration_minutes: number;
  };
}

/**
 * API Response Wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    source?: string;
  };
}
