const AIService = require("./AIService");

async function generateLesson(level, topic, language) {
  const targetLang = language || "Spanish";
  const lessonId = `${topic}_${level}_${targetLang}_${Date.now()}`;
  console.log(`\n📚 Generating Lesson: "${topic}" [${level}] in ${targetLang}`);

  const prompt = `Role: You are a ${targetLang} Teacher. Level: ${level}.
Task: Create a practical lesson for "${topic}" with 5 diverse quiz questions.

LESSON RULES:
- Focus on common mistakes and practical usage
- Include different sentence structures and contexts
- Mix positive/negative forms, different tenses, formal/informal
- Show correct vs incorrect usage patterns
- Keep explanations concise but helpful

QUIZ RULES:
- RANDOMIZE correct_index (0, 1, or 2) - NOT always 0!
- Each question should test different aspects: word order, verb forms, articles, etc.
- Include both "choose correct" and "identify error" type questions
- Make wrong options believable but clearly incorrect
- All questions completable in 5 minutes total

Output JSON ONLY (no markdown):
{
  "lesson_id": "${lessonId}",
  "title": "${targetLang} title",
  "title_reading": "romanization or empty",
  "introduction": "2 sentences in ${targetLang}",
  "introduction_english": "English translation",
  "key_points": [
    {"target": "point in ${targetLang}", "english": "translation", "reading": "romanization"},
    {"target": "...", "english": "...", "reading": "..."},
    {"target": "...", "english": "...", "reading": "..."}
  ],
  "example": {"text": "example sentence", "translation": "English", "reading": "romanization"},
  "quiz_questions": [
    {
      "question": "question in ${targetLang}",
      "question_english": "English translation",
      "question_reading": "romanization",
      "options": [
        {"target": "option text", "reading": "romanization", "explanation": "1 sentence why correct/wrong", "use_case": "short example"},
        {"target": "...", "reading": "..."},
        {"target": "...", "reading": "..."}
      ],
      "correct_index": 0
    },
    {"question": "Q2", "question_english": "...", "question_reading": "...", "options": [{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0},
    {"question": "Q3", "question_english": "...", "question_reading": "...", "options": [{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0},
    {"question": "Q4", "question_english": "...", "question_reading": "...", "options": [{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0},
    {"question": "Q5", "question_english": "...", "question_reading": "...", "options": [{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."},{"target":"...","reading":"...","explanation":"...","use_case":"..."}], "correct_index": 0}
  ]
}`;

  const { json, usedSource } = await AIService.generateWithRetry(prompt, 3500, "Lesson Generation");

  // Ensure lesson_id is set
  json.lesson_id = json.lesson_id || lessonId;
  json._meta = {
    source: usedSource,
    language: targetLang,
    timestamp: new Date().toISOString(),
  };

  return json;
}

module.exports = {
  generateLesson,
};
