# LangAI - An AI Language Predictor App

A app that utilises AI to predict, teach and test learners of a new language at different stages of learning.

##  Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Mobile device** with Expo Go app OR **Android Studio/Xcode** for simulators

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd langai
   ```

2. **Install backend dependencies**
   ```bash
   cd lang-learning-backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../lang-learning-app
   npm install
   ```

### Environment Setup

4. **Configure backend API keys**
   ```bash
   cd ../lang-learning-backend
   ```
   
   Create a `.env` file and add your API keys:
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   PORT=3000
   ```

5. **Configure frontend API URL** (if needed)
   ```bash
   cd ../lang-learning-app
   ```
   
   Check `constants/config.ts` and update the API base URL if running on a different port or host:
   ```typescript
   export const API_BASE_URL = 'http://localhost:3000';
   ```

### Getting API Keys

- **DeepSeek API**: Sign up at [DeepSeek Platform](https://platform.deepseek.com/)
- **OpenRouter API**: Sign up at [OpenRouter](https://openrouter.ai/) (fallback provider)

## 🏃‍♂️ Running the Application

### Start Backend Server
```bash
cd lang-learning-backend
npm start
```
Server will run on `http://localhost:3000`

### Start Frontend App
```bash
cd lang-learning-app
npm start
```

### Platform Options

After starting the frontend, choose your platform:

- **📱 Mobile Device**: Scan QR code with Expo Go app
- **🤖 Android**: Press `a` (requires Android Studio/emulator)
- **🍎 iOS**: Press `i` (requires Xcode/simulator, macOS only)
- **🌐 Web**: Press `w` (runs in browser)

## 🛠️ Development Commands

### Frontend (lang-learning-app/)
```bash
npm start          # Start development server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
npm run lint       # Check code quality
npm run reset-project  # Clear cache and reset
```

### Backend (lang-learning-backend/)
```bash
npm start          # Start Express server
```

## 🔧 Troubleshooting

### Common Issues

1. **"Network request failed"**
   - Ensure backend server is running on `http://localhost:3000`
   - Check `constants/config.ts` for correct API URL
   - On mobile: Use your computer's IP address instead of localhost

2. **"Missing API Key" errors**
   - Verify `.env` file exists in `lang-learning-backend/`
   - Check API keys are valid and properly formatted
   - Restart backend server after adding keys

3. **Expo/Metro bundler issues**
   ```bash
   cd lang-learning-app
   npm run reset-project
   npm start --clear
   ```

4. **SQLite errors on web**
   - Web version uses AsyncStorage fallback
   - Some features may be limited in browser

### Core Value Proposition
- **Predictive Learning**: AI suggests next words as users type, accelerating language acquisition
- **Contextual Intelligence**: Adapts suggestions based on tone, difficulty level, and conversation scenarios
- **Gamified Progress**: XP system, streaks, and achievements motivate consistent practice
- **Spaced Repetition**: Smart review system ensures long-term retention of learned phrases

### Target Users
- Language learners (A1-C2 levels)
- Students seeking interactive practice tools
- Professionals needing conversational skills in specific contexts (business, travel, medical)

### Key Features
- Real-time word prediction with confidence scoring
- Multi-language support (10+ languages)
- Tone-aware translations (casual, formal, humorous, academic, sarcastic)
- Scenario-based learning (restaurant, travel, business, medical)
- Spaced repetition flashcard system
- Interactive grammar lessons with AI-generated quizzes
- Progress tracking with activity heatmaps
- Offline caching for improved performance

### Monetization Strategy (To be Implemented)
- Freemium model with daily prediction limits
- Premium subscriptions for unlimited access
- Language pack purchases
- XP boosters and cosmetic upgrades




## Project Structure & Organization

## Root Directory Layout
```
├── lang-learning-app/          # React Native frontend
├── lang-learning-backend/      # Node.js API server
├── requirements.txt            # Python dependencies (if any)
├── TODO & Req.txt             # Project requirements and roadmap
└── AI suggested UI improvements and key features.txt  # Enhancement proposals
```

## Frontend Structure (`lang-learning-app/`)

### Core Application
```
app/
├── (tabs)/                     # Tab-based navigation screens
│   ├── index.tsx              # Main predictor interface
│   ├── explore.tsx            # Learning hub with lessons/flashcards
│   ├── chat.tsx               # Conversation mode
│   ├── dashboard.tsx          # Progress analytics
│   ├── profile.tsx            # User settings
│   └── _layout.tsx            # Tab navigation configuration
├── modal.tsx                  # Modal screens
└── _layout.tsx                # Root layout with theme provider
```

### Components & UI
```
components/
├── ui/                        # Reusable UI components
│   ├── collapsible.tsx        # Expandable sections
│   ├── icon-symbol.tsx        # Cross-platform icons
│   └── icon-symbol.ios.tsx    # iOS-specific icons
├── SkillTree.tsx              # Gamification progress tree
├── themed-text.tsx            # Theme-aware text component
├── themed-view.tsx            # Theme-aware view component
├── parallax-scroll-view.tsx   # Animated scroll container
└── [other components]         # Feature-specific components
```

### Configuration & Constants
```
constants/
├── config.ts                  # API URLs and app configuration
└── theme.ts                   # Color schemes, typography, spacing
```

### Data & Utilities
```
├── db.ts                      # SQLite database operations (native)
├── db.web.ts                  # Web-compatible database fallback
└── hooks/                     # Custom React hooks
    ├── use-color-scheme.ts    # Theme detection
    └── use-theme-color.ts     # Dynamic theming
```

## Backend Structure (`lang-learning-backend/`)
```
├── server.js                  # Express server with AI endpoints
├── package.json               # Dependencies and scripts
├── .env                       # Environment variables (API keys)
└── node_modules/              # Dependencies
```

## Key File Conventions

### Screen Components
- Located in `app/(tabs)/` for main navigation screens
- Use TypeScript with React Native components
- Follow naming pattern: `[feature].tsx`
- Export default function with PascalCase name

### Database Operations
- `db.ts`: Native SQLite operations using expo-sqlite
- `db.web.ts`: Web fallback using AsyncStorage
- Functions use camelCase naming (e.g., `addPhrase`, `getPhrasesForReview`)

### Theming & Styling
- All styles use the centralized theme system from `constants/theme.ts`
- Color references use `Colors["light"]` or `Colors["dark"]`
- Consistent spacing using `Spacing` scale
- Platform-aware shadows and fonts

### API Integration
- Backend endpoints follow REST conventions: `/api/[resource]`
- Frontend uses fetch with proper error handling
- Caching implemented at multiple levels (SQLite, AsyncStorage)
- Circuit breaker pattern for AI provider fallback
