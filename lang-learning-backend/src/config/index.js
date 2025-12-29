require("dotenv").config();

module.exports = {
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  DEEPSEEK_URL: "https://api.deepseek.com/v1/chat/completions",
  OPENROUTER_URL: "https://openrouter.ai/api/v1/chat/completions",
  MODEL_PRIMARY: "deepseek-chat",
  MODEL_FALLBACK: "deepseek/deepseek-chat",
  PORT: process.env.PORT || 3000,
};
