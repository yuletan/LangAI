export const calculateLevel = (xp: number): number => {
  // Level formula: each level requires 100 * level XP
  // Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, etc.
  let level = 1;
  let xpNeeded = 100;
  let totalXpForLevel = 0;
  
  while (totalXpForLevel + xpNeeded <= xp) {
    totalXpForLevel += xpNeeded;
    level++;
    xpNeeded = 100 * level;
  }
  
  return level;
};

export const getXPForNextLevel = (currentXP: number, currentLevel: number): { needed: number; progress: number } => {
  let totalXpForCurrentLevel = 0;
  for (let l = 1; l < currentLevel; l++) {
    totalXpForCurrentLevel += 100 * l;
  }
  
  const xpInCurrentLevel = currentXP - totalXpForCurrentLevel;
  const xpNeededForNext = 100 * currentLevel;
  
  return {
    needed: xpNeededForNext,
    progress: xpInCurrentLevel,
  };
};

export const CEFR_REWARDS = {
  STANDARD_QUIZ: 50,
  LEVEL_UP_QUIZ: 500,
};

export const CEFR_GUIDE = {
  A1: "Can understand and use familiar everyday expressions and very basic phrases aimed at the satisfaction of needs of a concrete type.",
  A2: "Can understand sentences and frequently used expressions related to areas of most immediate relevance.",
  B1: "Can understand the main points of clear standard input on familiar matters regularly encountered in work, school, leisure, etc.",
  B2: "Can understand the main ideas of complex text on both concrete and abstract topics, including technical discussions in their field of specialization.",
  C1: "Can understand a wide range of demanding, longer texts, and recognize implicit meaning.",
  C2: "Can understand with ease virtually everything heard or read.",
};
