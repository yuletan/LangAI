const Database = require("better-sqlite3");
const { drizzle } = require("drizzle-orm/better-sqlite3");
const path = require("path");
const fs = require("fs");

// Ensure data dir exists
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, "lang_app.db"));
const db = drizzle(sqlite);

// Initialize tables if they don't exist
const initDB = () => {
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS api_cache (
            hash_key TEXT PRIMARY KEY,
            response_json TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );
    `);
    console.log("Storage: SQLite DB initialized.");
};

initDB();

module.exports = { db };
