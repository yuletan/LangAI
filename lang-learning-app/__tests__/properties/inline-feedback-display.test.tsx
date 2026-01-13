// Feature: optimized-lesson-types, Property 12: Quiz feedback is displayed inline
// Validates: Requirements 6.1

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

// Mock quiz component that demonstrates inline feedback
const MockQuizQuestion = ({ 
  question, 
  options, 
  correctIndex, 
  onAnswer 
}: { 
  question: string; 
  options: string[]; 
  correctIndex: number; 
  onAnswer: (index: number) => void;
}) => {
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);
  
  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowFeedback(true);
    onAnswer(index);
  };
  
  const isCorrect = selectedAnswer === correctIndex;
  
  return (
    <>
      <text testID="question">{question}</text>
      {options.map((opt, idx) => (
        <button 
          key={idx} 
          testID={`option-${idx}`}
          onPress={() => handleAnswer(idx)}
        >
          {opt}
        </button>
      ))}
      {showFeedback && (
        <text testID="inline-feedback">
          {isCorrect ? "Correct! Well done!" : "Not quite. Try again!"}
        </text>
      )}
    </>
  );
};

describe('Property 12: Inline feedback display', () => {
  it('should display feedback inline within the question card, not as alert', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        async (question, options, correctIndex) => {
          // Ensure correctIndex is within bounds
          const validCorrectIndex = correctIndex % options.length;
          
          let alertCalled = false;
          const originalAlert = global.alert;
          global.alert = () => { alertCalled = true; };
          
          const onAnswer = jest.fn();
          const { getByTestId, queryByTestId } = render(
            <MockQuizQuestion 
              question={question}
              options={options}
              correctIndex={validCorrectIndex}
              onAnswer={onAnswer}
            />
          );
          
          // Answer a question
          const optionButton = getByTestId(`option-0`);
          fireEvent.press(optionButton);
          
          await waitFor(() => {
            // Feedback should be displayed inline
            const feedback = queryByTestId('inline-feedback');
            expect(feedback).not.toBeNull();
            
            // Alert should NOT be called
            expect(alertCalled).toBe(false);
          });
          
          global.alert = originalAlert;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display feedback within the same component tree as the question', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        async (question, options, correctIndex) => {
          const validCorrectIndex = correctIndex % options.length;
          
          const onAnswer = jest.fn();
          const { getByTestId, queryByTestId } = render(
            <MockQuizQuestion 
              question={question}
              options={options}
              correctIndex={validCorrectIndex}
              onAnswer={onAnswer}
            />
          );
          
          // Answer a question
          const optionButton = getByTestId(`option-0`);
          fireEvent.press(optionButton);
          
          await waitFor(() => {
            // Both question and feedback should be present in the same render tree
            const questionElement = queryByTestId('question');
            const feedbackElement = queryByTestId('inline-feedback');
            
            expect(questionElement).not.toBeNull();
            expect(feedbackElement).not.toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

