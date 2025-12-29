const AIService = require("../services/AIService");

async function predict(req, res) {
  try {
    const { text, inputLang, outputLang, tone, difficulty, scenario } = req.body;

    if (!text || !text.trim()) {
      return res.json({ translation: "", pronunciation: "", predictions: [] });
    }

    console.log(`\n🧠 Processing: "${text}" [${inputLang} -> ${outputLang}]`);

    const cefrGuide = {
      A1: "Use only top 500 basic words. Simple sentences.",
      A2: "Use common vocabulary. Short compound sentences allowed.",
      B1: "Use intermediate vocabulary. Complex sentences OK.",
      B2: "Use advanced vocabulary. Idioms and nuanced expressions allowed.",
      C1: "Use sophisticated vocabulary. Include idioms, complex grammar.",
      C2: "Use native-level vocabulary. All constructs allowed.",
    };

    const levelGuide = cefrGuide[difficulty] || cefrGuide["B1"];
    const scenarioContext = scenario ? `Scenario: ${scenario}.` : "";

    const prompt = `Role: ${outputLang} Tutor. Level: ${difficulty || "B1"}.
Task: Translate & predict next 3 words.
Input: "${text}"
From: ${inputLang}. To: ${outputLang}. Tone: ${tone || "casual"}. ${scenarioContext}
Level Guide: ${levelGuide}

Output JSON ONLY:
{
  "translation": "accurate translation",
  "pronunciation": "phonetic guide (IPA or simple)",
  "predictions": [
    {"word": "...", "translation": "...", "probability": 0.9, "reason": "grammar/context reason", "cult_warn": null or "cultural warning if needed"}
  ]
}`;

    const { json, usedSource } = await AIService.generateWithRetry(prompt, 250, "Prediction");

    json._meta = {
      source: usedSource,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Success via ${usedSource}`);
    res.json(json);
  } catch (error) {
    console.error("🔥 Critical Server Error:", error.message);
    res.status(500).json({
      error: "Processing Failed",
      details: error.message,
    });
  }
}

async function grammarCheck(req, res) {
  try {
    const { text, language } = req.body;

    if (!text || !text.trim()) {
      return res.json({ corrected: "", hasErrors: false, corrections: [] });
    }

    console.log(`\n📝 Grammar Check: "${text}" [${language}]`);

    const prompt = `Role: You are a ${language} Grammar Expert.
Task: Check and correct grammar ONLY. Do not translate.
Input: "${text}"

Output JSON ONLY:
{
  "corrected": "corrected text (same as input if no errors)",
  "hasErrors": true/false,
  "corrections": [
    {"original": "wrong phrase", "corrected": "correct phrase", "reason": "explanation"}
  ]
}`;

    const { json, usedSource } = await AIService.generateWithRetry(prompt, 150, "Grammar Check");

    json._meta = {
      source: usedSource,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Grammar check via ${usedSource}`);
    res.json(json);
  } catch (error) {
    console.error("🔥 Grammar Check Error:", error.message);
    res.status(500).json({
      error: "Grammar Check Failed",
      details: error.message,
    });
  }
}

async function insights(req, res) {
  try {
    const { summary } = req.body;

    if (!summary || !summary.trim()) {
      return res.json({ insight: "Keep practicing to unlock insights!" });
    }

    console.log(`\n📊 Generating insight for: "${summary}"`);

    const prompt = `Role: Language Learning Coach.
User stats summary: "${summary}"

Give ONE encouraging, actionable sentence of advice. Be specific. Max 50 words.

Output JSON ONLY:
{
  "insight": "your advice"
}`;

    const { json, usedSource } = await AIService.generateWithRetry(prompt, 60, "Insights");

    console.log(`✅ Insight via ${usedSource}`);
    res.json(json);
  } catch (error) {
    console.error("🔥 Insights Error:", error.message);
    res.json({ insight: "Keep up your language learning journey!" });
  }
}

module.exports = {
  predict,
  grammarCheck,
  insights,
};
