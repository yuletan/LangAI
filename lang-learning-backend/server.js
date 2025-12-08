require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// API Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model Configuration
const DEEPSEEK_MODEL = "deepseek-chat"; // Primary model
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || "deepseek/deepseek-chat"; // Fallback via OpenRouter

// Helper function to call DeepSeek API directly
async function callDeepSeek(prompt) {
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }, // DeepSeek supports JSON mode
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Helper function to call OpenRouter as fallback
async function callOpenRouter(prompt, model = FALLBACK_MODEL) {
  console.log(`🔄 Using OpenRouter with model: ${model}`);

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Language Learning App",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Log the actual model used (OpenRouter may use a different version)
  if (data.model) {
    console.log(`✅ OpenRouter responded with model: ${data.model}`);
  }

  return data.choices[0].message.content;
}

// Helper function to clean and parse JSON response
function parseAIResponse(content) {
  const cleanedContent = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  return JSON.parse(cleanedContent);
}

app.post("/api/predict", async (req, res) => {
  try {
    const { text, inputLang, outputLang, tone, difficulty } = req.body;

    // Fast exit if empty
    if (!text || text.trim() === "") {
      return res.json({ translation: "", pronunciation: "", predictions: [] });
    }

    console.log(
      `Processing: "${text}" (Input: ${inputLang}, Target: ${outputLang}, Tone: ${tone}, Difficulty: ${difficulty})`
    );

    const prompt = `Task: You are a predictive engine for a language learning app.
Context: Input: "${inputLang}", Target: "${outputLang}", Tone: "${tone}", Difficulty: "${difficulty}".
User Input So Far: "${text}"

Requirements:
1. Translate the user input.
2. Predict the next 3 logical continuations (words/phrases).
3. Provide pronunciation for everything.
4. Return ONLY valid JSON in this exact format (no markdown, no backticks):
{
  "translation": "string",
  "pronunciation": "string",
  "predictions": [
    { "word": "string", "translation": "string", "pronunciation": "string", "probability": 0.9, "reason": "string" }
  ]
}`;

    let aiResponse;
    let usedProvider = "DeepSeek";
    let usedModel = DEEPSEEK_MODEL;

    try {
      // Try DeepSeek first
      console.log("Attempting DeepSeek API...");
      aiResponse = await callDeepSeek(prompt);
      console.log("✅ DeepSeek API successful");
    } catch (deepseekError) {
      console.error("❌ DeepSeek API failed:", deepseekError.message);
      console.log("Falling back to OpenRouter...");

      try {
        // Fallback to OpenRouter
        aiResponse = await callOpenRouter(prompt);
        usedProvider = "OpenRouter";
        usedModel = FALLBACK_MODEL;
        console.log(
          `✅ OpenRouter fallback successful with model: ${usedModel}`
        );
      } catch (openrouterError) {
        console.error(
          "❌ OpenRouter fallback also failed:",
          openrouterError.message
        );
        throw new Error("Both DeepSeek and OpenRouter APIs failed");
      }
    }

    const jsonResponse = parseAIResponse(aiResponse);

    // Add metadata about which provider was used
    jsonResponse._meta = {
      provider: usedProvider,
      model: usedModel,
      timestamp: new Date().toISOString(),
    };

    console.log(`📊 Response sent using: ${usedProvider} (${usedModel})`);

    res.json(jsonResponse);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({
      error: "AI processing failed",
      details: error.message,
    });
  }
});

// Endpoint to manually switch models (useful for testing)
app.post("/api/predict/with-model", async (req, res) => {
  try {
    const { text, inputLang, outputLang, tone, difficulty, model } = req.body;

    if (!text || text.trim() === "") {
      return res.json({ translation: "", pronunciation: "", predictions: [] });
    }

    const prompt = `Task: You are a predictive engine for a language learning app.
Context: Input: "${inputLang}", Target: "${outputLang}", Tone: "${tone}", Difficulty: "${difficulty}".
User Input So Far: "${text}"

Requirements:
1. Translate the user input.
2. Predict the next 3 logical continuations (words/phrases).
3. Provide pronunciation for everything.
4. Return ONLY valid JSON in this exact format (no markdown, no backticks):
{
  "translation": "string",
  "pronunciation": "string",
  "predictions": [
    { "word": "string", "translation": "string", "pronunciation": "string", "probability": 0.9, "reason": "string" }
  ]
}`;

    console.log(`Using specific model: ${model}`);
    const aiResponse = await callOpenRouter(prompt, model);
    const jsonResponse = parseAIResponse(aiResponse);

    jsonResponse._meta = {
      provider: "OpenRouter",
      model: model,
      timestamp: new Date().toISOString(),
    };

    res.json(jsonResponse);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({
      error: "AI processing failed",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    deepseek: !!DEEPSEEK_API_KEY,
    openrouter: !!OPENROUTER_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `📡 DeepSeek API: ${DEEPSEEK_API_KEY ? "✅ Configured" : "❌ Missing"}`
  );
  console.log(
    `📡 OpenRouter API: ${OPENROUTER_API_KEY ? "✅ Configured" : "❌ Missing"}`
  );
  console.log(`🔧 Primary Model: ${DEEPSEEK_MODEL}`);
  console.log(`🔧 Fallback Model: ${FALLBACK_MODEL}`);
});
