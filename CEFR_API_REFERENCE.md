# CEFR API Quick Reference

Quick reference guide for all CEFR API endpoints.

---

## 🔗 Base URL

```
http://localhost:3000/api/cefr
```

---

## 📋 Profile Management

### Create Profile
```http
POST /api/cefr/profile
Content-Type: application/json

{
  "userId": "user123",
  "initialLevel": "A1"  // optional, defaults to A1
}
```

### Update Skill
```http
PUT /api/cefr/profile/skill
Content-Type: application/json

{
  "profile": { /* user profile object */ },
  "skillName": "listening",
  "newLevel": "B1",
  "isPlusLevel": true,
  "confidenceScore": 0.85,
  "eventType": "placement_test"
}
```

### Get Recommendation
```http
POST /api/cefr/profile/recommend
Content-Type: application/json

{
  "profile": { /* user profile object */ },
  "focusSkill": "reading"  // optional
}
```

### Get Weakest Skill
```http
POST /api/cefr/profile/weakest
Content-Type: application/json

{
  "profile": { /* user profile object */ }
}
```

### Generate Lesson from Profile
```http
POST /api/cefr/profile/generate-lesson
Content-Type: application/json

{
  "profile": { /* user profile object */ },
  "language": "Spanish",
  "focusSkill": "listening"  // optional
}
```

### Validate Profile
```http
POST /api/cefr/profile/validate
Content-Type: application/json

{
  "profile": { /* user profile object */ }
}
```

---

## 🎯 Placement Testing

### Start Placement (Get Descriptors)
```http
GET /api/cefr/placement/start?skill=listening
```

### Get Self-Assessment Descriptors
```http
GET /api/cefr/placement/descriptors
```

### Create Placement Session
```http
POST /api/cefr/placement/session
Content-Type: application/json

{
  "userId": "user123",
  "selfAssessedLevel": "B1",
  "language": "Spanish",
  "skill": "listening"
}
```

### Submit Responses
```http
POST /api/cefr/placement/submit
Content-Type: application/json

{
  "session": { /* session object from create */ },
  "responses": [
    {
      "question_id": "placement_B1_listening_1",
      "user_answer": 2,
      "is_correct": true,
      "confidence": "HIGH"
    }
  ],
  "language": "Spanish"
}
```

### Finalize Placement
```http
POST /api/cefr/placement/finalize
Content-Type: application/json

{
  "session": { /* completed session object */ },
  "userProfile": { /* user profile object */ }
}
```

### Generate Questions (Testing)
```http
POST /api/cefr/placement/questions
Content-Type: application/json

{
  "level": "B1",
  "language": "Spanish",
  "skill": "listening"
}
```

---

## 📝 Content Generation

### Generate CEFR Content
```http
POST /api/cefr/content/generate
Content-Type: application/json

{
  "targetLevel": "B1",
  "language": "Spanish",
  "domain": "public",
  "topic": "travel",
  "contentType": "reading"
}
```

### Generate Vocabulary Lesson
```http
POST /api/cefr/content/vocabulary
Content-Type: application/json

{
  "targetLevel": "B1",
  "language": "Spanish",
  "topic": "travel",
  "wordCount": 10
}
```

### Generate Grammar Lesson
```http
POST /api/cefr/content/grammar
Content-Type: application/json

{
  "targetLevel": "B1",
  "language": "Spanish",
  "grammarPoint": "present perfect"
}
```

### Generate Complete Lesson
```http
POST /api/cefr/content/lesson
Content-Type: application/json

{
  "target_level": "B1",
  "language": "Spanish",
  "target_skill": "reading",
  "lesson_type": "CONSOLIDATION",
  "domains": ["public"],
  "focus_areas": ["travel"]
}
```

### Get ALTE Statement
```http
GET /api/cefr/content/alte-statement?level=B1
```

---

## ✅ Assessment

### Assess User Response
```http
POST /api/cefr/assess/response
Content-Type: application/json

{
  "userInput": "Mi viaje a Madrid fue muy interesante...",
  "targetLevel": "B1",
  "questionContext": "Write about a recent trip",
  "skill": "writing"
}
```

### Evaluate Quiz
```http
POST /api/cefr/assess/quiz
Content-Type: application/json

{
  "questions": [
    {
      "id": "q1",
      "user_answer": 2,
      "correct_index": 2,
      "confidence": "HIGH"
    }
  ],
  "targetLevel": "B1"
}
```

### Assess Writing
```http
POST /api/cefr/assess/writing
Content-Type: application/json

{
  "writingText": "Mi viaje a Madrid fue muy interesante...",
  "targetLevel": "B1",
  "prompt": "Write about a recent trip"
}
```

### Assess Speaking
```http
POST /api/cefr/assess/speaking
Content-Type: application/json

{
  "transcription": "Hola, me llamo Juan y vivo en Barcelona...",
  "targetLevel": "B1",
  "prompt": "Introduce yourself"
}
```

---

## 📊 Response Format

All endpoints return:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "metadata": {
    "timestamp": "2026-01-05T15:30:00.000Z",
    "source": "Primary"  // for AI-generated content
  }
}
```

Error response:

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🎨 Constants

### CEFR Levels
```
A1, A2, B1, B2, C1, C2
```

### Skills
```
listening, reading, spoken_interaction, spoken_production, writing
```

### Domains
```
personal, public, occupational, educational
```

### Confidence Levels
```
LOW, MEDIUM, HIGH
```

### Lesson Types
```
CONSOLIDATION, BRIDGE_TO_NEXT, LEVEL_UP
```

---

## 🔄 Typical Workflow

### 1. New User Onboarding

```javascript
// Step 1: Create profile
POST /api/cefr/profile
{ "userId": "user123", "initialLevel": "A1" }

// Step 2: Start placement
GET /api/cefr/placement/start?skill=listening

// Step 3: User self-assesses (frontend shows descriptors)
// User selects "B1"

// Step 4: Create placement session
POST /api/cefr/placement/session
{ "userId": "user123", "selfAssessedLevel": "B1", "language": "Spanish", "skill": "listening" }

// Step 5: User answers 5 questions with confidence
POST /api/cefr/placement/submit
{ "session": {...}, "responses": [...], "language": "Spanish" }

// Step 6: Finalize placement
POST /api/cefr/placement/finalize
{ "session": {...}, "userProfile": {...} }

// Result: User profile updated with listening: B1+, confidence: 0.84
```

### 2. Generate Personalized Lesson

```javascript
// Step 1: Get recommendation
POST /api/cefr/profile/recommend
{ "profile": {...} }

// Returns: { target_skill: "reading", target_level: "B1", lesson_type: "CONSOLIDATION" }

// Step 2: Generate lesson
POST /api/cefr/profile/generate-lesson
{ "profile": {...}, "language": "Spanish" }

// Returns: Complete lesson with content, vocabulary, and quiz
```

### 3. Assess Performance

```javascript
// Step 1: User completes quiz
POST /api/cefr/assess/quiz
{ "questions": [...], "targetLevel": "B1" }

// Returns: { total_score: 85, level_mastery: "PROFICIENT", recommendation: "PLUS_LEVEL" }

// Step 2: Update profile based on performance
PUT /api/cefr/profile/skill
{ "profile": {...}, "skillName": "reading", "newLevel": "B1", "isPlusLevel": true, "confidenceScore": 0.85 }
```

---

## 🧪 Testing with cURL

### Create Profile
```bash
curl -X POST http://localhost:3000/api/cefr/profile \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","initialLevel":"A1"}'
```

### Start Placement
```bash
curl http://localhost:3000/api/cefr/placement/start?skill=listening
```

### Generate Content
```bash
curl -X POST http://localhost:3000/api/cefr/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "targetLevel":"B1",
    "language":"Spanish",
    "domain":"public",
    "topic":"travel",
    "contentType":"reading"
  }'
```

---

## 📖 See Also

- **Full Documentation**: `CEFR_IMPLEMENTATION_CODE.md`
- **File Summary**: `CEFR_FILES_SUMMARY.md`
- **Implementation Plan**: `implementation_plan.md`
- **TypeScript Types**: `lang-learning-app/types/cefr.types.ts`

---

**Last Updated**: 2026-01-05  
**API Version**: 1.0.0
