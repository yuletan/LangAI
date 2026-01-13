const { sqliteTable, text, integer } = require("drizzle-orm/sqlite-core");

const apiCache = sqliteTable("api_cache", {
  hashKey: text("hash_key").primaryKey(),
  responseJson: text("response_json").notNull(),
  timestamp: integer("timestamp").notNull(),
});

module.exports = { apiCache };
