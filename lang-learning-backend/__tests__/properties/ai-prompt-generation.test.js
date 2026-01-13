/**
 * Property-based test for AI prompt generation
 * **Feature: optimized-lesson-types, Property 9: AI prompts request correct question counts**
 * **Validates: Requirements 4.1, 4.2, 4.3**
 */

const fc = require('fast-check');
const { generateContent } = require('../../src/services/CEFRContentService');

// Mock AIService to capture the prompts being sent
jest.mock('../../src/services/AIService', () => ({
  generateWithRetry: jest.fn()
}));

const AIService = require('../../src/services/AIService');

describe('Property 9: AI prompts request correct question counts', () => {
  // Arbitraries for test data generation
  const cefrLevelArbitrary = fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
  const languageArbitrary = fc.constantFrom('Spanish', 'French', 'German', 'Italian', 'Portuguese');
  const domainArbitrary = fc.constantFrom('personal', 'public', 'occupational', 'educational');
  const topicArbitrary = fc.string({ minLength: 5, maxLength: 50 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property: For simple_sentence lessons, the AI prompt should request EXACTLY 1 question
   */
  it('should request EXACTLY 1 question for simple_sentence lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response
          const mockResponse = {
            type: 'simple_sentence',
            sentence: 'Test sentence.',
            quiz_items: [
              {
                question: 'Q?',
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }
            ]
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, 'simple_sentence');
          
          // Verify the prompt was called
          expect(AIService.generateWithRetry).toHaveBeenCalled();
          
          // Get the user prompt (first argument)
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt requests exactly 1 question
          expect(userPrompt).toContain('EXACTLY 1');
          expect(userPrompt).toContain('Generate a SINGLE SENTENCE practice question');
          expect(userPrompt).toContain('ONE standalone sentence');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For listening lessons, the AI prompt should request EXACTLY 2-3 questions
   */
  it('should request EXACTLY 2-3 questions for listening lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response
          const mockResponse = {
            type: 'listening',
            audio_script: 'Audio script.',
            quiz_items: [
              { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correct_index: 0 },
              { question: 'Q2?', options: ['A', 'B', 'C', 'D'], correct_index: 1 }
            ]
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, 'listening');
          
          // Verify the prompt was called
          expect(AIService.generateWithRetry).toHaveBeenCalled();
          
          // Get the user prompt
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt requests 2-3 questions
          expect(userPrompt).toContain('EXACTLY 2-3');
          expect(userPrompt).toContain('LISTENING exercise');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For reading lessons, the AI prompt should request EXACTLY 2-3 questions
   */
  it('should request EXACTLY 2-3 questions for reading lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response
          const mockResponse = {
            type: 'reading',
            scenario_text: 'Reading text.',
            quiz_items: [
              { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correct_index: 0 },
              { question: 'Q2?', options: ['A', 'B', 'C', 'D'], correct_index: 1 }
            ]
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, 'reading');
          
          // Verify the prompt was called
          expect(AIService.generateWithRetry).toHaveBeenCalled();
          
          // Get the user prompt
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt requests 2-3 questions
          expect(userPrompt).toContain('EXACTLY 2-3');
          expect(userPrompt).toContain('READING exercise');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For drill lessons, the AI prompt should request 5 questions
   */
  it('should request 5 questions for drill lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response
          const mockResponse = {
            type: 'drill',
            quiz_items: Array.from({ length: 5 }, (_, i) => ({
              question: `Q${i + 1}?`,
              options: ['A', 'B', 'C', 'D'],
              correct_index: 0
            }))
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, 'drill');
          
          // Verify the prompt was called
          expect(AIService.generateWithRetry).toHaveBeenCalled();
          
          // Get the user prompt
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt requests 5 questions
          expect(userPrompt).toContain('5 independent MIXED QUIZ questions');
          expect(userPrompt).toMatch(/Generate 5/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For composite lessons, the AI prompt should maintain the existing structure
   */
  it('should maintain existing structure for composite lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response
          const mockResponse = {
            type: 'composite_lesson',
            vocabulary: [{ word: 'word1', translation: 'trans1', example: 'ex1' }],
            listening_task: {
              audio_script: 'Audio',
              questions: Array.from({ length: 3 }, (_, i) => ({
                question: `LQ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            },
            reading_task: {
              scenario_text: 'Text',
              questions: Array.from({ length: 3 }, (_, i) => ({
                question: `RQ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            },
            practice_quiz: Array.from({ length: 4 }, (_, i) => ({
              question: `PQ${i + 1}`,
              options: ['A', 'B', 'C', 'D'],
              correct_index: 0
            }))
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, 'composite');
          
          // Verify the prompt was called
          expect(AIService.generateWithRetry).toHaveBeenCalled();
          
          // Get the user prompt
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt maintains composite structure
          expect(userPrompt).toContain('COMPLETE COMPOSITE LESSON');
          expect(userPrompt).toContain('EXACTLY 3 questions'); // For listening and reading
          expect(userPrompt).toContain('EXACTLY 4 mixed questions'); // For quiz
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All prompts should specify the target language
   */
  it('should include target language in all prompts', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        fc.constantFrom('simple_sentence', 'listening', 'reading', 'drill', 'composite'),
        async (level, language, domain, topic, lessonType) => {
          // Clear mocks before each iteration
          jest.clearAllMocks();
          
          // Mock appropriate response
          let mockResponse;
          if (lessonType === 'simple_sentence') {
            mockResponse = {
              type: 'simple_sentence',
              sentence: 'Test',
              quiz_items: [{ question: 'Q', options: ['A', 'B', 'C', 'D'], correct_index: 0 }]
            };
          } else if (lessonType === 'listening') {
            mockResponse = {
              type: 'listening',
              audio_script: 'Audio',
              quiz_items: [{ question: 'Q', options: ['A', 'B', 'C', 'D'], correct_index: 0 }]
            };
          } else if (lessonType === 'reading') {
            mockResponse = {
              type: 'reading',
              scenario_text: 'Text',
              quiz_items: [{ question: 'Q', options: ['A', 'B', 'C', 'D'], correct_index: 0 }]
            };
          } else if (lessonType === 'drill') {
            mockResponse = {
              type: 'drill',
              quiz_items: Array.from({ length: 5 }, () => ({
                question: 'Q',
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            };
          } else {
            mockResponse = {
              type: 'composite_lesson',
              vocabulary: [],
              listening_task: { audio_script: 'A', questions: [] },
              reading_task: { scenario_text: 'T', questions: [] },
              practice_quiz: []
            };
          }

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, lessonType);
          
          // Get the user prompt
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt includes the target language
          expect(userPrompt).toContain(language);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All prompts should specify the CEFR level
   */
  it('should include CEFR level in all prompts', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        fc.constantFrom('simple_sentence', 'listening', 'reading', 'drill', 'composite'),
        async (level, language, domain, topic, lessonType) => {
          // Clear mocks before each iteration
          jest.clearAllMocks();
          
          // Mock appropriate response
          const mockResponse = {
            type: lessonType,
            quiz_items: [{ question: 'Q', options: ['A', 'B', 'C', 'D'], correct_index: 0 }]
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, lessonType);
          
          // Get the user prompt
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt includes the CEFR level
          expect(userPrompt).toContain(level);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All prompts should specify the topic
   */
  it('should include topic in all prompts', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary.filter(t => t.trim().length > 0), // Filter out empty/whitespace-only topics
        fc.constantFrom('simple_sentence', 'listening', 'reading', 'drill', 'composite'),
        async (level, language, domain, topic, lessonType) => {
          // Clear mocks before each iteration
          jest.clearAllMocks();
          
          // Mock appropriate response
          const mockResponse = {
            type: lessonType,
            quiz_items: [{ question: 'Q', options: ['A', 'B', 'C', 'D'], correct_index: 0 }]
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          await generateContent(level, language, domain, topic, lessonType);
          
          // Get the user prompt
          const userPrompt = AIService.generateWithRetry.mock.calls[0][0];
          
          // Verify the prompt includes the topic
          expect(userPrompt).toContain(topic);
        }
      ),
      { numRuns: 100 }
    );
  });
});
