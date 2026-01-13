/**
 * Clean JSON Parser
 * Handles Markdown backticks from AI responses
 */
function parseAIResponse(content) {
  try {
    // Attempt to find JSON within code blocks first
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const clean = jsonMatch ? jsonMatch[1].trim() : content.trim();
    
    // Remove any remaining markdown bolding or characters that might break JSON
    // but keep it conservative to avoid breaking valid content
    return JSON.parse(clean);
  } catch (e) {
    // If first pass fails, try a more aggressive extraction (finding first { and last })
    try {
      const startIndex = content.indexOf('{');
      const endIndex = content.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const potentialJson = content.substring(startIndex, endIndex + 1);
        return JSON.parse(potentialJson);
      }
    } catch (innerError) {
      console.error("❌ Deep JSON Parse Failed:", innerError.message);
    }
    
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
 * CEFR Content Validator
 * Implements Section 7: Validation Rules
 */
function validateCEFRContent(content, level) {
  const flags = [];
  const levelUpper = level ? level.toUpperCase() : "A1";

  // Handle both single objects and arrays
  const items = Array.isArray(content) ? content : [content];

  items.forEach((item) => {
    // 1. Sentence Length Heuristic
    const sentences = item.passage ? item.passage.split(/[.!?]+/) : [];
    if (item.question) sentences.push(item.question);
    if (item.sentence) sentences.push(item.sentence);

    sentences.forEach((s) => {
      const wordCount = s.trim().split(/\s+/).filter(Boolean).length;
      if (levelUpper === "A1" && wordCount > 15) {
        flags.push(`Sentence exceeds 15 words for A1: "${s.substring(0, 30)}..."`);
      } else if (levelUpper === "A2" && wordCount > 20) {
        flags.push(`Sentence exceeds 20 words for A2: "${s.substring(0, 30)}..."`);
      }
    });

    // 2. Structure Check
    if (item.options) {
      const expectedOptions = levelUpper === "A1" ? 3 : 4;
      if (item.options.length !== expectedOptions) {
        flags.push(`Expected ${expectedOptions} options for ${levelUpper}, but got ${item.options.length}`);
      }
    }
  });

  return {
    isValid: flags.length === 0,
    flags: flags,
  };
}

module.exports = {
  parseAIResponse,
  estimateTokens,
  validateCEFRContent,
};
