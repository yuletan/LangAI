/**
 * Property-based test for question count validation
 * **Feature: optimized-lesson-types, Property 4: Question counts match lesson type specifications**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
 */

const fc = require('fast-check');
const { generateContent } = require('../../src/services/CEFRContentService');

// Mock AIService to avoid actual API calls during testing
jest.mock('../../src/services/AIService', () => ({
  generateWithRetry: jest.fn()
}));

const AIService = require('../../src/services/AIService');

describe('Property 4: Question counts match lesson type specifications', () => {
  // Arbitraries for test data generation
  const cefrLevelArbitrary = fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
  const languageArbitrary = fc.constantFrom('Spanish', 'French', 'German', 'Italian', 'Portuguese');
  const domainArbitrary = fc.constantFrom('personal', 'public', 'occupational', 'educational');
  const topicArbitrary = fc.string({ minLength: 5, maxLength: 50 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property: For any simple_sentence lesson, the quiz_items array should contain exactly 1 question
   */
  it('should generate exactly 1 question for simple_sentence lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response for simple_sentence
          const mockResponse = {
            type: 'simple_sentence',
            sentence: 'Test sentence in target language.',
            quiz_items: [
              {
                question: 'Test question?',
                options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                correct_index: 0
              }
            ]
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          const result = await generateContent(level, language, domain, topic, 'simple_sentence');
          
          expect(result.content.quiz_items).toHaveLength(1);
          expect(result.content.type).toBe('simple_sentence');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any listening lesson, the quiz_items array should contain 2 or 3 questions
   */
  it('should generate 2-3 questions for listening lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        fc.integer({ min: 2, max: 3 }), // Question count
        async (level, language, domain, topic, questionCount) => {
          // Mock AI response for listening
          const mockQuestions = Array.from({ length: questionCount }, (_, i) => ({
            question: `Question ${i + 1}?`,
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correct_index: 0
          }));

          const mockResponse = {
            type: 'listening',
            audio_script: 'Test audio script in target language.',
            quiz_items: mockQuestions
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          const result = await generateContent(level, language, domain, topic, 'listening');
          
          expect(result.content.quiz_items.length).toBeGreaterThanOrEqual(2);
          expect(result.content.quiz_items.length).toBeLessThanOrEqual(3);
          expect(result.content.type).toBe('listening');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any reading lesson, the quiz_items array should contain 2 or 3 questions
   */
  it('should generate 2-3 questions for reading lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        fc.integer({ min: 2, max: 3 }), // Question count
        async (level, language, domain, topic, questionCount) => {
          // Mock AI response for reading
          const mockQuestions = Array.from({ length: questionCount }, (_, i) => ({
            question: `Question ${i + 1}?`,
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correct_index: 0
          }));

          const mockResponse = {
            type: 'reading',
            scenario_text: 'Test reading passage in target language.',
            quiz_items: mockQuestions
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          const result = await generateContent(level, language, domain, topic, 'reading');
          
          expect(result.content.quiz_items.length).toBeGreaterThanOrEqual(2);
          expect(result.content.quiz_items.length).toBeLessThanOrEqual(3);
          expect(result.content.type).toBe('reading');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any drill lesson, the quiz_items array should contain exactly 5 questions
   */
  it('should generate exactly 5 questions for drill lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response for drill
          const mockQuestions = Array.from({ length: 5 }, (_, i) => ({
            type: i % 2 === 0 ? 'cloze' : 'inference',
            question: `Question ${i + 1}?`,
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correct_index: 0
          }));

          const mockResponse = {
            type: 'drill',
            quiz_items: mockQuestions
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          const result = await generateContent(level, language, domain, topic, 'drill');
          
          expect(result.content.quiz_items).toHaveLength(5);
          expect(result.content.type).toBe('drill');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any composite lesson, the structure should contain correct question counts
   * - listening_task: 3 questions
   * - reading_task: 3 questions
   * - practice_quiz: 4 questions
   */
  it('should generate correct question counts for composite lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        async (level, language, domain, topic) => {
          // Mock AI response for composite
          const mockResponse = {
            type: 'composite_lesson',
            vocabulary: [
              { word: 'word1', translation: 'translation1', example: 'example1' },
              { word: 'word2', translation: 'translation2', example: 'example2' }
            ],
            listening_task: {
              audio_script: 'Audio script',
              questions: Array.from({ length: 3 }, (_, i) => ({
                question: `Listening Q${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            },
            reading_task: {
              scenario_text: 'Reading text',
              questions: Array.from({ length: 3 }, (_, i) => ({
                question: `Reading Q${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            },
            practice_quiz: Array.from({ length: 4 }, (_, i) => ({
              type: 'cloze',
              question: `Quiz Q${i + 1}`,
              options: ['A', 'B', 'C', 'D'],
              correct_index: 0
            }))
          };

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          const result = await generateContent(level, language, domain, topic, 'composite');
          
          expect(result.content.listening_task.questions).toHaveLength(3);
          expect(result.content.reading_task.questions).toHaveLength(3);
          expect(result.content.practice_quiz).toHaveLength(4);
          expect(result.content.type).toBe('composite_lesson');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any lesson type, all questions should have exactly 4 options
   */
  it('should generate exactly 4 options for all questions across all lesson types', async () => {
    await fc.assert(
      fc.asyncProperty(
        cefrLevelArbitrary,
        languageArbitrary,
        domainArbitrary,
        topicArbitrary,
        fc.constantFrom('simple_sentence', 'listening', 'reading', 'drill'),
        async (level, language, domain, topic, lessonType) => {
          // Mock appropriate response based on lesson type
          let mockResponse;
          if (lessonType === 'simple_sentence') {
            mockResponse = {
              type: 'simple_sentence',
              sentence: 'Test sentence',
              quiz_items: [{
                question: 'Q1',
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }]
            };
          } else if (lessonType === 'listening') {
            mockResponse = {
              type: 'listening',
              audio_script: 'Audio',
              quiz_items: Array.from({ length: 2 }, () => ({
                question: 'Q',
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            };
          } else if (lessonType === 'reading') {
            mockResponse = {
              type: 'reading',
              scenario_text: 'Text',
              quiz_items: Array.from({ length: 2 }, () => ({
                question: 'Q',
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            };
          } else {
            mockResponse = {
              type: 'drill',
              quiz_items: Array.from({ length: 5 }, () => ({
                question: 'Q',
                options: ['A', 'B', 'C', 'D'],
                correct_index: 0
              }))
            };
          }

          AIService.generateWithRetry.mockResolvedValue({
            json: mockResponse,
            usedSource: 'test'
          });

          const result = await generateContent(level, language, domain, topic, lessonType);
          
          // Check all questions have 4 options
          result.content.quiz_items.forEach(item => {
            expect(item.options).toHaveLength(4);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
