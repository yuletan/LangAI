import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
type PronunciationDensity = 'high' | 'medium' | 'low' | 'none';

interface PronunciationConfig {
  level: CEFRLevel;
  showPronunciation: boolean;
  pronunciationDensity: PronunciationDensity;
}

const PRONUNCIATION_CONFIG: Record<CEFRLevel, PronunciationConfig> = {
  A1: { level: 'A1', showPronunciation: true, pronunciationDensity: 'high' },
  A2: { level: 'A2', showPronunciation: true, pronunciationDensity: 'high' },
  B1: { level: 'B1', showPronunciation: true, pronunciationDensity: 'medium' },
  B2: { level: 'B2', showPronunciation: true, pronunciationDensity: 'medium' },
  C1: { level: 'C1', showPronunciation: true, pronunciationDensity: 'low' },
  C2: { level: 'C2', showPronunciation: false, pronunciationDensity: 'none' }
};

interface PronunciationHelperProps {
  text: string;
  cefrLevel: string;
  language: string;
  textColor?: string;
}

// Simple pronunciation generator (in production, this would call an API)
const getPronunciation = (word: string, language: string): string => {
  // This is a placeholder - in production, you'd use a pronunciation API
  // For now, return a simple phonetic representation
  const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
  
  // Basic pronunciation patterns for common languages
  if (language === 'Spanish') {
    return `/${cleanWord}/`;
  } else if (language === 'French') {
    return `[${cleanWord}]`;
  } else if (language === 'German') {
    return `[${cleanWord}]`;
  } else if (language === 'Japanese') {
    // For Japanese, we need Hiragana or Romaji. 
    // Since we don't have a client-side transpiler and the placeholder was incorrect, return empty.
    return '';
  }
  
  return '';
};

const PronunciationHelper: React.FC<PronunciationHelperProps> = ({ 
  text, 
  cefrLevel, 
  language,
  textColor = '#000'
}) => {
  const config = PRONUNCIATION_CONFIG[cefrLevel as CEFRLevel];
  
  // If pronunciation is disabled for this level, just return the text
  if (!config || !config.showPronunciation || config.pronunciationDensity === 'none') {
    return <Text style={[styles.text, { color: textColor }]}>{text}</Text>;
  }
  
  // Split text into words
  const words = text.split(' ');
  
  // Determine if a word should show pronunciation based on density
  const shouldShowPronunciation = (word: string, index: number): boolean => {
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    
    if (config.pronunciationDensity === 'high') {
      // A1/A2: Show pronunciation for most words (length > 3)
      return cleanWord.length > 3;
    } else if (config.pronunciationDensity === 'medium') {
      // B1/B2: Show for longer/complex words only
      return cleanWord.length > 6;
    } else if (config.pronunciationDensity === 'low') {
      // C1: Show rarely, only for very long words
      return cleanWord.length > 8 && index % 3 === 0;
    }
    
    return false;
  };
  
  return (
    <View style={styles.container}>
      {words.map((word, idx) => {
        const showPron = shouldShowPronunciation(word, idx);
        
        return (
          <View key={idx} style={styles.wordContainer}>
            <Text style={[styles.text, { color: textColor }]}>{word}</Text>
            {showPron && getPronunciation(word, language) !== '' && getPronunciation(word, language) !== `[${word.toLowerCase()}]` && (
              <Text style={styles.pronunciationText}>
                {getPronunciation(word, language)}
              </Text>
            )}
            {idx < words.length - 1 && <Text style={[styles.text, { color: textColor }]}> </Text>}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  wordContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 26,
  },
  pronunciationText: {
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: -2,
  },
});

export default PronunciationHelper;
export { PRONUNCIATION_CONFIG, type CEFRLevel, type PronunciationDensity };
