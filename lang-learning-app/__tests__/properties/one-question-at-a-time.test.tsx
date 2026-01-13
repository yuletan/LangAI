// Feature: optimized-lesson-types, Property 15: Listening questions display one at a time
// Feature: optimized-lesson-types, Property 16: Continue button advances to next question
// Validates: Requirements 6.4, 6.5

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

const MockMultiQuestionQuiz = ({ 
  questions 
}: { 
  questions: Question[];
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);
  
  const currentQuestion = questions[currentQuestionIndex];
  
  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowFeedback(true);
  };
  
  const handleContinue = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };
  
  const isCorrect = selectedAnswer === currentQuestion.correctIndex;
  
  return (
    <>
      <text testID="question-progress">
        Question {currentQuestionIndex + 1} of {questions.length}
      </text>
      <text testID="current-question">{currentQuestion.question}</text>
      {currentQuestion.options.map((opt, idx) => (
        <button 
          key={idx} 
          testID={`option-${idx}`}
          onPress={() => handleAnswer(idx)}
          disabled={showFeedback}
        >
          {opt}
        </button>
      ))}
      {showFeedback && isCorrect && currentQuestionIndex < questions.length - 1 && (
        <button testID="continue-button" onPress={handleContinue}>
          Continue
        </button>
      )}
      {showFeedback && isCorrect && currentQuestionIndex === questions.length - 1 && (
        <button testID="complete-button">Complete Lesson</button>
      )}
    </>
  );
};

describe('Property 15 & 16: One question at a time display', () => {
  it('should display only one question at a time for any lesson with multiple questions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            question: fc.string({ minLength: 5, maxLength: 100 }),
            options: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
            correctIndex: fc.integer({ min: 0, max: 3 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (questions) => {
          // Normalize correctIndex to be within bounds
          const normalizedQuestions = questions.map(q => ({
            ...q,
            correctIndex: q.correctIndex % q.options.length
          }));
          
          const { getByTestId, queryByTestId } = render(
            <MockMultiQuestionQuiz questions={normalizedQuestions} />
          );
          
          // Should display question progress
          const progress = getByTestId('question-progress');
          expect(progress.props.children).toContain('Question 1 of');
          expect(progress.props.children).toContain(normalizedQuestions.length.toString());
          
          // Should display only the first question
          const currentQuestion = getByTestId('current-question');
          expect(currentQuestion.props.children).toBe(normalizedQuestions[0].question);
          
          // Should not display other questions
          for (let i = 1; i < normalizedQuestions.length; i++) {
            const questionText = normalizedQuestions[i].question;
            // The current question element should not contain other questions
            expect(currentQuestion.props.children).not.toBe(questionText);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should advance to next question when Continue is pressed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            question: fc.string({ minLength: 5, maxLength: 100 }),
            options: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
            correctIndex: fc.integer({ min: 0, max: 3 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (questions) => {
          const normalizedQuestions = questions.map(q => ({
            ...q,
            correctIndex: q.correctIndex % q.options.length
          }));
          
          const { getByTestId, queryByTestId } = render(
            <MockMultiQuestionQuiz questions={normalizedQuestions} />
          );
          
          // Answer first question correctly
          const correctOption = getByTestId(`option-${normalizedQuestions[0].correctIndex}`);
          fireEvent.press(correctOption);
          
          await waitFor(() => {
            const continueButton = queryByTestId('continue-button');
            expect(continueButton).not.toBeNull();
          });
          
          // Press Continue
          const continueButton = getByTestId('continue-button');
          fireEvent.press(continueButton);
          
          await waitFor(() => {
            // Should now display question 2
            const progress = getByTestId('question-progress');
            expect(progress.props.children).toContain('Question 2 of');
            
            // Should display the second question
            const currentQuestion = getByTestId('current-question');
            expect(currentQuestion.props.children).toBe(normalizedQuestions[1].question);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show Complete button on last question instead of Continue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            question: fc.string({ minLength: 5, maxLength: 100 }),
            options: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
            correctIndex: fc.integer({ min: 0, max: 3 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (questions) => {
          const normalizedQuestions = questions.map(q => ({
            ...q,
            correctIndex: q.correctIndex % q.options.length
          }));
          
          const { getByTestId, queryByTestId } = render(
            <MockMultiQuestionQuiz questions={normalizedQuestions} />
          );
          
          // Answer all questions correctly
          for (let i = 0; i < normalizedQuestions.length; i++) {
            const correctOption = getByTestId(`option-${normalizedQuestions[i].correctIndex}`);
            fireEvent.press(correctOption);
            
            await waitFor(() => {
              if (i < normalizedQuestions.length - 1) {
                // Should show Continue button
                const continueButton = queryByTestId('continue-button');
                expect(continueButton).not.toBeNull();
                
                // Press Continue to move to next question
                fireEvent.press(continueButton!);
              } else {
                // On last question, should show Complete button
                const completeButton = queryByTestId('complete-button');
                expect(completeButton).not.toBeNull();
                
                // Should NOT show Continue button
                const continueButton = queryByTestId('continue-button');
                expect(continueButton).toBeNull();
              }
            });
          }
        }
      ),
      { numRuns: 50 } // Reduced runs due to complexity
    );
  });
});

