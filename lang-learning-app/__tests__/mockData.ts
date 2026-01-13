// __tests__/mockData.ts

// Based on the Output JSON in CEFRContentService.js for "composite" type
export const mockCompositeLesson = {
  type: "composite_lesson",
  vocabulary: [
    { word: "Gato", translation: "Cat", example: "El gato es negro" }
  ],
  listening_task: {
    audio_script: "Hola, ¿cómo estás? Estoy bien, gracias.",
    questions: [
      { 
        question: "¿Cómo está la persona?", 
        options: ["Mal", "Bien", "Triste", "Enojado"], 
        correct_index: 1 
      }
    ]
  },
  reading_task: {
    scenario_text: "Juan va a la tienda. Compra manzanas.",
    questions: [
      { 
        question: "¿Qué compra Juan?", 
        options: ["Peras", "Manzanas", "Uvas", "Leche"], 
        correct_index: 1 
      }
    ]
  },
  practice_quiz: [
    { 
      type: "cloze", 
      question: "Yo ___ agua.", 
      options: ["soy", "tengo", "bebo", "estoy"], 
      correct_index: 2 
    }
  ]
};

// Based on schema.ts Phrase for SRS
export const mockPhrase = {
  id: 1,
  original: "Hello",
  translated: "Hola",
  nextReview: Date.now(), // Due now
  easeFactor: 2.5,
  interval: 1,
  createdAt: Date.now(),
  pronunciation: "heh-LOH"
};