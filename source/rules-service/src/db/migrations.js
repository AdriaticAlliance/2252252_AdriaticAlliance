const { getDb, save } = require('./database');

function runMigrations() {
  const db = getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS rules (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id     TEXT    NOT NULL,
      metric        TEXT    NOT NULL,
      operator      TEXT    NOT NULL CHECK(operator IN ('<','<=','=','>','>=')),
      threshold     REAL    NOT NULL,
      unit          TEXT    NOT NULL DEFAULT '',
      actuator      TEXT    NOT NULL,
      target_state  TEXT    NOT NULL CHECK(target_state IN ('ON','OFF')),
      enabled       INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS actuator_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      actuator      TEXT    NOT NULL,
      new_state     TEXT    NOT NULL CHECK(new_state IN ('ON','OFF')),
      trigger_type  TEXT    NOT NULL CHECK(trigger_type IN ('manual','rule')),
      rule_id       INTEGER,
      sensor_id     TEXT,
      metric        TEXT,
      sensor_value  REAL,
      timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
  `);

  save();
  console.log('[DB] Migrations OK');
}

module.exports = { runMigrations };
