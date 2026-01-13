const fs = require('fs');
const path = require('path');
const AIService = require('../src/services/AIService');

// Mock global fetch
global.fetch = async (url, options) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
        ok: true,
        json: async () => ({
            choices: [{
                message: {
                    content: JSON.stringify({
                        mock_response: "This is a generated response",
                        random: Math.random()
                    })
                }
            }]
        })
    };
};

async function runTest() {
    console.log("🧪 Starting Token Saving Strategy Test...");
    
    // Reset session stats
    AIService.clearTokenStats();
    
    const prompt = "Generate a A1 lesson for Spanish " + Date.now();
    const systemPrompt = "System Prompt";
    
    console.log(`\n📝 Using Prompt: "${prompt}"`);
    
    console.log("\n--- REQUEST 1 (Should hit API) ---");
    await AIService.callAI(prompt, "mock-model", "http://mock-url", "mock-key", 100, systemPrompt);
    
    console.log("\n--- REQUEST 2 (Should be Cached) ---");
    await AIService.callAI(prompt, "mock-model", "http://mock-url", "mock-key", 100, systemPrompt);
    
    console.log("\n--- REQUEST 3 (Should be Cached) ---");
    await AIService.callAI(prompt, "mock-model", "http://mock-url", "mock-key", 100, systemPrompt);
    
    const stats = AIService.getTokenStats();
    console.log("\n📊 Test Results:");
    console.log(`Total Requests: ${stats.hits + stats.misses}`);
    console.log(`Cache Hits: ${stats.hits}`);
    console.log(`Cache Misses (API Calls): ${stats.misses}`);
    console.log(`Estimated Tokens Saved: ${stats.tokensSaved}`);
    
    if (stats.hits === 2 && stats.misses === 1) {
        console.log("\n✅ SUCCESS: Caching strategy is working as intended!");
        // hits / total
        const savings = (stats.hits / (stats.hits + stats.misses)) * 100;
        console.log(`Savings: ${savings.toFixed(2)}% of requests were served from cache.`);
    } else {
        console.log("\n❌ EXCEPTION: Unexpected results.");
    }
}

runTest().catch(console.error);
