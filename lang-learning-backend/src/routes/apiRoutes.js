const express = require("express");
const router = express.Router();
const PredictController = require("../controllers/PredictController");
const ChatController = require("../controllers/ChatController");
const LessonController = require("../controllers/LessonController");

// Predict Routes
router.post("/predict", PredictController.predict);
router.post("/grammar-check", PredictController.grammarCheck);
router.post("/insights", PredictController.insights);

// Chat Routes
router.post("/chat", ChatController.chat);

// Lesson Routes
router.post("/lessons", LessonController.generateLesson);

// Health Check
router.get("/health", (req, res) => {
  const config = require("../config");
  res.json({
    status: "online",
    version: "2.1.0",
    keys_configured: {
      deepseek: !!config.DEEPSEEK_API_KEY,
      openrouter: !!config.OPENROUTER_API_KEY,
    },
    endpoints: [
      "/api/predict",
      "/api/grammar-check",
      "/api/chat",
      "/api/insights",
      "/api/lessons",
      "/api/health",
    ],
  });
});

module.exports = router;
