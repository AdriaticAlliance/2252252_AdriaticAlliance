const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let db = null;

/**
 * Initialize the SQLite database (async because sql.js loads WASM).
 * Persists to disk at config.DB_PATH.
 */
async function initDatabase() {
  const SQL = await initSqlJs();
  const dbPath = path.resolve(config.DB_PATH);
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Load existing DB file if it exists, otherwise create new
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  console.log('[DB] Database initialized at', dbPath);
  return db;
}

/** Persist current in-memory DB state to disk */
function save() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(path.resolve(config.DB_PATH), buffer);
}

/** Get the DB singleton (must call initDatabase first) */
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

module.exports = { initDatabase, getDb, save };
