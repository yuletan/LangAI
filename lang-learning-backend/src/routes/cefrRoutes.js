/**
 * CEFR API Routes
 * Routes for CEFR profile management, placement testing, content generation, and assessment
 */

const express = require("express");
const router = express.Router();

const CEFRProfileController = require("../controllers/CEFRProfileController");
const DIALANGPlacementController = require("../controllers/DIALANGPlacementController");
const CEFRContentController = require("../controllers/CEFRContentController");

// ============================================================================
// CEFR Profile Routes
// ============================================================================

/**
 * Create new user CEFR profile
 * POST /api/cefr/profile
 * Body: { userId: string, initialLevel?: string }
 */
router.post("/profile", CEFRProfileController.createProfile);

/**
 * Update skill level in profile
 * PUT /api/cefr/profile/skill
 * Body: { profile: object, skillName: string, newLevel: string, isPlusLevel?: boolean, confidenceScore?: number, eventType?: string }
 */
router.put("/profile/skill", CEFRProfileController.updateSkill);

/**
 * Get lesson recommendation based on profile
 * POST /api/cefr/profile/recommend
 * Body: { profile: object, focusSkill?: string }
 */
router.post("/profile/recommend", CEFRProfileController.getRecommendation);

/**
 * Get weakest skill from profile
 * POST /api/cefr/profile/weakest
 * Body: { profile: object }
 */
router.post("/profile/weakest", CEFRProfileController.getWeakestSkill);

/**
 * Generate complete lesson based on profile
 * POST /api/cefr/profile/generate-lesson
 * Body: { profile: object, language: string, focusSkill?: string }
 */
router.post("/profile/generate-lesson", CEFRProfileController.generateLesson);

/**
 * Validate profile structure
 * POST /api/cefr/profile/validate
 * Body: { profile: object }
 */
router.post("/profile/validate", CEFRProfileController.validateProfile);

// ============================================================================
// DIALANG Placement Testing Routes
// ============================================================================

/**
 * Start placement test (get self-assessment descriptors)
 * GET /api/cefr/placement/start?skill=listening
 */
router.get("/placement/start", DIALANGPlacementController.startPlacement);

/**
 * Get self-assessment descriptors
 * GET /api/cefr/placement/descriptors
 */
router.get("/placement/descriptors", DIALANGPlacementController.getDescriptors);

/**
 * Create placement session after self-assessment
 * POST /api/cefr/placement/session
 * Body: { userId: string, selfAssessedLevel: string, language: string, skill?: string }
 */
router.post("/placement/session", DIALANGPlacementController.createSession);

/**
 * Submit responses and get next action
 * POST /api/cefr/placement/submit
 * Body: { session: object, responses: array, language: string }
 */
router.post("/placement/submit", DIALANGPlacementController.submitResponses);

/**
 * Finalize placement and update profile
 * POST /api/cefr/placement/finalize
 * Body: { session: object, userProfile: object }
 */
router.post("/placement/finalize", DIALANGPlacementController.finalizePlacement);

/**
 * Generate placement questions (for testing/preview)
 * POST /api/cefr/placement/questions
 * Body: { level: string, language: string, skill?: string }
 */
router.post("/placement/questions", DIALANGPlacementController.generateQuestions);

// ============================================================================
// Content Generation Routes
// ============================================================================

/**
 * Generate CEFR-aligned content
 * POST /api/cefr/content/generate
 * Body: { targetLevel: string, language: string, domain: string, topic: string, contentType?: string }
 */
router.post("/content/generate", CEFRContentController.generateContent);

/**
 * Generate vocabulary lesson
 * POST /api/cefr/content/vocabulary
 * Body: { targetLevel: string, language: string, topic: string, wordCount?: number }
 */
router.post("/content/vocabulary", CEFRContentController.generateVocabulary);

/**
 * Generate grammar lesson
 * POST /api/cefr/content/grammar
 * Body: { targetLevel: string, language: string, grammarPoint: string }
 */
router.post("/content/grammar", CEFRContentController.generateGrammar);

/**
 * Generate complete lesson
 * POST /api/cefr/content/lesson
 * Body: { target_level: string, language: string, target_skill: string, lesson_type?: string, domains?: array, focus_areas?: array }
 */
router.post("/content/lesson", CEFRContentController.generateLesson);

/**
 * Get ALTE Can-Do statement for a level
 * GET /api/cefr/content/alte-statement?level=B1
 */
router.get("/content/alte-statement", CEFRContentController.getALTEStatement);

/**
 * Generate Level-Up quiz
 * POST /api/cefr/content/level-up
 * Body: { currentLevel: string, language: string }
 */
router.post("/content/level-up", CEFRContentController.generateLevelUpQuiz);

// ============================================================================
// Assessment Routes
// ============================================================================

/**
 * Assess user response (writing/speaking)
 * POST /api/cefr/assess/response
 * Body: { userInput: string, targetLevel: string, questionContext: string, skill?: string }
 */
router.post("/assess/response", CEFRContentController.assessResponse);

/**
 * Evaluate quiz answers
 * POST /api/cefr/assess/quiz
 * Body: { questions: array, targetLevel: string }
 */
router.post("/assess/quiz", CEFRContentController.evaluateQuiz);

/**
 * Assess writing
 * POST /api/cefr/assess/writing
 * Body: { writingText: string, targetLevel: string, prompt: string }
 */
router.post("/assess/writing", CEFRContentController.assessWriting);

/**
 * Assess speaking
 * POST /api/cefr/assess/speaking
 * Body: { transcription: string, targetLevel: string, prompt: string }
 */
router.post("/assess/speaking", CEFRContentController.assessSpeaking);

module.exports = router;
