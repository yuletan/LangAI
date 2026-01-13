/**
 * CEFR Assessment Service
 * Evaluates user performance based on CEFR Table 3 (Qualitative Aspects)
 * Based on implementation_plan.md specification
 */

const AIService = require("./AIService");

/**
 * Assessment/Scoring System Prompt (from implementation_plan.md)
 * This prompt is used verbatim as specified
 */
const ASSESSMENT_SYSTEM_PROMPT = `You are a CEFR Assessor. Analyze the user's input based on **CEFR Table 3 (Qualitative Aspects of Spoken Language Use)**.

Target Level: {{TARGET_LEVEL}}

### SCORING RUBRIC:
1. **Range**: Has the user used adequate vocabulary for {{TARGET_LEVEL}}?
2. **Accuracy**: 
   - For A1-A2: Focus on basic syntax and simple grammatical control.
   - For B1-B2: Focus on maintaining control in longer/complex sentences.
   - For C1-C2: Penalize minor slips.
3. **Fluency**: Can the user keep going? (Ignore pauses for A1/A2, penalize significantly for C1).
4. **Coherence**: Linking of sentences.

### TASK:
Evaluate User Input: "{{USER_INPUT}}"
Context: "{{QUESTION_CONTEXT}}"

Return a JSON score (0-100) and specific feedback based *only* on the criteria relevant to {{TARGET_LEVEL}}. Do not penalize A2 users for lack of B2 nuance.`;

/**
 * CEFR Table 3: Qualitative Aspects Criteria
 * Defines what to assess at each level
 */
const QUALITATIVE_CRITERIA = {
  A1: {
    range: "Basic repertoire of words and simple phrases",
    accuracy: "Limited control of simple grammatical structures",
    fluency: "Very short utterances with pauses and false starts",
    coherence: "Links words with simple connectors like 'and' or 'then'"
  },
  A2: {
    range: "Repertoire of frequently used expressions related to familiar situations",
    accuracy: "Reasonable accuracy in familiar contexts",
    fluency: "Short stretches of language, though pauses are evident",
    coherence: "Links groups of words with simple connectors"
  },
  B1: {
    range: "Enough language to get by, with sufficient vocabulary to express oneself",
    accuracy: "Reasonable accuracy in familiar situations, though errors occur",
    fluency: "Can keep going comprehensibly, though pausing is evident",
    coherence: "Can link ideas with common connectors"
  },
  B2: {
    range: "Sufficient range to provide clear descriptions and express viewpoints",
    accuracy: "Good grammatical control, though errors may occur",
    fluency: "Can produce stretches of language with fairly even tempo",
    coherence: "Can use cohesive devices to create clear, coherent discourse"
  },
  C1: {
    range: "Good command of broad range of language to formulate thoughts precisely",
    accuracy: "Consistently maintains high degree of grammatical accuracy",
    fluency: "Can express oneself fluently and spontaneously",
    coherence: "Can produce clear, smoothly flowing, well-structured speech"
  },
  C2: {
    range: "Can exploit full range of language for precision and emphasis",
    accuracy: "Maintains consistent grammatical control of complex language",
    fluency: "Can express oneself at length with natural, effortless flow",
    coherence: "Can create coherent and cohesive discourse with full command"
  }
};

/**
 * Assesses user input against CEFR criteria
 * @param {string} userInput - User's response (text or transcribed speech)
 * @param {string} targetLevel - Expected CEFR level
 * @param {string} questionContext - Context of the question/task
 * @param {string} skill - Skill being assessed (writing, speaking, etc.)
 * @returns {Promise<Object>} Assessment result with score and feedback
 */
async function assessUserResponse(userInput, targetLevel, questionContext, skill = "writing") {
  // Prepare system prompt with variables
  const systemPrompt = ASSESSMENT_SYSTEM_PROMPT
    .replace(/{{TARGET_LEVEL}}/g, targetLevel)
    .replace(/{{USER_INPUT}}/g, userInput)
    .replace(/{{QUESTION_CONTEXT}}/g, questionContext);
  
  const criteria = QUALITATIVE_CRITERIA[targetLevel] || QUALITATIVE_CRITERIA.A1;
  
  const userPrompt = `Assess this ${skill} response for ${targetLevel} level:

User Input: "${userInput}"
Context: "${questionContext}"

Evaluation Criteria for ${targetLevel}:
- Range: ${criteria.range}
- Accuracy: ${criteria.accuracy}
- Fluency: ${criteria.fluency}
- Coherence: ${criteria.coherence}

Provide assessment in JSON format:
{
  "overall_score": 0-100,
  "level_achieved": "A1/A2/B1/B2/C1/C2",
  "meets_target_level": true/false,
  "breakdown": {
    "range": {
      "score": 0-100,
      "feedback": "Specific feedback on vocabulary range"
    },
    "accuracy": {
      "score": 0-100,
      "feedback": "Specific feedback on grammatical accuracy"
    },
    "fluency": {
      "score": 0-100,
      "feedback": "Specific feedback on fluency (if applicable)"
    },
    "coherence": {
      "score": 0-100,
      "feedback": "Specific feedback on coherence and cohesion"
    }
  },
  "strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1", "area 2"],
  "specific_errors": [
    {
      "error": "Specific error in user input",
      "correction": "Corrected version",
      "explanation": "Why this is important for ${targetLevel}"
    }
  ],
  "next_steps": "Actionable advice for improvement"
}`;

  try {
    const { json, usedSource } = await AIService.generateWithRetry(
      userPrompt,
      2000,
      "CEFR Assessment",
      systemPrompt
    );
    
    return {
      assessment: json,
      metadata: {
        target_level: targetLevel,
        skill: skill,
        assessed_at: new Date().toISOString(),
        source: usedSource
      }
    };
  } catch (error) {
    console.error("Failed to assess user response:", error);
    throw error;
  }
}

/**
 * Evaluates quiz/test answers with confidence weighting
 * @param {Array} questions - Array of questions with user answers
 * @param {string} targetLevel - Target CEFR level
 * @returns {Object} Evaluation result
 */
function evaluateQuizAnswers(questions, targetLevel) {
  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  const results = [];
  
  for (const question of questions) {
    const isCorrect = question.user_answer === question.correct_index;
    let points = 0;
    let maxPoints = 1;
    
    if (isCorrect) {
      points = 1;
      correctCount++;
      
      // Confidence bonus (if provided)
      if (question.confidence === "HIGH") {
        points *= 1.2;
        maxPoints = 1.2;
      }
    } else {
      // Confidence penalty for wrong answers
      if (question.confidence === "HIGH") {
        points = -0.5;
      }
    }
    
    totalScore += points;
    maxScore += maxPoints;
    
    results.push({
      question_id: question.id,
      is_correct: isCorrect,
      points_earned: points,
      max_points: maxPoints,
      confidence: question.confidence || "MEDIUM"
    });
  }
  
  // Normalize score to 0-100
  const normalizedScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const accuracy = questions.length > 0 ? correctCount / questions.length : 0;
  
  return {
    total_score: Math.max(0, normalizedScore),
    accuracy: accuracy,
    correct_count: correctCount,
    total_questions: questions.length,
    results: results,
    level_mastery: getLevelMastery(normalizedScore, targetLevel),
    recommendation: getRecommendation(normalizedScore, accuracy, targetLevel)
  };
}

/**
 * Determines level mastery based on score
 * @param {number} score - Normalized score (0-100)
 * @param {string} targetLevel - Target CEFR level
 * @returns {Object} Mastery assessment
 */
function getLevelMastery(score, targetLevel) {
  if (score >= 85) {
    return {
      status: "MASTERED",
      message: `Excellent! You've mastered ${targetLevel} level.`,
      ready_for_next: true
    };
  } else if (score >= 70) {
    return {
      status: "PROFICIENT",
      message: `Good work! You're proficient at ${targetLevel} level.`,
      ready_for_next: false,
      suggestion: "A bit more practice and you'll be ready for the next level."
    };
  } else if (score >= 50) {
    return {
      status: "DEVELOPING",
      message: `You're developing ${targetLevel} skills.`,
      ready_for_next: false,
      suggestion: "Keep practicing to strengthen your understanding."
    };
  } else {
    return {
      status: "NEEDS_WORK",
      message: `This level is challenging for you right now.`,
      ready_for_next: false,
      suggestion: "Consider reviewing lower level content to build a stronger foundation."
    };
  }
}

/**
 * Provides recommendation based on performance
 * @param {number} score - Normalized score
 * @param {number} accuracy - Accuracy percentage
 * @param {string} targetLevel - Target CEFR level
 * @returns {Object} Recommendation
 */
function getRecommendation(score, accuracy, targetLevel) {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const currentIndex = levels.indexOf(targetLevel);
  
  if (score >= 85 && accuracy >= 0.85) {
    // Ready for next level
    const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : targetLevel;
    return {
      action: "LEVEL_UP",
      next_level: nextLevel,
      message: `You're ready to advance to ${nextLevel}!`
    };
  } else if (score >= 70 && accuracy >= 0.7) {
    // Plus level
    return {
      action: "PLUS_LEVEL",
      next_level: `${targetLevel}+`,
      message: `You're performing well! Try ${targetLevel}+ content for a challenge.`
    };
  } else if (score < 50) {
    // May need to review
    return {
      action: "REVIEW",
      next_level: targetLevel,
      message: "Focus on consolidating your current level before moving forward."
    };
  } else {
    // Continue at current level
    return {
      action: "CONTINUE",
      next_level: targetLevel,
      message: "Keep practicing at this level to build confidence."
    };
  }
}

/**
 * Assesses writing with detailed feedback
 * @param {string} writingText - User's writing
 * @param {string} targetLevel - Target CEFR level
 * @param {string} prompt - Writing prompt/task
 * @returns {Promise<Object>} Detailed assessment
 */
async function assessWriting(writingText, targetLevel, prompt) {
  return await assessUserResponse(writingText, targetLevel, prompt, "writing");
}

/**
 * Assesses speaking (from transcription)
 * @param {string} transcription - Transcribed speech
 * @param {string} targetLevel - Target CEFR level
 * @param {string} prompt - Speaking prompt/task
 * @returns {Promise<Object>} Detailed assessment
 */
async function assessSpeaking(transcription, targetLevel, prompt) {
  return await assessUserResponse(transcription, targetLevel, prompt, "speaking");
}

/**
 * Quick assessment for multiple choice/short answers
 * @param {string} answer - User's answer
 * @param {string} correctAnswer - Correct answer
 * @param {string} explanation - Explanation of correct answer
 * @returns {Object} Quick assessment result
 */
function quickAssess(answer, correctAnswer, explanation) {
  const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  
  return {
    is_correct: isCorrect,
    user_answer: answer,
    correct_answer: correctAnswer,
    explanation: explanation,
    feedback: isCorrect 
      ? "Correct! " + explanation 
      : `Not quite. The correct answer is "${correctAnswer}". ${explanation}`
  };
}

module.exports = {
  assessUserResponse,
  evaluateQuizAnswers,
  assessWriting,
  assessSpeaking,
  quickAssess,
  getLevelMastery,
  getRecommendation,
  ASSESSMENT_SYSTEM_PROMPT,
  QUALITATIVE_CRITERIA
};
