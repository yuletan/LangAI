const LessonService = require("../services/LessonService");

async function generateLesson(req, res) {
  try {
    const { level, topic, language } = req.body;

    if (!level || !topic) {
      return res.status(400).json({ error: "Missing level or topic" });
    }

    const lesson = await LessonService.generateLesson(level, topic, language);
    console.log(`✅ Lesson generated via ${lesson._meta.source}`);
    res.json(lesson);
  } catch (error) {
    console.error("🔥 Lesson Generation Error:", error.message);
    res.status(500).json({
      error: "Lesson Generation Failed",
      details: error.message,
    });
  }
}

module.exports = {
  generateLesson,
};
