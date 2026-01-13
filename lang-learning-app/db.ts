/**
 * Legacy Database Interface (Deprecated)
 * Now wrapping Drizzle-based actions in db/actions.ts
 */

export * from "./db/actions";
export * from "./db/schema";
export { db as drizzleDb } from "./db/client";

// Re-export constants
export { BADGES } from "./constants/game-data";
export { CEFR_GUIDE } from "./services/gamification";

// Use the exported actions instead.
export { getCEFRProfile, updateCEFRProfile } from "./db/actions";
