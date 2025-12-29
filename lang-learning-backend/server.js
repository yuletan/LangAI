const app = require("./src/app");
const config = require("./src/config");

const PORT = config.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔑 DeepSeek Key: ${config.DEEPSEEK_API_KEY ? "Loaded" : "MISSING"}`);
  console.log(`🔑 OpenRouter Key: ${config.OPENROUTER_API_KEY ? "Loaded" : "MISSING"}`);
  console.log(`\n📋 API matches modern modular structure.`);
});
