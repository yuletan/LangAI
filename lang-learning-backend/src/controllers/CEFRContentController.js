/**
 * CEFR Content Controller
 * Handles content generation and assessment endpoints
 */

const CEFRContentService = require("../services/CEFRContentService");
const CEFRAssessmentService = require("../services/CEFRAssessmentService");

/**
 * Generate CEFR-aligned content
 * POST /api/cefr/content/generate
 */
async function generateContent(req, res) {
  try {
    const {
      targetLevel,
      language,
      domain,
      topic,
      contentType = "reading"
    } = req.body;
    
    if (!targetLevel || !language || !domain || !topic) {
      return res.status(400).json({
        success: false,
        error: "targetLevel, language, domain, and topic are required"
      });
    }
    
    const content = await CEFRContentService.generateContent(
      targetLevel,
      language,
      domain,
      topic,
      contentType
    );
    
    res.json({
      success: true,
      data: content,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate vocabulary lesson
 * POST /api/cefr/content/vocabulary
 */
async function generateVocabulary(req, res) {
  try {
    const {
      targetLevel,
      language,
      topic,
      wordCount = 10
    } = req.body;
    
    if (!targetLevel || !language || !topic) {
      return res.status(400).json({
        success: false,
        error: "targetLevel, language, and topic are required"
      });
    }
    
    const vocabulary = await CEFRContentService.generateVocabularyLesson(
      targetLevel,
      language,
      topic,
      wordCount
    );
    
    res.json({
      success: true,
      data: vocabulary,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error generating vocabulary:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate grammar lesson
 * POST /api/cefr/content/grammar
 */
async function generateGrammar(req, res) {
  try {
    const {
      targetLevel,
      language,
      grammarPoint
    } = req.body;
    
    if (!targetLevel || !language || !grammarPoint) {
      return res.status(400).json({
        success: false,
        error: "targetLevel, language, and grammarPoint are required"
      });
    }
    
    const grammar = await CEFRContentService.generateGrammarLesson(
      targetLevel,
      language,
      grammarPoint
    );
    
    res.json({
      success: true,
      data: grammar,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error generating grammar:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate complete lesson
 * POST /api/cefr/content/lesson
 */
async function generateLesson(req, res) {
  try {
    const lessonSpec = req.body;
    
    if (!lessonSpec.target_level || !lessonSpec.language || !lessonSpec.target_skill) {
      return res.status(400).json({
        success: false,
        error: "target_level, language, and target_skill are required"
      });
    }
    
    const lesson = await CEFRContentService.generateCompleteLesson(lessonSpec);
    
    res.json({
      success: true,
      data: lesson,
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
 * Generate Level-Up quiz
 * POST /api/cefr/content/level-up
 */
async function generateLevelUpQuiz(req, res) {
  try {
    const { currentLevel, language } = req.body;
    
    if (!currentLevel || !language) {
      return res.status(400).json({
        success: false,
        error: "currentLevel and language are required"
      });
    }
    
    const quiz = await CEFRContentService.generateLevelUpQuiz(currentLevel, language);
    
    res.json({
      success: true,
      data: quiz,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error generating level-up quiz:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Assess user response (writing/speaking)
 * POST /api/cefr/assess/response
 */
async function assessResponse(req, res) {
  try {
    const {
      userInput,
      targetLevel,
      questionContext,
      skill = "writing"
    } = req.body;
    
    if (!userInput || !targetLevel || !questionContext) {
      return res.status(400).json({
        success: false,
        error: "userInput, targetLevel, and questionContext are required"
      });
    }
    
    const assessment = await CEFRAssessmentService.assessUserResponse(
      userInput,
      targetLevel,
      questionContext,
      skill
    );
    
    res.json({
      success: true,
      data: assessment,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error assessing response:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Evaluate quiz answers
 * POST /api/cefr/assess/quiz
 */
async function evaluateQuiz(req, res) {
  try {
    const { questions, targetLevel } = req.body;
    
    if (!questions || !targetLevel) {
      return res.status(400).json({
        success: false,
        error: "questions and targetLevel are required"
      });
    }
    
    const evaluation = CEFRAssessmentService.evaluateQuizAnswers(
      questions,
      targetLevel
    );
    
    res.json({
      success: true,
      data: evaluation,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error evaluating quiz:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Assess writing
 * POST /api/cefr/assess/writing
 */
async function assessWriting(req, res) {
  try {
    const { writingText, targetLevel, prompt } = req.body;
    
    if (!writingText || !targetLevel || !prompt) {
      return res.status(400).json({
        success: false,
        error: "writingText, targetLevel, and prompt are required"
      });
    }
    
    const assessment = await CEFRAssessmentService.assessWriting(
      writingText,
      targetLevel,
      prompt
    );
    
    res.json({
      success: true,
      data: assessment,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error assessing writing:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Assess speaking
 * POST /api/cefr/assess/speaking
 */
async function assessSpeaking(req, res) {
  try {
    const { transcription, targetLevel, prompt } = req.body;
    
    if (!transcription || !targetLevel || !prompt) {
      return res.status(400).json({
        success: false,
        error: "transcription, targetLevel, and prompt are required"
      });
    }
    
    const assessment = await CEFRAssessmentService.assessSpeaking(
      transcription,
      targetLevel,
      prompt
    );
    
    res.json({
      success: true,
      data: assessment,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error assessing speaking:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get ALTE Can-Do statement
 * GET /api/cefr/content/alte-statement
 */
async function getALTEStatement(req, res) {
  try {
    const { level } = req.query;
    
    if (!level) {
      return res.status(400).json({
        success: false,
        error: "level is required"
      });
    }
    
    const statement = CEFRContentService.getALTEStatement(level);
    
    res.json({
      success: true,
      data: { statement, level },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error getting ALTE statement:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  generateContent,
  generateVocabulary,
  generateGrammar,
  generateLesson,
  assessResponse,
  evaluateQuiz,
  assessWriting,
  assessSpeaking,
  getALTEStatement,
  generateLevelUpQuiz
};
