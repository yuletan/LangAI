require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// --- Configuration ---
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Models
const MODEL_PRIMARY = "deepseek-chat";
const MODEL_FALLBACK = "deepseek/deepseek-chat"; // OpenRouter identifier

// --- Helpers ---

/**
 * Clean JSON Parser
 * Handles Markdown backticks from AI responses
 */
function parseAIResponse(content) {
  try {
    const clean = content.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ JSON Parse Failed. Raw content received:", content);
    throw new Error("AI returned invalid JSON format.");
  }
}

/**
 * Estimate token count (rough approximation)
 * Rule of thumb: 1 word ≈ 1.3 tokens, 1 char ≈ 0.25 tokens
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Use word-based estimation for better accuracy
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}


/**
 * Generic API Caller with token optimization
 */
async function callAI(prompt, model, url, apiKey, maxTokens = 200) {
  if (!apiKey) throw new Error("Missing API Key for " + url);

  const inputTokens = estimateTokens(prompt);
  console.log(`📡 Calling ${model}... (est. ${inputTokens} input tokens)`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Language Learning App",
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const outputTokens = estimateTokens(content);
  const totalTokens = inputTokens + outputTokens;
  
  console.log(`📊 Token usage: ${inputTokens} in + ${outputTokens} out = ${totalTokens} total`);
  
  return content;
}

/**
 * Call AI with fallback support
 */
async function callAIWithFallback(prompt, maxTokens = 200) {
  let content;
  let usedSource = "Primary";

  try {
    content = await callAI(
      prompt,
      MODEL_PRIMARY,
      DEEPSEEK_URL,
      DEEPSEEK_API_KEY,
      maxTokens
    );
  } catch (primaryError) {
    console.warn("⚠️ Primary API failed:", primaryError.message);
    console.log("🔄 Switching to Fallback (OpenRouter)...");

    try {
      content = await callAI(
        prompt,
        MODEL_FALLBACK,
        OPENROUTER_URL,
        OPENROUTER_API_KEY,
        maxTokens
      );
      usedSource = "Fallback";
    } catch (fallbackError) {
      console.error("❌ Fallback API also failed:", fallbackError.message);
      throw new Error("Both AI services are unavailable.");
    }
  }

  return { content, usedSource };
}

// --- Endpoints ---

/**
 * Generate AI Content with JSON Retry Logic
 */
async function generateWithRetry(prompt, maxTokens, context = "Generation") {
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const { content, usedSource } = await callAIWithFallback(prompt, maxTokens);
      const json = parseAIResponse(content);
      return { json, usedSource };
    } catch (error) {
      console.warn(`⚠️ ${context} Attempt ${attempts} failed: ${error.message}`);
      if (attempts >= maxAttempts) throw error;
      console.log(`🔄 Retrying ${context}...`);
    }
  }
}

// --- Endpoints ---

/**
 * 1. Main Prediction Endpoint (Token-Optimized)
 */
app.post("/api/predict", async (req, res) => {
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

    const { json, usedSource } = await generateWithRetry(prompt, 250, "Prediction");

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
});

/**
 * 2. Grammar Check Endpoint (On-Demand Only)
 */
app.post("/api/grammar-check", async (req, res) => {
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

    const { json, usedSource } = await generateWithRetry(prompt, 150, "Grammar Check");

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
});

/**
 * 3. Chat/Conversation Endpoint
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, language, scenario, difficulty } = req.body;

    if (!message || !message.trim()) {
      return res.json({ response: "", suggestions: [] });
    }

    const recentHistory = (history || []).slice(-6);
    const historyContext = recentHistory
      .map((h) => `${h.role}: ${h.content}`)
      .join("\n");

    console.log(`\n💬 Chat: "${message}" [${scenario || "general"}]`);

    const prompt = `Role: ${language} conversation partner. Level: ${difficulty || "B1"}.
Scenario: ${scenario || "casual conversation"}.
${historyContext ? `Recent conversation:\n${historyContext}\n` : ""}
User says: "${message}"

Respond naturally in ${language}. Include helpful corrections if user made mistakes.

Output JSON ONLY:
{
  "response": "your response in ${language}",
  "translation": "English translation of your response",
  "corrections": [{"wrong": "...", "correct": "...", "tip": "..."}] or [],
  "suggestions": ["possible user reply 1", "possible user reply 2"]
}`;

    const { json, usedSource } = await generateWithRetry(prompt, 300, "Chat");

    json._meta = {
      source: usedSource,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Chat response via ${usedSource}`);
    res.json(json);
  } catch (error) {
    console.error("🔥 Chat Error:", error.message);
    res.status(500).json({
      error: "Chat Failed",
      details: error.message,
    });
  }
});

/**
 * 4. AI Insights for Dashboard
 */
app.post("/api/insights", async (req, res) => {
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

    const { json, usedSource } = await generateWithRetry(prompt, 60, "Insights");

    console.log(`✅ Insight via ${usedSource}`);
    res.json(json);
  } catch (error) {
    console.error("🔥 Insights Error:", error.message);
    res.json({ insight: "Keep up your language learning journey!" });
  }
});

/**
 * 5. Dynamic Lesson Generation
 */
app.post("/api/lessons", async (req, res) => {
  try {
    const { level, topic, language } = req.body;

    if (!level || !topic) {
      return res.status(400).json({ error: "Missing level or topic" });
    }

    const targetLang = language || "Spanish";
    const lessonId = `${topic}_${level}_${targetLang}_${Date.now()}`;
    console.log(`\n📚 Generating Lesson: "${topic}" [${level}] in ${targetLang}`);

    const prompt = `Role: You are a ${targetLang} Teacher. Level: ${level}.
Task: Create a practical lesson for "${topic}" with 5 diverse quiz questions.

LESSON RULES:
- Focus on common mistakes and practical usage
- Include different sentence structures and contexts
- Mix positive/negative forms, different tenses, formal/informal
- Show correct vs incorrect usage patterns
- Keep explanations concise but helpful

QUIZ RULES:
- RANDOMIZE correct_index (0, 1, or 2) - NOT always 0!
- Each question should test different aspects: word order, verb forms, articles, etc.
- Include both "choose correct" and "identify error" type questions
- Make wrong options believable but clearly incorrect
- All questions completable in 5 minutes total

Output JSON ONLY (no markdown):
{
  "lesson_id": "${lessonId}",
  "title": "${targetLang} title",
  "title_reading": "romanization or empty",
  "introduction": "2 sentences in ${targetLang}",
  "introduction_english": "English translation",
  "key_points": [
    {"target": "point in ${targetLang}", "english": "translation", "reading": "romanization"},
    {"target": "...", "english": "...", "reading": "..."},
    {"target": "...", "english": "...", "reading": "..."}
  ],
  "example": {"text": "example sentence", "translation": "English", "reading": "romanization"},
  "quiz_questions": [
    {
      "question": "question in ${targetLang}",
      "question_english": "English translation",
      "question_reading": "romanization",
      "options": [
        {"target": "option text", "english": "translation", "reading": "romanization", "explanation": "1 sentence why correct/wrong", "use_case": "short example"},
        {"target": "...", "english": "...", "reading": "..."},
        {"target": "...", "english": "...", "reading": "..."}
      ],
      "correct_index": 0
    },
    {"question": "Q2", "question_english": "...", "question_reading": "...", "options": [{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0},
    {"question": "Q3", "question_english": "...", "question_reading": "...", "options": [{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0},
    {"question": "Q4", "question_english": "...", "question_reading": "...", "options": [{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0},
    {"question": "Q5", "question_english": "...", "question_reading": "...", "options": [{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","english":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0}
  ]
}`;

    const { json, usedSource } = await generateWithRetry(prompt, 3500, "Lesson Generation");

    // Ensure lesson_id is set
    json.lesson_id = json.lesson_id || lessonId;
    json._meta = {
      source: usedSource,
      language: targetLang,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Lesson generated in ${targetLang} via ${usedSource}`);
    res.json(json);
  } catch (error) {
    console.error("🔥 Lesson Generation Error:", error.message);
    res.status(500).json({
      error: "Lesson Generation Failed",
      details: error.message,
    });
  }
});

/**
 * 6. Health Check
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    version: "2.1.0",
    keys_configured: {
      deepseek: !!DEEPSEEK_API_KEY,
      openrouter: !!OPENROUTER_API_KEY,
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

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔑 DeepSeek Key: ${DEEPSEEK_API_KEY ? "Loaded" : "MISSING"}`);
  console.log(
    `🔑 OpenRouter Key: ${OPENROUTER_API_KEY ? "Loaded" : "MISSING"}`
  );
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   POST /api/predict       - Translation & predictions`);
  console.log(`   POST /api/grammar-check - On-demand grammar check`);
  console.log(`   POST /api/chat          - Conversation mode`);
  console.log(`   POST /api/insights      - AI learning insights`);
  console.log(`   GET  /api/health        - Server status`);
});
