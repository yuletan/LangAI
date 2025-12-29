export const BADGES = {
  polyglot: { id: "polyglot", name: "🌍 Polyglot", description: "Use 3 different languages", icon: "globe-outline" },
  night_owl: { id: "night_owl", name: "🦉 Night Owl", description: "Study after 11 PM", icon: "moon-outline" },
  streak_master: { id: "streak_master", name: "🔥 Streak Master", description: "Maintain a 7-day streak", icon: "flame-outline" },
  bookworm: { id: "bookworm", name: "📚 Bookworm", description: "Complete 10 lessons", icon: "book-outline" },
  chatterbox: { id: "chatterbox", name: "💬 Chatterbox", description: "Send 50 chat messages", icon: "chatbubbles-outline" },
  speed_learner: { id: "speed_learner", name: "⚡ Speed Learner", description: "20 activities in one day", icon: "flash-outline" },
  first_steps: { id: "first_steps", name: "👶 First Steps", description: "Complete your first lesson", icon: "footsteps-outline" },
  perfectionist: { id: "perfectionist", name: "🎯 Perfectionist", description: "Get 100% on 5 quizzes", icon: "checkmark-circle-outline" },
};

export type BadgeId = keyof typeof BADGES;
