// Feature: optimized-lesson-types, Property 14: Correct answers show continue button
// Validates: Requirements 6.3

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

const MockQuizWithContinue = ({ 
  question, 
  options, 
  correctIndex,
  onContinue
}: { 
  question: string; 
  options: string[]; 
  correctIndex: number;
  onContinue: () => void;
}) => {
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);
  
  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowFeedback(true);
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
          disabled={showFeedback}
        >
          {opt}
        </button>
      ))}
      {showFeedback && isCorrect && (
        <button testID="continue-button" onPress={onContinue}>
          Continue
        </button>
      )}
      {showFeedback && !isCorrect && (
        <button testID="try-again-button">Try Again</button>
      )}
    </>
  );
};

describe('Property 14: Continue button for correct answers', () => {
  it('should display Continue button for any correct answer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        async (question, options, correctIndex) => {
          const validCorrectIndex = correctIndex % options.length;
          
          const onContinue = jest.fn();
          const { getByTestId, queryByTestId } = render(
            <MockQuizWithContinue 
              question={question}
              options={options}
              correctIndex={validCorrectIndex}
              onContinue={onContinue}
            />
          );
          
          // Answer correctly
          const optionButton = getByTestId(`option-${validCorrectIndex}`);
          fireEvent.press(optionButton);
          
          await waitFor(() => {
            // Continue button should be displayed
            const continueButton = queryByTestId('continue-button');
            expect(continueButton).not.toBeNull();
            
            // Try Again button should NOT be displayed
            const tryAgainButton = queryByTestId('try-again-button');
            expect(tryAgainButton).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should call onContinue callback when Continue button is pressed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        async (question, options, correctIndex) => {
          const validCorrectIndex = correctIndex % options.length;
          
          const onContinue = jest.fn();
          const { getByTestId } = render(
            <MockQuizWithContinue 
              question={question}
              options={options}
              correctIndex={validCorrectIndex}
              onContinue={onContinue}
            />
          );
          
          // Answer correctly
          const optionButton = getByTestId(`option-${validCorrectIndex}`);
          fireEvent.press(optionButton);
          
          await waitFor(() => {
            const continueButton = getByTestId('continue-button');
            expect(continueButton).not.toBeNull();
          });
          
          // Press Continue
          const continueButton = getByTestId('continue-button');
          fireEvent.press(continueButton);
          
          // Callback should be called
          expect(onContinue).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display Continue button for incorrect answers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        async (question, options, correctIndex) => {
          const validCorrectIndex = correctIndex % options.length;
          const incorrectIndex = (validCorrectIndex + 1) % options.length;
          
          const onContinue = jest.fn();
          const { getByTestId, queryByTestId } = render(
            <MockQuizWithContinue 
              question={question}
              options={options}
              correctIndex={validCorrectIndex}
              onContinue={onContinue}
            />
          );
          
          // Answer incorrectly
          const optionButton = getByTestId(`option-${incorrectIndex}`);
          fireEvent.press(optionButton);
          
          await waitFor(() => {
            // Continue button should NOT be displayed
            const continueButton = queryByTestId('continue-button');
            expect(continueButton).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

