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

module.exports = {
  parseAIResponse,
  estimateTokens,
};
