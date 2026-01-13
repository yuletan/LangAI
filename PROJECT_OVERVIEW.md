# LangAI - Project Overview & Context

This document serves as the primary "Source of Truth" for humans and AI agents to understand the LangAI project structure, core logic, and essential files without needing to parse the entire codebase.

---

## 🚀 Project Vision
LangAI is a next-generation language learning application that combines **Predictive Text** (AI-assisted typing) with **CEFR-Aligned Curriculum**. It adapts to the user's proficiency level (A1-C2) using the DIALANG placement methodology and provides real-time feedback.

### Key Value Propositions
1. **Predictive Learning**: Real-time word/phrase suggestions as users type in their target language.
2. **Dynamic CEFR Syllabus**: AI-generated lessons, quizzes, and assessments that strictly follow CEFR benchmarks.
3. **Spiky Profiles**: Tracks individual skill levels (Reading, Listening, Writing, etc.) separately rather than a single "flat" level.
4. **Adaptive Placement**: A "bucket-testing" approach that promotes/demotes users based on performance and confidence scores.

---

## 🛠 Tech Stack
- **Frontend**: Expo (React Native), TypeScript, TanStack Query (State Management), Drizzle ORM (Local SQLite).
- **Backend**: Node.js, Express, DeepSeek AI (Primary), OpenRouter (Fallback).
- **Data**: SQLite (Native/Web), AsyncStorage (Web fallback for local storage).

---

## 📂 Directory Structure

### 🌐 Backend (`/lang-learning-backend`)
- `src/config/`: Configuration and environment variable management.
- `src/controllers/`: Request handlers (parsing inputs, calling services).
- `src/services/`: **Core Business Logic**.
    - `AIService.js`: Wrapper for DeepSeek/OpenRouter with retry logic.
    - `CEFRContentService.js`: Generates CEFR-aligned lessons/quizzes.
    - `CEFRProfileService.js`: Manages "spiky" user profiles.
    - `DIALANGPlacementService.js`: Adaptive testing algorithms.
- `src/routes/`: API endpoint definitions (mapped to controllers).
- `server.js`: Entry point.

### 📱 Frontend (`/lang-learning-app`)
- `app/(tabs)/`: Primary screens (Predictor, Explore, Chat, Dashboard, Profile).
- `components/`: UI components (SkillTree, PronunciationHelper, etc.).
- `db/`: Data layer.
    - `schema.ts`: Drizzle table definitions.
    - `actions.ts`: Database CRUD operations.
- `hooks/`: Custom TanStack Query hooks for state/data fetching.
- `services/`: Frontend-side logic (SRS Algorithm, Gamification).
- `constants/`: Theme, CEFR guides, and game data.

---

## 🧩 Bare Minimum Files for Context
If you are an AI or a developer trying to understand the project quickly, focus on these files:

### 1. The Core Infrastructure
- `lang-learning-backend/src/services/AIService.js`: How the app talks to AI.
- `lang-learning-app/db/schema.ts`: The data model for users, phrases, and progress.

### 2. The CEFR Engine (The "Brain")
- `lang-learning-backend/src/services/CEFRContentService.js`: The logic for generating "Truth" content.
- `CEFR_API_REFERENCE.md`: Comprehensive API documentation for all endpoints.
- `CEFR_IMPLEMENTATION_CODE.md`: Detailed breakdown of the CEFR system components.

### 3. The Main User Interfaces
- `lang-learning-app/app/(tabs)/index.tsx`: The Predictor interface (Main Tab).
- `lang-learning-app/app/(tabs)/explore.tsx`: The Learning Hub (Lessons/Quizzes).

---

## 🧠 Fundamental Logic
- **SM-2 Algorithm**: Located in `lang-learning-app/services/srsAlgorithm.ts`. Controls spaced repetition for learned phrases.
- **DIALANG Algorithm**: Located in `lang-learning-backend/src/services/DIALANGPlacementService.js`. Handles adaptive level adjustments based on confidence weighting.
- **Predictive Flow**: Frontend typing triggers a call to `/api/predict`, which uses `AIService` to get context-aware suggestions.

---

## 🚦 Getting Started
1. **Backend**: `cd lang-learning-backend && npm start` (Requires `.env` with `DEEPSEEK_API_KEY`).
2. **Frontend**: `cd lang-learning-app && npm start` (Use `a` for Android, `w` for Web).

**Status**: Version 2.0 (Modernized with Drizzle & CEFR integration).
