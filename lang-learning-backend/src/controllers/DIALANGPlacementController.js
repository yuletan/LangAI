/**
 * DIALANG Placement Controller
 * Handles adaptive placement testing endpoints
 */

const DIALANGPlacementService = require("../services/DIALANGPlacementService");
const CEFRProfileService = require("../services/CEFRProfileService");

/**
 * Start placement test (self-assessment phase)
 * GET /api/placement/start
 */
async function startPlacement(req, res) {
  try {
    const { skill = "listening" } = req.query;
    
    const placementData = DIALANGPlacementService.startPlacement(skill);
    
    res.json({
      success: true,
      data: placementData,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error starting placement:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Create placement session after self-assessment
 * POST /api/placement/session
 */
async function createSession(req, res) {
  try {
    const {
      userId,
      selfAssessedLevel,
      language,
      skill = "listening"
    } = req.body;
    
    if (!userId || !selfAssessedLevel || !language) {
      return res.status(400).json({
        success: false,
        error: "userId, selfAssessedLevel, and language are required"
      });
    }
    
    const session = await DIALANGPlacementService.createPlacementSession(
      userId,
      selfAssessedLevel,
      language,
      skill
    );
    
    res.json({
      success: true,
      data: session,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error creating placement session:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Submit responses and get next action
 * POST /api/placement/submit
 */
async function submitResponses(req, res) {
  try {
    const { session, responses, language } = req.body;
    
    if (!session || !responses || !language) {
      return res.status(400).json({
        success: false,
        error: "session, responses, and language are required"
      });
    }
    
    const updatedSession = await DIALANGPlacementService.processResponses(
      session,
      responses,
      language
    );
    
    res.json({
      success: true,
      data: updatedSession,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error submitting responses:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Finalize placement and update profile
 * POST /api/placement/finalize
 */
async function finalizePlacement(req, res) {
  try {
    const { session, userProfile } = req.body;
    
    if (!session || !userProfile) {
      return res.status(400).json({
        success: false,
        error: "session and userProfile are required"
      });
    }
    
    if (session.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        error: "Placement session is not completed"
      });
    }
    
    const updatedProfile = DIALANGPlacementService.finalizePlacement(
      session,
      userProfile
    );
    
    res.json({
      success: true,
      data: {
        profile: updatedProfile,
        result: session.final_result
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error finalizing placement:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate placement questions (for testing/preview)
 * POST /api/placement/questions
 */
async function generateQuestions(req, res) {
  try {
    const { level, language, skill = "listening" } = req.body;
    
    if (!level || !language) {
      return res.status(400).json({
        success: false,
        error: "level and language are required"
      });
    }
    
    const questionData = await DIALANGPlacementService.generatePlacementQuestions(
      level,
      language,
      skill
    );
    
    res.json({
      success: true,
      data: questionData,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get self-assessment descriptors
 * GET /api/placement/descriptors
 */
async function getDescriptors(req, res) {
  try {
    res.json({
      success: true,
      data: DIALANGPlacementService.SELF_ASSESSMENT_DESCRIPTORS,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error getting descriptors:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  startPlacement,
  createSession,
  submitResponses,
  finalizePlacement,
  generateQuestions,
  getDescriptors
};
