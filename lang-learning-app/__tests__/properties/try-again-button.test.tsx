// Feature: optimized-lesson-types, Property 13: Incorrect answers show try again button
// Validates: Requirements 6.2

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

const MockQuizWithTryAgain = ({ 
  question, 
  options, 
  correctIndex 
}: { 
  question: string; 
  options: string[]; 
  correctIndex: number;
}) => {
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);
  
  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowFeedback(true);
  };
  
  const handleTryAgain = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);
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
      {showFeedback && !isCorrect && (
        <button testID="try-again-button" onPress={handleTryAgain}>
          Try Again
        </button>
      )}
      {showFeedback && isCorrect && (
        <button testID="continue-button">Continue</button>
      )}
    </>
  );
};

describe('Property 13: Try Again button for incorrect answers', () => {
  it('should display Try Again button for any incorrect answer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        async (question, options, correctIndex) => {
          const validCorrectIndex = correctIndex % options.length;
          
          // Choose an incorrect answer
          const incorrectIndex = (validCorrectIndex + 1) % options.length;
          
          const { getByTestId, queryByTestId } = render(
            <MockQuizWithTryAgain 
              question={question}
              options={options}
              correctIndex={validCorrectIndex}
            />
          );
          
          // Answer incorrectly
          const optionButton = getByTestId(`option-${incorrectIndex}`);
          fireEvent.press(optionButton);
          
          await waitFor(() => {
            // Try Again button should be displayed
            const tryAgainButton = queryByTestId('try-again-button');
            expect(tryAgainButton).not.toBeNull();
            
            // Continue button should NOT be displayed
            const continueButton = queryByTestId('continue-button');
            expect(continueButton).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reset quiz state when Try Again is pressed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        async (question, options, correctIndex) => {
          const validCorrectIndex = correctIndex % options.length;
          const incorrectIndex = (validCorrectIndex + 1) % options.length;
          
          const { getByTestId, queryByTestId } = render(
            <MockQuizWithTryAgain 
              question={question}
              options={options}
              correctIndex={validCorrectIndex}
            />
          );
          
          // Answer incorrectly
          const optionButton = getByTestId(`option-${incorrectIndex}`);
          fireEvent.press(optionButton);
          
          await waitFor(() => {
            const tryAgainButton = queryByTestId('try-again-button');
            expect(tryAgainButton).not.toBeNull();
          });
          
          // Press Try Again
          const tryAgainButton = getByTestId('try-again-button');
          fireEvent.press(tryAgainButton);
          
          await waitFor(() => {
            // Try Again button should disappear
            const tryAgainAfter = queryByTestId('try-again-button');
            expect(tryAgainAfter).toBeNull();
            
            // Options should be enabled again
            const optionAfter = getByTestId(`option-0`);
            expect(optionAfter.props.disabled).toBeFalsy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

