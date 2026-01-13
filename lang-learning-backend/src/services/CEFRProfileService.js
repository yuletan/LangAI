/**
 * CEFR Profile Service
 * Manages user CEFR profiles with spiky skill tracking and confidence weighting
 * Based on implementation_plan.md specification
 */

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * Creates a new user CEFR profile
 * @param {string} userId - Unique user identifier
 * @param {string} initialLevel - Initial CEFR level (default: "A1")
 * @returns {Object} User profile object
 */
function createUserProfile(userId, initialLevel = "A1") {
  const defaultSkill = {
    level: initialLevel,
    plus_level: false,
    confidence_score: 0.5,
    history: [
      {
        date: new Date().toISOString(),
        event: "profile_created",
        result: initialLevel
      }
    ]
  };

  return {
    user_id: userId,
    cefr_profile: {
      global_level: initialLevel,
      skills: {
        listening: { ...defaultSkill },
        reading: { ...defaultSkill },
        spoken_interaction: { ...defaultSkill },
        spoken_production: { ...defaultSkill },
        writing: { ...defaultSkill }
      }
    },
    placement_state: {
      self_assessment_complete: false,
      initial_seed_level: null,
      bucket_test_status: {
        current_bucket: null,
        consecutive_correct: 0,
        consecutive_wrong: 0,
        adaptive_history: []
      }
    },
    learning_preferences: {
      goals: [],
      topics: []
    }
  };
}

/**
 * Updates a specific skill in the user profile
 * @param {Object} profile - User profile object
 * @param {string} skillName - Name of the skill to update
 * @param {string} newLevel - New CEFR level
 * @param {boolean} isPlusLevel - Whether this is a plus level
 * @param {number} confidenceScore - Confidence score (0.0 to 1.0)
 * @param {string} eventType - Type of event triggering the update
 * @returns {Object} Updated profile
 */
function updateSkillLevel(profile, skillName, newLevel, isPlusLevel = false, confidenceScore = 0.5, eventType = "assessment") {
  if (!profile.cefr_profile.skills[skillName]) {
    throw new Error(`Invalid skill name: ${skillName}`);
  }

  const skill = profile.cefr_profile.skills[skillName];
  
  // Add history entry
  skill.history.push({
    date: new Date().toISOString(),
    event: eventType,
    result: isPlusLevel ? `${newLevel}+` : newLevel,
    previous_level: skill.level,
    confidence_score: confidenceScore
  });

  // Update skill
  skill.level = newLevel;
  skill.plus_level = isPlusLevel;
  skill.confidence_score = confidenceScore;

  // Recalculate global level
  profile.cefr_profile.global_level = calculateGlobalLevel(profile);

  return profile;
}

/**
 * Calculates the global CEFR level based on all skills
 * Uses weighted average with confidence scores
 * @param {Object} profile - User profile object
 * @returns {string} Global CEFR level
 */
function calculateGlobalLevel(profile) {
  const skills = profile.cefr_profile.skills;
  let totalWeightedScore = 0;
  let totalConfidence = 0;

  Object.values(skills).forEach(skill => {
    const levelIndex = CEFR_LEVELS.indexOf(skill.level);
    const plusBonus = skill.plus_level ? 0.5 : 0;
    const weightedScore = (levelIndex + plusBonus) * skill.confidence_score;
    
    totalWeightedScore += weightedScore;
    totalConfidence += skill.confidence_score;
  });

  const averageIndex = Math.round(totalWeightedScore / totalConfidence);
  return CEFR_LEVELS[Math.min(averageIndex, CEFR_LEVELS.length - 1)];
}

/**
 * Updates placement state during adaptive testing
 * @param {Object} profile - User profile object
 * @param {string} currentBucket - Current CEFR level being tested
 * @param {boolean} isCorrect - Whether the answer was correct
 * @returns {Object} Updated profile
 */
function updatePlacementState(profile, currentBucket, isCorrect) {
  const state = profile.placement_state.bucket_test_status;
  
  state.current_bucket = currentBucket;
  state.adaptive_history.push(isCorrect ? "pass" : "fail");

  if (isCorrect) {
    state.consecutive_correct++;
    state.consecutive_wrong = 0;
  } else {
    state.consecutive_wrong++;
    state.consecutive_correct = 0;
  }

  return profile;
}

/**
 * Determines the next lesson based on user profile and preferences
 * Implements spiky profile handling and plus level logic
 * @param {Object} profile - User profile object
 * @param {string} focusSkill - Skill to focus on (optional)
 * @returns {Object} Lesson recommendation
 */
function determineNextLesson(profile, focusSkill = null) {
  const skills = profile.cefr_profile.skills;
  
  // Find target skill (weakest or user preference)
  let targetSkill = focusSkill;
  if (!targetSkill) {
    // Find weakest skill
    let minLevel = Infinity;
    Object.entries(skills).forEach(([skillName, skillData]) => {
      const levelIndex = CEFR_LEVELS.indexOf(skillData.level);
      const adjustedLevel = levelIndex - (skillData.plus_level ? 0.5 : 0);
      if (adjustedLevel < minLevel) {
        minLevel = adjustedLevel;
        targetSkill = skillName;
      }
    });
  }

  const skill = skills[targetSkill];
  const currentLevel = skill.level;
  const currentLevelIndex = CEFR_LEVELS.indexOf(currentLevel);
  
  // Determine lesson type based on plus level status
  const THRESHOLD_PLUS = 0.75; // Threshold for plus level consideration
  let lessonType, targetLevel;

  if (skill.confidence_score > THRESHOLD_PLUS && !skill.plus_level) {
    // User is strong at current level, assign plus content
    lessonType = "BRIDGE_TO_NEXT";
    targetLevel = `${currentLevel}+`;
  } else if (skill.plus_level && skill.confidence_score > 0.85) {
    // User is ready for next level
    lessonType = "LEVEL_UP";
    targetLevel = CEFR_LEVELS[Math.min(currentLevelIndex + 1, CEFR_LEVELS.length - 1)];
  } else {
    // Consolidation at current level
    lessonType = "CONSOLIDATION";
    targetLevel = currentLevel;
  }

  return {
    target_skill: targetSkill,
    current_level: currentLevel,
    target_level: targetLevel,
    lesson_type: lessonType,
    confidence_score: skill.confidence_score,
    domains: profile.learning_preferences.topics.length > 0 
      ? profile.learning_preferences.topics 
      : ["daily_life"]
  };
}

/**
 * Gets the weakest skill relative to global level
 * @param {Object} profile - User profile object
 * @returns {Object} Weakest skill info
 */
function getWeakestSkill(profile) {
  const globalLevelIndex = CEFR_LEVELS.indexOf(profile.cefr_profile.global_level);
  const skills = profile.cefr_profile.skills;
  
  let maxGap = -Infinity;
  let weakestSkill = null;

  Object.entries(skills).forEach(([skillName, skillData]) => {
    const skillLevelIndex = CEFR_LEVELS.indexOf(skillData.level);
    const gap = globalLevelIndex - skillLevelIndex;
    
    if (gap > maxGap) {
      maxGap = gap;
      weakestSkill = {
        name: skillName,
        level: skillData.level,
        plus_level: skillData.plus_level,
        confidence_score: skillData.confidence_score,
        gap: gap
      };
    }
  });

  return weakestSkill;
}

/**
 * Validates CEFR profile structure
 * @param {Object} profile - User profile object
 * @returns {boolean} True if valid
 */
function validateProfile(profile) {
  if (!profile.user_id || !profile.cefr_profile) {
    return false;
  }

  const requiredSkills = ["listening", "reading", "spoken_interaction", "spoken_production", "writing"];
  const skills = profile.cefr_profile.skills;

  for (const skillName of requiredSkills) {
    if (!skills[skillName]) {
      return false;
    }
    
    const skill = skills[skillName];
    if (!CEFR_LEVELS.includes(skill.level)) {
      return false;
    }
    
    if (typeof skill.confidence_score !== "number" || 
        skill.confidence_score < 0 || 
        skill.confidence_score > 1) {
      return false;
    }
  }

  return true;
}

module.exports = {
  createUserProfile,
  updateSkillLevel,
  calculateGlobalLevel,
  updatePlacementState,
  determineNextLesson,
  getWeakestSkill,
  validateProfile,
  CEFR_LEVELS
};
