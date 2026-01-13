/**
 * CEFR Content Generation Service
 * Generates linguistically accurate, CEFR-aligned learning content
 * Based on implementation_plan.md specification
 */

const AIService = require("./AIService");

// CEFR Domains (official framework)
const CEFR_DOMAINS = {
  PERSONAL: "personal",
  PUBLIC: "public",
  OCCUPATIONAL: "occupational",
  EDUCATIONAL: "educational"
};

const CEFR_CONFIG = {
  A1: {
    grammar: "Present Simple (be/have/do), Basic imperatives, Question words, Definite/Indefinite articles, Personal pronouns, Basic prepositions (in/on/at/under)",
    vocabulary: "Numbers 1-100, Colors, Family members, Daily objects, Greetings, Time/Days, Common verbs (go/eat/see)",
    topics: "Self-introduction, Daily routine, Family, Shopping for essentials",
    options: 3,
  },
  A2: {
    grammar: "Past Simple (regular/irregular), Future with 'going to' vs 'will', Modal verbs (can/must/should), Comparative/Superlative, Adverbs of frequency, Connectors (and/but/because)",
    vocabulary: "Home environment, Education, Food and drink, Simple work-related terms, Leisure activities, Physical appearance",
    topics: "Describing past events, Making plans, Simple social interactions, Giving directions",
    options: 4,
  },
  B1: {
    grammar: "Present Perfect (simple/continuous), First/Second Conditionals, Passive Voice (simple tenses), Relative clauses (who/which/that), Used to / Get used to",
    vocabulary: "Ambition, Environment, Travel, Health/Wellness, Media, Feelings/Opinions, Reporting verbs",
    topics: "Abstract matters, Cultural topics, Advice-giving, Predicting future outcomes, Narrative description",
  },
  B2: {
    grammar: "Third Conditional / Mixed Conditionals, Passive (all forms), Reported Speech, Modal verbs of deduction (must have/could have), Wish / If only, Gerunds & Infinitives",
    vocabulary: "Technical terminology, Collocations, Phrasal verbs, Academic discourse, Abstract concepts (justice, freedom, economy)",
    topics: "Detailed argumentation, Speculating about the past, Professional presentations, Interpreting complex instructions",
  },
  C1: {
    grammar: "Inversion for emphasis, Cleft sentences, Subjunctive mood, Nuanced modal usage, Participle clauses, Complex relative clauses",
    vocabulary: "Idiomatic expressions, Nuanced register (formal/informal), Phrasal verbs (sophisticated), Academic/Professional jargon",
    topics: "Complex social issues, Scientific discourse, Literary analysis, Nuanced negotiation, Recognizing implicit meaning",
  },
  C2: {
    grammar: "Full command of all grammatical shifts, Stylistic variation for effect, Rhetorical devices",
    vocabulary: "Shades of meaning, Culturally specific idioms, Archaic vs Modern usage, Precise professional lexicons",
    topics: "Critical analysis, Spontaneous/Fluent debating, Synthesizing multiple sources of information",
  },
};

// Expanded ALTE Can-Do Statements (CEFR-aligned)
const ALTE_CAN_DO_STATEMENTS = {
  A1: [
    "Can understand basic instructions or take part in a basic factual conversation on a predictable topic.",
    "Can ask for and give directions referring to a map or plan.",
    "Can make simple purchases where pointing or other gestures can support what is said.",
    "Can provide basic personal information (name, age, nationality, address) in a simple interview."
  ],
  A2: [
    "Can express simple opinions or requirements in a familiar context.",
    "Can understand straightforward information within a known area.",
    "Can complete forms and write short simple letters or postcards related to personal information.",
    "Can describe their background and environment in simple terms."
  ],
  B1: [
    "Can express opinions on abstract/cultural matters in a limited way or offer advice within a known area.",
    "Can understand routine information and articles, and the general meaning of non-routine information within a familiar area.",
    "Can write letters or make notes on familiar or predictable matters.",
    "Can deal with most situations likely to arise while travelling in an area where the language is spoken."
  ],
  B2: [
    "Can follow or give a talk on a familiar topic or keep up a conversation on a fairly wide range of topics.",
    "Can scan texts for relevant information, and understand detailed instructions or advice.",
    "Can make notes while someone is talking or write a letter including non-standard requests.",
    "Can interact with a degree of fluency and spontaneity that makes regular interaction with native speakers quite possible."
  ],
  C1: [
    "Can contribute effectively to meetings and seminars or give a clear presentation on a complex subject.",
    "Can understand documents, correspondence and reports, including the finer points of complex texts.",
    "Can write letters on any subject and full notes of meetings or seminars with good expression and accuracy.",
    "Can express themselves fluently and spontaneously without much obvious searching for expressions."
  ],
  C2: [
    "Can advise on or talk about complex or sensitive issues, understanding colloquial references.",
    "Can understand virtually everything heard or read with ease, including abstract, structurally or linguistically complex texts.",
    "Can express themselves spontaneously, very fluently and precisely, differentiating finer shades of meaning even in the most complex situations.",
    "Can convey finer shades of meaning precisely even in more complex situations."
  ]
};

/**
 * Content Generation System Prompt (from implementation_plan.md)
 * This prompt is used verbatim as specified
 */
const CONTENT_GENERATION_SYSTEM_PROMPT = `You are an expert CEFR content generator for a language learning application. 
Your goal is to generate "Truth" content—linguistically accurate material that strictly adheres to the Common European Framework of Reference for Languages.

### INSTRUCTIONS:

1. **Contextual grounding**: 
   - Use **CEFR Table 1 (Global Scale)** to determine the complexity of the text features (sentence length, concrete vs. abstract topics).
   - Use **Appendix D (ALTE Can Do Statements)** to create the scenario.
   
2. **Linguistic Constraints**:
   - **Grammar**: Strictly focus on {{GRAMMAR_BENCHMARKS}}.
   - **Vocabulary**: Limit to level-appropriate lexemes: {{VOCABULARY_BENCHMARKS}}.
   - **Topics**: Align with {{TOPIC_BENCHMARKS}}.
   - **Fallback Strategy**: If specific RLD list is ambiguous, strictly adhere to the Oxford 3000/5000 keywords for the target level {{TARGET_LEVEL}}.
   - Do NOT use idioms or phrasal verbs unless they are explicitly listed in the {{TARGET_LEVEL}} frequency list.

3. **Task Generation**:
   Generate a scenario based on the following:
   - **Domain**: {{USER_INTEREST_DOMAIN}} (Personal, Public, Occupational, Educational)
   - **ALTE Statement**: "{{ALTE_CAN_DO}}"
   
4. **STRICT LANGUAGE RULES**:
   - **NO ENGLISH IN VISIBLE TEXT**: The "question" and "options" must be 100% in the target language.
   - **A1/A2 REQUIREMENT**: You MUST provide Romanization/Pinyin/Reading for:
     1. The Question -> populate "question_reading".
     2. The Options -> append Romanization in parens e.g. "月 (Tsuki)".
   - **B1+ REQUIREMENT**: Pure target language. No English/Romanization in visible fields.
   - **English Fields**: English is permitted ONLY in the hidden "english_translation" and "question_english" fields for grading/hint purposes.

5. **COMPOSITE LESSON REQUIREMENT**:
   You must generate a complete lesson package containing:
   1. **VOCABULARY**: Key terms for the lesson.
   2. **LISTENING SECTION**: A conversation/monologue script + questions.
   3. **READING SECTION**: A short text passage + questions.
   4. **PRACTICE QUIZ**: Mixed grammar/inference questions.

6. **Output Format**:
   Return a SINGLE JSON object with this structure:
   {
     "type": "composite_lesson",
     "vocabulary": [
       { "word": "TargetWord", "translation": "English", "example": "Sentence in Target" }
     ],
     "listening_task": {
       "audio_script": "The spoken text here...",
       "questions": [
         { "question": "Q1...", "options": ["..."], "correct_index": 0 }
       ]
     },
     "reading_task": {
       "scenario_text": "The reading passage here...",
       "questions": [
         { "question": "Q1...", "options": ["..."], "correct_index": 0 }
       ]
     },
     "practice_quiz": [
       { "type": "cloze", "question": "...", "options": ["..."], "correct_index": 0 },
       { "type": "inference", "question": "...", "options": ["..."], "correct_index": 0 },
       { "type": "comprehension", "question": "...", "options": ["..."], "correct_index": 0 }
     ]
   }`;

const LEVEL_UP_TEMPLATE = `Task: Generate a 20-question Mastery Assessment in {{LANGUAGE}} for {{LEVEL}} learners.
This is a GATEWAY quiz to unlock the next level. Questions must be challenging but fair for {{LEVEL}}.

STRICT RULES:
1. Cover Grammar (7), Vocabulary (7), and Comprehension/Inference (6).
2. For passages (Reading/Listening), you can include 2-3 questions per passage to reach the total of 20.
3. All text MUST be in {{LANGUAGE}}. 
3. Include specific 'explanation' for EVERY option (why it's correct/incorrect).
4. For A1/A2 level: Include 'reading' (romanization) for all text.
5. Provide English translations ONLY for A1/A2 level questions. For B1+, keep questions in {{LANGUAGE}}.
6. **Variety**: Use a mix of "multiple_choice", "cloze" (fill-in-blank), and "inference" types.

Target Grammar: {{GRAMMAR_BENCHMARKS}}
Target Vocabulary: {{VOCABULARY_BENCHMARKS}}
Target Focus Topics: {{TOPIC_BENCHMARKS}}

Output JSON:
{
  "introduction": "Welcome to the {{LEVEL}} Mastery Gateway. Pass this to reach {{NEXT_LEVEL}}!",
  "quiz_questions": [
    {
      "type": "cloze", // or "multiple_choice", "inference"
      "question": "Question text {{LANGUAGE}} (e.g. 'I went ___ the store')",
      "question_reading": "Romanization if A1/A2",
      "question_english": "English translation",
      "options": [
        { "target": "Option A", "reading": "Reading", "explanation": "Why correct/incorrect" },
        { "target": "Option B", "reading": "Reading", "explanation": "Why correct/incorrect" },
        // ... 4 options total
      ],
      "correct_index": 0
    }
  ]
}`;

/**
 * Generates CEFR-aligned learning content
 * @param {string} targetLevel - CEFR level (A1-C2)
 * @param {string} language - Target language
 * @param {string} domain - CEFR domain (personal, public, occupational, educational)
 * @param {string} topic - Specific topic within domain
 * @param {string} contentType - Type of content (reading, dialogue, listening)
 * @returns {Promise<Object>} Generated content with metadata
 */
async function generateContent(targetLevel, language, domain, topic, contentType = "reading") {
  // 1. Select ALTE Statement (Keep this for the prompt, but DO NOT use for cache key)
  const alteCandoStatements = ALTE_CAN_DO_STATEMENTS[targetLevel] || ALTE_CAN_DO_STATEMENTS.A1;
  const alteStatement = alteCandoStatements[Math.floor(Math.random() * alteCandoStatements.length)];
  
  // Get level config
  const levelConfig = CEFR_CONFIG[targetLevel] || CEFR_CONFIG.A1;
  
  // 2. CONSTRUCT DETERMINISTIC CACHE KEY
  // This ensures that "A1 + Spanish + Family + Reading" ALWAYS has the same Hash.
  // We exclude the random ALTE statement and specific ALTE text from this key.
  const cacheKey = `cefr_${language}_${targetLevel}_${domain}_${topic}_${contentType}`;
  
  // 3. Prepare system prompt with variables (Include randomness here)
  // Note: We add the ALTE statement HERE, so the AI gets context, but the Cache Key is already fixed.
  const systemPrompt = CONTENT_GENERATION_SYSTEM_PROMPT
    .replace(/{{TARGET_LEVEL}}/g, () => targetLevel)
    .replace(/{{USER_INTEREST_DOMAIN}}/g, () => domain)
    .replace(/{{ALTE_CAN_DO}}/g, () => alteStatement) // Randomness goes here
    .replace(/{{GRAMMAR_BENCHMARKS}}/g, () => levelConfig.grammar)
    .replace(/{{VOCABULARY_BENCHMARKS}}/g, () => levelConfig.vocabulary || "Standard RLDs")
    .replace(/{{TOPIC_BENCHMARKS}}/g, () => levelConfig.topics || topic);
  // User prompt
  // User prompt logic
  let userPrompt = "";
  const finalType = contentType;

  if (contentType === "simple_sentence") {
      userPrompt = `Generate a SINGLE SENTENCE practice question for ${targetLevel} level in ${language}.
Topic: ${topic}
1. Create ONE standalone sentence with a grammar or vocabulary focus.
2. Generate EXACTLY 1 multiple choice question about the sentence.
3. Provide 4 answer options.
4. All content must be in ${language}. NO ENGLISH.

Output JSON:
{
  "type": "simple_sentence",
  "sentence": "The practice sentence...",
  "quiz_items": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correct_index": 0 }
  ]
}`;
  } else if (contentType === "composite") {
      userPrompt = `Generate a COMPLETE COMPOSITE LESSON for ${targetLevel} level in ${language}.
Topic: ${topic}
Domain: ${domain}
ALTE Can-Do: "${alteStatement}"

Requirements:
1. **Vocabulary**: 5-8 key words related to "${topic}".
2. **Listening**: A natural conversation script + EXACTLY 3 questions.
3. **Reading**: A short passage + EXACTLY 3 questions.
4. **Quiz**: EXACTLY 4 mixed questions (1 cloze, 1 inference, 1 comprehension, 1 open-ended).

STRICTLY FOLLOW THE "COMPOSITE LESSON" JSON FORMAT.`;
  } else if (contentType === "listening") {
      userPrompt = `Generate a LISTENING exercise for ${targetLevel} level in ${language}.
Topic: ${topic}
1. Create natural conversations/monologues (audio_scripts). These should be longer and more cohesive.
2. Generate EXACTLY 2-3 comprehension questions total.
3. Questions should be grouped by audio script.
4. All questions and options must be in ${language}. NO ENGLISH.
5. STICK TO LISTENING ONLY. Do NOT include vocabulary or reading passages.

Output JSON:
{
  "type": "listening",
  "quiz_items": [
    { 
      "question": "...", 
      "options": ["...", "...", "...", "..."], 
      "correct_index": 0,
      "audio_script": "Full spoken text for this specific question..." 
    }
  ]
}`;
  } else if (contentType === "reading") {
      userPrompt = `Generate a READING exercise for ${targetLevel} level in ${language}.
Topic: ${topic}
1. Create reading passages (scenario_texts). These should be longer and more cohesive.
2. Generate EXACTLY 2-3 comprehension questions total.
3. Questions should be grouped by scenario text.
4. All questions and options must be in ${language}. NO ENGLISH.
5. STICK TO READING ONLY. Do NOT include vocabulary or listening scripts.

Output JSON:
{
  "type": "reading",
  "quiz_items": [
    { 
      "question": "...", 
      "options": ["...", "...", "...", "..."], 
      "correct_index": 0,
      "scenario_text": "The reading passage for this specific question..." 
    }
  ]
}`;
  } else if (contentType === "drill") {
      userPrompt = `Generate 5 independent MIXED QUIZ questions for ${targetLevel} level in ${language}.
Topic: ${topic}
Question types to include: cloze, inference, comprehension.
NO SCENARIO TEXT. Just 5 independent questions.
All in ${language}. NO ENGLISH.
STICK TO DRILL ONLY. Do NOT include vocabulary, reading passages, or listening scripts.

Output JSON:
{
  "type": "drill",
  "quiz_items": [
    { "type": "cloze", "question": "...", "options": ["...", "...", "...", "..."], "correct_index": 0 },
    { "type": "inference", "question": "...", "options": ["...", "...", "...", "..."], "correct_index": 0 }
  ]
}`;
  } else if (contentType === "cloze") {
      userPrompt = `Generate 5 CLOZE (Fill-in-the-blank) questions for ${targetLevel} level in ${language}.
Topic: ${topic}
Focus: Grammar or Vocabulary context.
All in ${language}. NO ENGLISH.

Output JSON:
{
  "type": "cloze",
  "quiz_items": [
    { "type": "cloze", "question": "Sentence with ___ blank.", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_index": 0 }
  ]
}`;
  } else if (contentType === "inference") {
      userPrompt = `Generate 5 INFERENCE questions for ${targetLevel} level in ${language}.
Topic: ${topic}
Task: Provide a short context sentence, then ask what is implied or likely true.
All in ${language}. NO ENGLISH.

Output JSON:
{
  "type": "inference",
  "quiz_items": [
    { "type": "inference", "question": "Context sentence. Question about implication?", "options": ["...", "...", "...", "..."], "correct_index": 0 }
  ]
}`;
  } else {
      userPrompt = `Generate a ${contentType} scenario for ${targetLevel} level in ${language}.
Topic: ${topic}
Domain: ${domain}
ALTE Can-Do: "${alteStatement}"`;
  }

  // Output format reminder for legacy types
  const outputFormat = (contentType === "composite" || contentType === "listening" || contentType === "reading" || contentType === "drill" || contentType === "simple_sentence") ? "" : `
Output JSON:
{
  "type": "${finalType}",
  "quiz_items": [...]
}`;

console.log(`🔑 [CEFR] Generated Cache Key: ${cacheKey}`); // LOG 1
  try {
    console.log(`📡 [CEFR] Calling AIService...`); // LOG 2
    const { json, usedSource } = await AIService.generateWithRetry(
      userPrompt + outputFormat,
      3000,
      "CEFR Content Generation",
      systemPrompt,
      cacheKey,
      { level: targetLevel, language: language, topic: topic }
    );
  console.log(`📥 [CEFR] Response received. Source: ${usedSource}`); // LOG 3
    // Partial Caching: If cached composite lesson, regenerate quiz for freshness
    if (usedSource === "Cache" && contentType === "composite" && json.vocabulary) {
      console.log("♻️ Cache Hit for Composite Lesson - Regenerating Practice Quiz...");
      try {
        // Construct prompt for just the quiz, using the cached vocabulary context
        const vocabList = json.vocabulary.map(v => v.word).join(", ");
        const quizPrompt = `Generate 4 fresh MIXED QUIZ questions for ${targetLevel} level in ${language}.
Topic: ${topic}
Context keys: ${vocabList}
Question types: 1 cloze, 1 inference, 1 comprehension, 1 open-ended.
All in ${language}. NO ENGLISH (except for A1/A2 support).
Output JSON: { "type": "drill", "quiz_items": [...] }`;

        const quizResult = await AIService.generateWithRetry(
          quizPrompt, 
          1500, 
          "Partial Cache Refresh - Quiz", 
          "You are a CEFR quiz generator.",
          null, // No override key needed for this sub-task usually, or we could generate one
          { level: targetLevel, language: language, topic: topic }
        );
        
        if (quizResult.json && quizResult.json.quiz_items) {
           json.practice_quiz = quizResult.json.quiz_items;
           console.log("✅ Practice Quiz Refreshed!");
        }
      } catch (refreshError) {
        console.warn("⚠️ Failed to refresh quiz for cached lesson, using cached quiz:", refreshError.message);
      }
    }
    
    return {
      content: json,
      metadata: {
        level: targetLevel,
        language: language,
        domain: domain,
        topic: topic,
        content_type: contentType,
        alte_statement: alteStatement,
        generated_at: new Date().toISOString(),
        source: usedSource
      }
    };
  } catch (error) {
    console.error("Failed to generate CEFR content:", error);
    throw error;
  }
}

/**
 * Generates vocabulary lesson for specific CEFR level
 * @param {string} targetLevel - CEFR level
 * @param {string} language - Target language
 * @param {string} topic - Topic area
 * @param {number} wordCount - Number of words to include
 * @returns {Promise<Object>} Vocabulary lesson
 */
async function generateVocabularyLesson(targetLevel, language, topic, wordCount = 10) {
  const levelConfig = CEFR_CONFIG[targetLevel] || CEFR_CONFIG.A1;
  const systemPrompt = `You are a CEFR vocabulary expert. Generate vocabulary lists that strictly adhere to ${targetLevel} level constraints.
 
Use Oxford 3000/5000 frequency lists as reference.
Grammar/Morphology focus: ${levelConfig.grammar}
Vocabulary scope: ${levelConfig.vocabulary}
Ensure words are appropriate for the target level and topic.`;

  const userPrompt = `Generate a vocabulary lesson for ${targetLevel} level in ${language}.

Topic: ${topic}
Word count: ${wordCount}

Output JSON format:
{
  "vocabulary": [
    {
      "word": "word in ${language}",
      "translation": "English translation",
      "part_of_speech": "noun/verb/adjective/etc",
      "example_sentence": "Example in ${language}",
      "example_translation": "Example in English",
      "cefr_level": "${targetLevel}"
    }
  ],
  "topic": "${topic}",
  "level": "${targetLevel}"
}`;

  try {
    const { json, usedSource } = await AIService.generateWithRetry(
      userPrompt,
      2000,
      "Vocabulary Generation",
      systemPrompt,
      null,
      { level: targetLevel, language: language, topic: topic }
    );
    
    return {
      vocabulary: json.vocabulary || json,
      metadata: {
        level: targetLevel,
        language: language,
        topic: topic,
        word_count: wordCount,
        generated_at: new Date().toISOString(),
        source: usedSource
      }
    };
  } catch (error) {
    console.error("Failed to generate vocabulary lesson:", error);
    throw error;
  }
}

/**
 * Generates grammar lesson for specific CEFR level
 * @param {string} targetLevel - CEFR level
 * @param {string} language - Target language
 * @param {string} grammarPoint - Specific grammar point
 * @returns {Promise<Object>} Grammar lesson
 */
async function generateGrammarLesson(targetLevel, language, grammarPoint) {
  const levelConfig = CEFR_CONFIG[targetLevel] || CEFR_CONFIG.A1;
  const systemPrompt = `You are a CEFR grammar expert. Generate grammar lessons that are strictly aligned with ${targetLevel} learner profiles.
 
Focus on level benchmarks: ${levelConfig.grammar}
Use topics like: ${levelConfig.topics}
Focus on clear explanations with authentic examples.
Use metalanguage appropriate for the target level.`;

  const userPrompt = `Generate a grammar lesson for ${targetLevel} level in ${language}.

Grammar point: ${grammarPoint}

Output JSON format:
{
  "grammar_point": "${grammarPoint}",
  "explanation": "Clear explanation in English",
  "rules": ["rule 1", "rule 2", ...],
  "examples": [
    {
      "sentence": "Example in ${language}",
      "translation": "Translation in English",
      "notes": "Why this example is useful"
    }
  ],
  "common_mistakes": [
    {
      "mistake": "Common error",
      "correction": "Correct form",
      "explanation": "Why it's wrong"
    }
  ],
  "practice_exercises": [
    {
      "question": "Fill in the blank or transformation exercise",
      "answer": "Correct answer",
      "explanation": "Why this is correct"
    }
  ]
}`;

  try {
    const { json, usedSource } = await AIService.generateWithRetry(
      userPrompt,
      2500,
      "Grammar Lesson Generation",
      systemPrompt,
      null,
      { level: targetLevel, language: language, topic: grammarPoint }
    );
    
    return {
      lesson: json,
      metadata: {
        level: targetLevel,
        language: language,
        grammar_point: grammarPoint,
        generated_at: new Date().toISOString(),
        source: usedSource
      }
    };
  } catch (error) {
    console.error("Failed to generate grammar lesson:", error);
    throw error;
  }
}

/**
 * Generates a complete lesson with mixed content
 * @param {Object} lessonSpec - Lesson specification
 * @returns {Promise<Object>} Complete lesson
 */
async function generateCompleteLesson(lessonSpec) {
  const {
    target_level,
    language,
    target_skill,
    lesson_type,
    domains,
    focus_areas = []
  } = lessonSpec;
  
  // Select domain
  const domain = domains && domains.length > 0 ? domains[0] : "daily_life";
  
  // Use the requested skill type, defaulting to composite if not specified
  // This allows specific lesson types (listening, reading, drill) to work correctly
  const finalSkill = target_skill || "composite";

  // Generate main content based on requested type
  const mainContent = await generateContent(
    target_level,
    language,
    domain,
    focus_areas[0] || domain,
    finalSkill
  );
  
  // Vocabulary is now part of the composite lesson, so separate generation is redundant.
  // We keep the variable for compatibility if needed, but it will be derived from mainContent.
  let vocabularySupport = null;
  if(mainContent.content && mainContent.content.vocabulary) {
      vocabularySupport = { vocabulary: mainContent.content.vocabulary };
  }
  
  return {
    lesson_id: `lesson_${target_level}_${Date.now()}`,
    target_level: target_level,
    language: language,
    skill: target_skill,
    lesson_type: lesson_type,
    main_content: mainContent.content,
    vocabulary_support: vocabularySupport ? vocabularySupport.vocabulary : null,
    metadata: {
      domain: domain,
      generated_at: new Date().toISOString(),
      estimated_duration_minutes: lesson_type === "CONSOLIDATION" ? 15 : 20
    }
  };
}

/**
 * Generates Level-Up Gateway Quiz
 * @param {string} currentLevel - Current CEFR level
 * @param {string} language - Target language
 * @returns {Promise<Object>} Level-Up quiz
 */
async function generateLevelUpQuiz(currentLevel, language = "Spanish") {
  const levelUpper = currentLevel.toUpperCase();
  const config = CEFR_CONFIG[levelUpper] || CEFR_CONFIG.A1;
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const currentIndex = levels.indexOf(levelUpper);
  const nextLevel = levels[currentIndex + 1] || "N/A";

  const prompt = LEVEL_UP_TEMPLATE
    .replace(/{{LEVEL}}/g, () => levelUpper)
    .replace(/{{NEXT_LEVEL}}/g, () => nextLevel)
    .replace(/{{LANGUAGE}}/g, () => language)
    .replace(/{{GRAMMAR_BENCHMARKS}}/g, () => config.grammar)
    .replace(/{{VOCABULARY_BENCHMARKS}}/g, () => config.vocabulary || "RLD lists")
    .replace(/{{TOPIC_BENCHMARKS}}/g, () => config.topics || "General topics");

  const systemPrompt = `You are a Senior CEFR Examiner for ${language}. You are conducting a Mastery Gateway Quiz for Level ${levelUpper}. 
  CRITICAL: 
  1. ALL content (questions, options, explanations) MUST be in ${language} except for the specific 'question_english' fields.
  2. DO NOT use any other languages.
  3. If the level is A1 or A2, you MUST provide 'reading' (romanization) for everything.`;

  try {
    const { json, usedSource } = await AIService.generateWithRetry(
      prompt,
      3500,
      "Level-Up Quiz Generation",
      systemPrompt,
      null,
      { level: levelUpper, language: language, topic: "General Assessment" }
    );
    
    return {
      content: json,
      metadata: {
        level: levelUpper,
        language: language,
        type: "level_up_gateway",
        generated_at: new Date().toISOString(),
        source: usedSource
      }
    };
  } catch (error) {
    console.error("Failed to generate Level-Up quiz:", error);
    throw error;
  }
}

/**
 * Gets random ALTE Can-Do statement for a level
 * @param {string} level - CEFR level
 * @returns {string} ALTE Can-Do statement
 */
function getALTEStatement(level) {
  const statements = ALTE_CAN_DO_STATEMENTS[level] || ALTE_CAN_DO_STATEMENTS.A1;
  return statements[Math.floor(Math.random() * statements.length)];
}

module.exports = {
  generateContent,
  generateVocabularyLesson,
  generateGrammarLesson,
  generateCompleteLesson,
  generateLevelUpQuiz,
  getALTEStatement,
  CEFR_DOMAINS,
  ALTE_CAN_DO_STATEMENTS,
  CONTENT_GENERATION_SYSTEM_PROMPT
};
