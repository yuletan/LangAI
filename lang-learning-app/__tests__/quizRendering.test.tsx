/* global describe, it, expect, beforeEach, jest */
// __tests__/quizRendering.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { mockCompositeLesson } from './mockData';
// Import your actual component here:
// import QuizScreen from '../app/(tabs)/explore'; 

import { View, Text, TouchableOpacity } from 'react-native';

// A dummy wrapper if your component relies on complex context/Navigation
// Ideally, render the component directly
const MockQuizComponent = ({ questions }: any) => {
  const [score, setScore] = React.useState(0);
  const currentQ = questions[0]; // Simplified for demo

  return (
    <View>
      <Text testID="question-text">{currentQ.question}</Text>
      {currentQ.options.map((opt: string, idx: number) => (
        <TouchableOpacity key={idx} onPress={() => setScore(idx === currentQ.correct_index ? score + 1 : score)}>
          <Text>{opt}</Text>
        </TouchableOpacity>
      ))}
      <Text testID="score-display">Score: {score}</Text>
    </View>
  );
};

describe('Quiz Functionality & Rendering', () => {
  it('renders the listening question correctly', () => {
    const { getByText } = render(
      <MockQuizComponent questions={mockCompositeLesson.listening_task.questions} />
    );

    // Check if question text is present
    expect(getByText('¿Cómo está la persona?')).toBeTruthy();
    
    // Check if all options render
    expect(getByText('Mal')).toBeTruthy();
    expect(getByText('Bien')).toBeTruthy();
  });

  it('handles user interaction and updates score correctly', async () => {
    const { getByTestId, getByText } = render(
      <MockQuizComponent questions={mockCompositeLesson.listening_task.questions} />
    );

    // Simulate clicking the correct answer (Index 1)
    // In real code, you'd fireEvent.press(getByText('Bien'))
    const correctOption = getByText('Bien'); 
    fireEvent.press(correctOption);

    // Wait for state update
    await waitFor(() => {
      expect(getByText('Score: 1')).toBeTruthy();
    });
  });

  it('handles cloze (fill-in-blank) questions from practice_quiz', () => {
    const { getByText } = render(
      <MockQuizComponent questions={mockCompositeLesson.practice_quiz} />
    );

    // Verify the question with the blank renders
    expect(getByText('Yo ___ agua.')).toBeTruthy();
  });
});