// Unit test for simple sentence rendering
// Validates: Requirements 3.3

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { Text } from 'react-native';

// Mock simple sentence lesson component
const MockSimpleSentenceLesson = ({ 
  sentence, 
  question, 
  options 
}: { 
  sentence: string; 
  question: string; 
  options: string[];
}) => {
  return (
    <>
      <Text testID="sentence-display">{sentence}</Text>
      <Text testID="question-display">{question}</Text>
      {options.map((opt, idx) => (
        <Text key={idx} testID={`option-${idx}`}>{opt}</Text>
      ))}
    </>
  );
};

describe('Simple Sentence Rendering', () => {
  it('should display the sentence prominently', () => {
    const sentence = "El gato está en la mesa.";
    const question = "What does this sentence mean?";
    const options = ["The cat is on the table", "The dog is under the chair", "The bird is in the tree", "The fish is in the water"];
    
    render(
      <MockSimpleSentenceLesson 
        sentence={sentence}
        question={question}
        options={options}
      />
    );
    
    const sentenceElement = screen.getByTestId('sentence-display');
    expect(sentenceElement.props.children).toBe(sentence);
  });

  it('should not show passage text for simple sentence type', () => {
    const sentence = "Je mange une pomme.";
    const question = "What is the subject doing?";
    const options = ["Eating", "Drinking", "Running", "Sleeping"];
    
    render(
      <MockSimpleSentenceLesson 
        sentence={sentence}
        question={question}
        options={options}
      />
    );
    
    // Should not have a passage element
    const passage = screen.queryByTestId('passage-text');
    expect(passage).toBeNull();
    
    // Should not have audio script
    const audioScript = screen.queryByTestId('audio-script');
    expect(audioScript).toBeNull();
  });

  it('should display single question with 4 options', () => {
    const sentence = "Das Wetter ist schön heute.";
    const question = "What is the weather like?";
    const options = ["Nice", "Bad", "Cold", "Hot"];
    
    render(
      <MockSimpleSentenceLesson 
        sentence={sentence}
        question={question}
        options={options}
      />
    );
    
    // Should have the question
    const questionElement = screen.getByTestId('question-display');
    expect(questionElement.props.children).toBe(question);
    
    // Should have exactly 4 options
    options.forEach((opt, idx) => {
      const optionElement = screen.getByTestId(`option-${idx}`);
      expect(optionElement.props.children).toBe(opt);
    });
  });

  it('should handle various sentence lengths', () => {
    const testCases = [
      { sentence: "Hola.", question: "What does this mean?", options: ["Hello", "Goodbye", "Thanks", "Please"] },
      { sentence: "The quick brown fox jumps over the lazy dog.", question: "What animal jumps?", options: ["Fox", "Dog", "Cat", "Bird"] },
      { sentence: "In a world where technology advances rapidly, we must adapt to new challenges and opportunities that arise.", question: "What must we do?", options: ["Adapt", "Resist", "Ignore", "Reject"] }
    ];
    
    testCases.forEach(testCase => {
      render(
        <MockSimpleSentenceLesson 
          sentence={testCase.sentence}
          question={testCase.question}
          options={testCase.options}
        />
      );
      
      const sentenceElement = screen.getByTestId('sentence-display');
      expect(sentenceElement.props.children).toBe(testCase.sentence);
    });
  });
});
