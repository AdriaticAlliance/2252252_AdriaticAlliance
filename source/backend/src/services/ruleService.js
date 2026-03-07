const { getDb, save } = require('../db/database');

// ─── Query helpers (sql.js) ──────────────────────────────────────────────────

function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

function findAll() {
  return queryAll('SELECT * FROM rules ORDER BY created_at DESC');
}

function findById(id) {
  return queryOne('SELECT * FROM rules WHERE id = ?', [Number(id)]);
}

function create({ sensor_id, metric, operator, threshold, unit = '', actuator, target_state }) {
  const db = getDb();
  db.run(
    `INSERT INTO rules (sensor_id, metric, operator, threshold, unit, actuator, target_state)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [sensor_id, metric, operator, threshold, unit, actuator, target_state]
  );
  save();
  const lastId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
  return queryOne('SELECT * FROM rules WHERE id = ?', [lastId]);
}

function update(id, { sensor_id, metric, operator, threshold, unit = '', actuator, target_state }) {
  const db = getDb();
  db.run(
    `UPDATE rules
     SET sensor_id=?, metric=?, operator=?, threshold=?, unit=?,
         actuator=?, target_state=?, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id=?`,
    [sensor_id, metric, operator, threshold, unit, actuator, target_state, Number(id)]
  );
  save();
  return queryOne('SELECT * FROM rules WHERE id = ?', [Number(id)]);
}

function toggle(id) {
  const rule = findById(id);
  if (!rule) return null;
  const newEnabled = rule.enabled ? 0 : 1;
  const db = getDb();
  db.run(
    `UPDATE rules SET enabled=?, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?`,
    [newEnabled, Number(id)]
  );
  save();
  return { ...rule, enabled: newEnabled };
}

function remove(id) {
  const existing = findById(id);
  if (!existing) return false;
  const db = getDb();
  db.run('DELETE FROM rules WHERE id = ?', [Number(id)]);
  save();
  return true;
}

function findEnabledByEvent(sensorId, metric) {
  return queryAll(
    'SELECT * FROM rules WHERE enabled = 1 AND sensor_id = ? AND metric = ?',
    [sensorId, metric]
  );
}

module.exports = { findAll, findById, create, update, toggle, remove, findEnabledByEvent };
