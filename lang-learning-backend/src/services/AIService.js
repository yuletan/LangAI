const config = require("../config");
const { estimateTokens, parseAIResponse } = require("../utils/aiParser");

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
      config.MODEL_PRIMARY,
      config.DEEPSEEK_URL,
      config.DEEPSEEK_API_KEY,
      maxTokens
    );
  } catch (primaryError) {
    console.warn("⚠️ Primary API failed:", primaryError.message);
    console.log("🔄 Switching to Fallback (OpenRouter)...");

    try {
      content = await callAI(
        prompt,
        config.MODEL_FALLBACK,
        config.OPENROUTER_URL,
        config.OPENROUTER_API_KEY,
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

module.exports = {
  callAI,
  callAIWithFallback,
  generateWithRetry,
};
