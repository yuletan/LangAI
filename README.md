# LangAI - An AI Language Predictor App

A React Native language learning application that uses AI to predict the next words users might want to type, helping them learn languages through contextual suggestions and interactive lessons.

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

## Data Flow Patterns

### User Input → AI Prediction
1. User types in main input field (`index.tsx`)
2. Smart trigger logic determines when to call API
3. Cache check before API call (`db.ts`)
4. API call with fallback handling (`server.js`)
5. Response cached and displayed with animations

### Spaced Repetition System
1. Phrases saved to SQLite with SRS metadata
2. Review scheduler calculates due dates
3. `explore.tsx` displays due cards
4. User ratings update SRS intervals
5. Progress tracked in analytics

### Lesson Generation
1. Dynamic lesson requests to `/api/lessons`
2. AI generates structured quiz content
3. Lessons cached locally for offline access
4. Progress tracked and XP awarded
5. Completion triggers level progression checks
