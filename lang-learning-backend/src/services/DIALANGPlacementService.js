/**
 * DIALANG Placement Service
 * Implements adaptive placement testing with confidence weighting
 * Based on implementation_plan.md specification
 */

const AIService = require("./AIService");
const CEFRProfileService = require("./CEFRProfileService");

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Table 2: Self-Assessment Descriptors (from CEFR framework)
const SELF_ASSESSMENT_DESCRIPTORS = {
  A1: "I can understand familiar words and very basic phrases concerning myself, my family and immediate concrete surroundings when people speak slowly and clearly.",
  A2: "I can understand phrases and the highest frequency vocabulary related to areas of most immediate personal relevance (e.g. very basic personal and family information, shopping, local area, employment).",
  B1: "I can understand the main points of clear standard speech on familiar matters regularly encountered in work, school, leisure, etc. I can understand the main point of many radio or TV programmes on current affairs or topics of personal or professional interest when the delivery is relatively slow and clear.",
  B2: "I can understand extended speech and lectures and follow even complex lines of argument provided the topic is reasonably familiar. I can understand most TV news and current affairs programmes. I can understand the majority of films in standard dialect.",
  C1: "I can understand extended speech even when it is not clearly structured and when relationships are only implied and not signalled explicitly. I can understand television programmes and films without too much effort.",
  C2: "I have no difficulty in understanding any kind of spoken language, whether live or broadcast, even when delivered at fast native speed, provided I have some time to get familiar with the accent."
};

/**
 * Phase 1: Self-Assessment Seeding
 * Shows CEFR descriptors and gets user's self-assessment
 * @param {string} skill - Target skill (listening, reading, etc.)
 * @returns {Object} Self-assessment data with descriptors
 */
function startPlacement(skill = "listening") {
  return {
    phase: "SELF_ASSESSMENT",
    skill: skill,
    descriptors: SELF_ASSESSMENT_DESCRIPTORS,
    instructions: "Please select the level that best describes your current ability. Be honest - this helps us find your starting point quickly."
  };
}

/**
 * Initialize bucket testing based on self-assessment
 * @param {string} userSelection - User's self-assessed level (e.g., "B1")
 * @param {string} skill - Target skill
 * @returns {Object} Initial bucket test configuration
 */
function initBucketTest(userSelection, skill) {
  const levelIndex = CEFR_LEVELS.indexOf(userSelection);
  
  // Start at self-assessed level
  return {
    phase: "BUCKET_TEST",
    skill: skill,
    current_difficulty: userSelection,
    current_bucket_index: levelIndex,
    questions_per_bucket: 5,
    responses: [],
    adaptive_history: []
  };
}

/**
 * Phase 2: Bucket Testing with Confidence Weighting
 * Evaluates user responses with metacognition weighting
 * @param {Array} responses - Array of question responses
 * @returns {Object} Evaluation result with next action
 */
function evaluateBucket(responses) {
  let score = 0;
  
  for (const question of responses) {
    let points = 0;
    
    // Basic correctness
    if (question.is_correct) {
      points = 1;
    } else {
      points = 0;
    }
    
    // Confidence Weighting (Metacognition)
    // High confidence + Correct = Bonus
    // High confidence + Wrong = Penalty (prevents lucky guesses)
    if (question.is_correct && question.confidence === "HIGH") {
      points *= 1.2; // 20% bonus for confident correct answers
    } else if (!question.is_correct && question.confidence === "HIGH") {
      points -= 0.5; // Penalty for overconfidence
    }
    
    score += points;
  }
  
  // Decision Logic (replaces simple 2-question rule)
  // Assuming 5-question bucket
  const totalQuestions = responses.length;
  
  if (score >= 4.5) {
    return {
      decision: "PROMOTE",
      score: score,
      total: totalQuestions,
      accuracy: score / totalQuestions,
      message: "Strong performance! Moving to next level."
    };
  } else if (score <= 2.5) {
    return {
      decision: "DEMOTE",
      score: score,
      total: totalQuestions,
      accuracy: score / totalQuestions,
      message: "Let's try an easier level to build confidence."
    };
  } else {
    return {
      decision: "STAY",
      score: score,
      total: totalQuestions,
      accuracy: score / totalQuestions,
      message: "Good! This level matches your ability."
    };
  }
}

/**
 * Determines next action in adaptive testing
 * @param {Object} bucketState - Current bucket test state
 * @param {Object} evaluation - Evaluation result from evaluateBucket
 * @returns {Object} Next action and updated state
 */
function getNextAction(bucketState, evaluation) {
  const currentIndex = bucketState.current_bucket_index;
  
  bucketState.adaptive_history.push({
    level: CEFR_LEVELS[currentIndex],
    decision: evaluation.decision,
    score: evaluation.score,
    accuracy: evaluation.accuracy
  });
  
  if (evaluation.decision === "PROMOTE") {
    // Move up one level
    if (currentIndex < CEFR_LEVELS.length - 1) {
      return {
        action: "TEST_NEXT",
        new_level: CEFR_LEVELS[currentIndex + 1],
        new_index: currentIndex + 1,
        message: evaluation.message,
        continue_testing: true
      };
    } else {
      // Already at C2
      return {
        action: "FINALIZE",
        final_level: "C2",
        plus_level: true,
        confidence_score: 0.95,
        message: "Excellent! You've demonstrated C2 level proficiency.",
        continue_testing: false
      };
    }
  } else if (evaluation.decision === "DEMOTE") {
    // Move down one level and finalize
    const finalLevel = currentIndex > 0 ? CEFR_LEVELS[currentIndex - 1] : "A1";
    const plusLevel = evaluation.accuracy > 0.3; // Partial competence
    
    return {
      action: "FINALIZE",
      final_level: finalLevel,
      plus_level: plusLevel,
      confidence_score: evaluation.accuracy,
      message: evaluation.message,
      continue_testing: false
    };
  } else {
    // STAY - finalize at current level
    const plusLevel = evaluation.accuracy >= 0.7; // Strong performance = plus level
    
    return {
      action: "FINALIZE",
      final_level: CEFR_LEVELS[currentIndex],
      plus_level: plusLevel,
      confidence_score: evaluation.accuracy,
      message: evaluation.message,
      continue_testing: false
    };
  }
}

/**
 * Generates placement test questions for a specific level
 * Uses AI with CEFR-aligned prompts
 * @param {string} level - CEFR level
 * @param {string} language - Target language
 * @param {string} skill - Target skill
 * @returns {Promise<Array>} Array of questions
 */
async function generatePlacementQuestions(level, language, skill = "listening") {
  // FORCE LISTENING for audio testing as requested


  const systemPrompt = `You are a strict JSON Data Generator for a language placement test.
You must return VALID JSON only.

### 🔴 CRITICAL RULES:

1. **MULTIPLE SCENARIOS**: 
   - Generate **20 QUESTIONS** total.
   - You can use multiple scripts/passages if needed (e.g., 4-5 scripts with 4-5 questions each).
   
2. **AUDIO SCRIPT SEPARATION**: 
   - Put the text in the "master_audio_script" field.
   - **NEVER** include the script text in the "questions".

3. **STRICT IMMERSION**:
   - **NO ENGLISH** in Questions or Options.
   - **Questions**: Short, direct, in ${language}.
   - **Options**: 100% in ${language}.
   - **A1/A2 ONLY**: Add Romanization in parens for non-Latin scripts.

### ✅ OUTPUT FORMAT (MUST generate EXACTLY 5 questions):
{
  "master_audio_script": "Full conversation text here in ${language}...",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Q1...",
      "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
      "correct_index": 0,
      "skill": "listening"
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "question": "Q2...",
      "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
      "correct_index": 1,
      "skill": "listening"
    }
  ]
} (Continue for 5 questions total)`;

  const userPrompt = `Generate a standard placement test block for ${level} level.
  1. Create natural conversations/monologues suitable for ${level}.
  2. Create 5 different questions testing different aspects (gist, detail, vocabulary).
  3. Shared passages/scripts should have multiple questions (2-3 each).
  4. Strict No English.`;

  try {
    const { json, usedSource } = await AIService.generateWithRetry(
      userPrompt,
      4000, // Higher token limit for the batch
      "Placement Test Generation",
      systemPrompt
    );

    // Post-processing: Distribute the master script to each question
    const processedQuestions = (json.questions || []).map(q => ({
      ...q,
      // Attach the master script to the individual question so the UI can play it
      audio_script: json.master_audio_script || q.audio_script, 
      id: q.id || `placement_${Date.now()}_${Math.random().toString(36).substr(2,9)}`
    }));

    return { questions: processedQuestions, source: usedSource };

  } catch (error) {
    console.error("Failed to generate placement questions:", error);
    // Fallback?
    return []; 
  }
}

/**
 * Complete placement test flow
 * @param {string} userId - User ID
 * @param {string} selfAssessedLevel - User's self-assessment
 * @param {string} language - Target language
 * @param {string} skill - Target skill
 * @returns {Promise<Object>} Placement test session
 */
async function createPlacementSession(userId, selfAssessedLevel, language, skill = "listening") {
  const bucketState = initBucketTest(selfAssessedLevel, skill);
  
  // Generate initial questions
  const questionData = await generatePlacementQuestions(
    selfAssessedLevel,
    language,
    skill
  );
  
  return {
    session_id: `placement_${userId}_${Date.now()}`,
    user_id: userId,
    language: language,
    skill: skill,
    bucket_state: bucketState,
    current_questions: questionData.questions,
    started_at: new Date().toISOString(),
    status: "IN_PROGRESS"
  };
}

/**
 * Process user responses and determine next step
 * @param {Object} session - Placement session
 * @param {Array} responses - User responses with confidence
 * @param {string} language - Target language
 * @returns {Promise<Object>} Updated session with next action
 */
async function processResponses(session, responses, language) {
  // Evaluate current bucket
  const evaluation = evaluateBucket(responses);
  
  // Get next action
  const nextAction = getNextAction(session.bucket_state, evaluation);
  
  // Update session
  session.bucket_state.responses.push(...responses);
  session.last_evaluation = evaluation;
  session.next_action = nextAction;
  
  if (nextAction.continue_testing) {
    // Generate questions for next level
    session.bucket_state.current_difficulty = nextAction.new_level;
    session.bucket_state.current_bucket_index = nextAction.new_index;
    
    const questionData = await generatePlacementQuestions(
      nextAction.new_level,
      language,
      session.skill
    );
    
    session.current_questions = questionData.questions;
  } else {
    // Finalize placement
    session.status = "COMPLETED";
    session.final_result = {
      level: nextAction.final_level,
      plus_level: nextAction.plus_level,
      confidence_score: nextAction.confidence_score,
      skill: session.skill,
      completed_at: new Date().toISOString()
    };
  }
  
  return session;
}

/**
 * Finalize placement and update user profile
 * @param {Object} session - Completed placement session
 * @param {Object} userProfile - User's CEFR profile
 * @returns {Object} Updated user profile
 */
function finalizePlacement(session, userProfile) {
  const result = session.final_result;
  
  // Update skill in profile
  CEFRProfileService.updateSkillLevel(
    userProfile,
    session.skill,
    result.level,
    result.plus_level,
    result.confidence_score,
    "placement_test"
  );
  
  // Update placement state
  userProfile.placement_state.self_assessment_complete = true;
  userProfile.placement_state.initial_seed_level = session.bucket_state.current_difficulty;
  
  return userProfile;
}

module.exports = {
  startPlacement,
  initBucketTest,
  evaluateBucket,
  getNextAction,
  generatePlacementQuestions,
  createPlacementSession,
  processResponses,
  finalizePlacement,
  SELF_ASSESSMENT_DESCRIPTORS
};
