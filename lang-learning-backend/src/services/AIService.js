require('dotenv').config(); 

const config = require("../config");
const { estimateTokens, parseAIResponse } = require("../utils/aiParser");
const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"; 
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🔧 [DEBUG] Supabase URL is:", process.env.EXPO_PUBLIC_SUPABASE_URL ? "LOADED FROM .ENV" : "MISSING (Using Placeholder)");


// Session stats for testing/monitoring
let sessionStats = { hits: 0, misses: 0, tokensSaved: 0 };

/**
 * Generic API Caller with Token Optimization & Global Cache
 * We move the Cache Logic here so it's central.
 */
async function callAI(prompt, model, url, apiKey, maxTokens = 200, systemPrompt = "You are a CEFR-aligned language learning content generator.", overrideCacheKey = null, metadata = {}) {
  if (!apiKey) throw new Error("Missing API Key for " + url);

  const inputTokens = estimateTokens(prompt + systemPrompt);

  // 1. GENERATE HASH (Use override if provided, else standard)
  // We include model in the hash because a prompt might differ slightly between DeepSeek/OpenRouter
  const hashKey = overrideCacheKey 
    ? crypto.createHash('sha256').update(overrideCacheKey + model).digest('hex')
    : crypto.createHash('sha256').update(prompt + systemPrompt + model).digest('hex');

  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 Days

  // 2. CHECK SUPABASE
  try {
    console.log(`🔍 Checking Supabase cache for hash: ${hashKey.substring(0, 8)}...`);
    const { data: cachedData, error } = await supabase
      .from('ai_content_cache')
      .select('content_json, created_at')
      .eq('hash_key', hashKey)
      .maybeSingle();

    if (cachedData) {
      const cacheAge = Date.now() - new Date(cachedData.created_at).getTime();
      
      if (cacheAge < CACHE_TTL) {
        console.log(`✅ CACHE HIT: Served from Supabase (Saved ~${inputTokens} input tokens)`);
        sessionStats.hits++;
        const cachedTokens = estimateTokens(JSON.stringify(cachedData.content_json)); // Estimate output cost
        sessionStats.tokensSaved += (inputTokens + cachedTokens);
        return { content: cachedData.content_json, isCached: true };
      } else {
        console.log('⏰ Cache Expired. Regenerating...');
      }
    }
  } catch (err) {
    console.error("Cache Read Error (Non-blocking):", err.message);
  }

  // 3. CALL API (If Cache Miss)
  sessionStats.misses++;
  console.log(`📡 Calling ${model}... (est. ${inputTokens} input tokens)`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const outputTokens = estimateTokens(content);
    const totalTokens = inputTokens + outputTokens;
    
    console.log(`📊 Token usage: ${inputTokens} in + ${outputTokens} out = ${totalTokens} total`);
    
    // 4. SAVE TO SUPABASE (On Success)
    try {
      // Logic for extracting level/language/topic if not provided in metadata
      let level = metadata.level;
      let language = metadata.language;
      let topic = metadata.topic;

      if (!level) {
        const levelMatch = systemPrompt.match(/TARGET_LEVEL:\s*(A1|A2|B1|B2|C1|C2)/i) 
                        || prompt.match(/LEVEL:\s*(A1|A2|B1|B2|C1|C2)/i)
                        || prompt.match(/level\s+(A1|A2|B1|B2|C1|C2)/i);
        level = levelMatch ? levelMatch[1].toUpperCase() : 'UNKNOWN';
      }
      
      if (!language) {
          // Simple heuristic fallback if metadata missing
          const langMatch = prompt.match(/in\s+([A-Z][a-z]+)/); 
          language = langMatch ? langMatch[1] : 'UNKNOWN';
      }

      if (!topic) {
         // Simple heuristic to try and find topic
         const topicMatch = prompt.match(/Topic:\s*(.+)/i);
         topic = topicMatch ? topicMatch[1].trim() : null;
      }

      await supabase
        .from('ai_content_cache')
        .insert([
          { 
            hash_key: hashKey, 
            level: level, 
            language: language, 
            topic: topic,
            content_json: content 
          }
        ]);
      console.log('💾 Saved to Global Cache');
    } catch (err) {
       console.error("Cache Write Error:", err.message);
    }
    
    return { content, isCached: false };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`AI Request timed out after 60s`);
    }
    throw error;
  }
}

/**
 * Call AI with fallback support
 */
async function callAIWithFallback(prompt, maxTokens = 200, systemPrompt, overrideCacheKey = null, metadata = {}) {
  let content;
  let usedSource = "Primary";

  try {
    // Pass overrideCacheKey down
    const result = await callAI(
      prompt,
      config.MODEL_PRIMARY,
      config.DEEPSEEK_URL,
      config.DEEPSEEK_API_KEY,
      maxTokens,
      systemPrompt,
      overrideCacheKey, // <--- PASS IT HERE
      metadata
    );
    content = result.content;
    if (result.isCached) usedSource = "Cache";
    
  } catch (primaryError) {
    console.warn("⚠️ Primary API failed:", primaryError.message);
    console.log("🔄 Switching to Fallback (OpenRouter)...");

    try {
      const result = await callAI(
        prompt,
        config.MODEL_FALLBACK,
        config.OPENROUTER_URL,
        config.OPENROUTER_API_KEY,
        maxTokens,
        systemPrompt,
        overrideCacheKey, // <--- PASS IT HERE TOO
        metadata
      );
      content = result.content;
      if (result.isCached) usedSource = "Cache"; 
      else usedSource = "Fallback";

    } catch (fallbackError) {
      console.error("❌ Fallback API also failed:", fallbackError.message);
      throw new Error("Both AI services are unavailable.");
    }
  }

  return { content, usedSource };
}

/**
 * Generate AI Content with JSON Retry Logic
 * Now simplified: just handles retries, caching is handled inside 'callAI'
 */
async function generateWithRetry(prompt, maxTokens, context = "Generation", systemPrompt, overrideCacheKey = null, metadata = {}) {
  console.log(`🏗️ [AI] generateWithRetry started. Key: ${overrideCacheKey}`);
  
  let attempts = 0;
  const maxAttempts = 2;

  // NOTE: We removed the duplicate hashing/checking logic here.
  // It is now fully handled inside 'callAIWithFallback' -> 'callAI'

  while (attempts < maxAttempts) {
    try {
      attempts++;
      // Pass overrideCacheKey down
      const { content, usedSource } = await callAIWithFallback(prompt, maxTokens, systemPrompt, overrideCacheKey, metadata);
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
  getTokenStats: () => sessionStats,
  clearTokenStats: () => { sessionStats = { hits: 0, misses: 0, tokensSaved: 0 }; }
};