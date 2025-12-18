##🚀 Quick Start
Prerequisites
Node.js (v18 or higher)
npm or yarn
Expo CLI: npm install -g @expo/cli
Mobile device with Expo Go app OR Android Studio/Xcode for simulators
Installation
Clone the repository

git clone <repository-url>
cd ai-language-predictor
Install backend dependencies

cd lang-learning-backend
npm install
Install frontend dependencies

cd ../lang-learning-app
npm install
Environment Setup
Configure backend API keys

cd ../lang-learning-backend
cp .env.example .env  # If example exists, or create new .env
Edit .env and add your API keys:

DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
PORT=3000
Configure frontend API URL (if needed)

cd ../lang-learning-app
Check constants/config.ts and update the API base URL if running on a different port or host:

export const API_BASE_URL = 'http://localhost:3000';
Getting API Keys
DeepSeek API: Sign up at DeepSeek Platform
OpenRouter API: Sign up at OpenRouter (fallback provider)
🏃‍♂️ Running the Application
Start Backend Server
cd lang-learning-backend
npm start
Server will run on http://localhost:3000

Start Frontend App
cd lang-learning-app
npm start
Platform Options
After starting the frontend, choose your platform:

📱 Mobile Device: Scan QR code with Expo Go app
🤖 Android: Press a (requires Android Studio/emulator)
🍎 iOS: Press i (requires Xcode/simulator, macOS only)
🌐 Web: Press w (runs in browser)
📱 Features
Real-time AI Predictions: Type and get intelligent word suggestions
Multi-language Support: Learn Japanese, Spanish, French, and more
Interactive Lessons: AI-generated quizzes with spaced repetition
Conversation Mode: Practice with AI chat partner
Progress Tracking: XP system, streaks, and analytics
Offline Support: Cached lessons work without internet
🛠️ Development Commands
Frontend (lang-learning-app/)
npm start          # Start development server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
npm run lint       # Check code quality
npm run reset-project  # Clear cache and reset
Backend (lang-learning-backend/)
npm start          # Start Express server
npm run dev        # Start with nodemon (if configured)
🏗️ Project Structure
├── lang-learning-app/          # React Native frontend
│   ├── app/(tabs)/            # Main navigation screens
│   ├── components/            # Reusable UI components
│   ├── constants/             # Configuration and themes
│   ├── hooks/                 # Custom React hooks
│   └── db.ts                  # SQLite database operations
├── lang-learning-backend/      # Node.js API server
│   ├── server.js              # Express server with AI endpoints
│   ├── .env                   # Environment variables (API keys)
│   └── package.json           # Dependencies and scripts
🔧 Troubleshooting
Common Issues
"Network request failed"

Ensure backend server is running on http://localhost:3000
Check constants/config.ts for correct API URL
On mobile: Use your computer's IP address instead of localhost
"Missing API Key" errors

Verify .env file exists in lang-learning-backend/
Check API keys are valid and properly formatted
Restart backend server after adding keys
Expo/Metro bundler issues

cd lang-learning-app
npm run reset-project
npm start --clear
SQLite errors on web

Web version uses AsyncStorage fallback
Some features may be limited in browser
Getting Help
Check the console logs in both frontend and backend terminals
Ensure all dependencies are installed with npm install
Try clearing caches with reset commands above
