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

export const CEFR_GUIDE = {
  A1: "Use only top 500 basic words. Simple sentences.",
  A2: "Use common vocabulary. Short compound sentences allowed.",
  B1: "Use intermediate vocabulary. Complex sentences OK.",
  B2: "Use advanced vocabulary. Idioms and nuanced expressions allowed.",
  C1: "Use sophisticated vocabulary. Include idioms, complex grammar.",
  C2: "Use native-level vocabulary. All constructs allowed.",
};
