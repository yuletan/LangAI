/**
 * CEFR Profile Controller
 * Handles user profile management and lesson recommendations
 */

const CEFRProfileService = require("../services/CEFRProfileService");
const CEFRContentService = require("../services/CEFRContentService");

/**
 * Create new user profile
 * POST /api/cefr/profile
 */
async function createProfile(req, res) {
  try {
    const { userId, initialLevel = "A1" } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required"
      });
    }
    
    const profile = CEFRProfileService.createUserProfile(userId, initialLevel);
    
    res.json({
      success: true,
      data: profile,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Update skill level
 * PUT /api/cefr/profile/skill
 */
async function updateSkill(req, res) {
  try {
    const {
      profile,
      skillName,
      newLevel,
      isPlusLevel = false,
      confidenceScore = 0.5,
      eventType = "assessment"
    } = req.body;
    
    if (!profile || !skillName || !newLevel) {
      return res.status(400).json({
        success: false,
        error: "profile, skillName, and newLevel are required"
      });
    }
    
    const updatedProfile = CEFRProfileService.updateSkillLevel(
      profile,
      skillName,
      newLevel,
      isPlusLevel,
      confidenceScore,
      eventType
    );
    
    res.json({
      success: true,
      data: updatedProfile,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get lesson recommendation
 * POST /api/cefr/profile/recommend
 */
async function getRecommendation(req, res) {
  try {
    const { profile, focusSkill = null } = req.body;
    
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: "profile is required"
      });
    }
    
    const recommendation = CEFRProfileService.determineNextLesson(profile, focusSkill);
    
    res.json({
      success: true,
      data: recommendation,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error getting recommendation:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get weakest skill
 * POST /api/cefr/profile/weakest
 */
async function getWeakestSkill(req, res) {
  try {
    const { profile } = req.body;
    
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: "profile is required"
      });
    }
    
    const weakestSkill = CEFRProfileService.getWeakestSkill(profile);
    
    res.json({
      success: true,
      data: weakestSkill,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error getting weakest skill:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate complete lesson based on profile
 * POST /api/cefr/profile/generate-lesson
 */
async function generateLesson(req, res) {
  try {
    const { profile, language, focusSkill = null } = req.body;
    
    if (!profile || !language) {
      return res.status(400).json({
        success: false,
        error: "profile and language are required"
      });
    }
    
    // Get recommendation
    const recommendation = CEFRProfileService.determineNextLesson(profile, focusSkill);
    
    // Generate lesson
    const lesson = await CEFRContentService.generateCompleteLesson({
      target_level: recommendation.current_level,
      language: language,
      target_skill: recommendation.target_skill,
      lesson_type: recommendation.lesson_type,
      domains: recommendation.domains
    });
    
    res.json({
      success: true,
      data: {
        lesson: lesson,
        recommendation: recommendation
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error generating lesson:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Validate profile structure
 * POST /api/cefr/profile/validate
 */
async function validateProfile(req, res) {
  try {
    const { profile } = req.body;
    
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: "profile is required"
      });
    }
    
    const isValid = CEFRProfileService.validateProfile(profile);
    
    res.json({
      success: true,
      data: {
        is_valid: isValid
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error validating profile:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  createProfile,
  updateSkill,
  getRecommendation,
  getWeakestSkill,
  generateLesson,
  validateProfile
};
