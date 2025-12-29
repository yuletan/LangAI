const AIService = require("../services/AIService");

async function chat(req, res) {
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

    const { json, usedSource } = await AIService.generateWithRetry(prompt, 400, "Chat");

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
}

module.exports = {
  chat,
};
