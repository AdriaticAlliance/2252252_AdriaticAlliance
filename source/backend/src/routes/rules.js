const express = require('express');
const router  = express.Router();
const { getDb, save } = require('../db/database');
const config  = require('../config');

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRule(body) {
  const errors = [];
  const { sensor_id, metric, operator, threshold, actuator, target_state } = body;

  if (!config.KNOWN_SENSORS.includes(sensor_id))
    errors.push(`sensor_id "${sensor_id}" is not a known sensor`);

  if (!metric || typeof metric !== 'string' || metric.trim() === '')
    errors.push('metric must be a non-empty string (e.g. "temperature", "power_kw")');

  if (!config.VALID_OPERATORS.includes(operator))
    errors.push(`operator must be one of: ${config.VALID_OPERATORS.join(', ')}`);

  if (typeof threshold !== 'number' || isNaN(threshold))
    errors.push('threshold must be a number');

  if (!config.KNOWN_ACTUATORS.includes(actuator))
    errors.push(`actuator "${actuator}" is not a known actuator`);

  if (!['ON', 'OFF'].includes(target_state))
    errors.push('target_state must be "ON" or "OFF"');

  return errors;
}

// ─── Helper: run a SELECT and return rows as plain objects ────────────────────

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

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /rules — list all
router.get('/', (req, res) => {
  try {
    const rules = queryAll('SELECT * FROM rules ORDER BY created_at DESC');
    res.json({ data: rules, count: rules.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /rules/:id — get one
router.get('/:id', (req, res) => {
  try {
    const rule = queryOne('SELECT * FROM rules WHERE id = ?', [Number(req.params.id)]);
    if (!rule) return res.status(404).json({ error: `Rule ${req.params.id} not found` });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rules — create
router.post('/', (req, res) => {
  try {
    const errors = validateRule(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { sensor_id, metric, operator, threshold, unit = '', actuator, target_state } = req.body;
    const db = getDb();

    db.run(
      `INSERT INTO rules (sensor_id, metric, operator, threshold, unit, actuator, target_state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sensor_id, metric, operator, threshold, unit, actuator, target_state]
    );
    save();

    const lastId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    const newRule = queryOne('SELECT * FROM rules WHERE id = ?', [lastId]);
    res.status(201).json(newRule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /rules/:id — full update
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = queryOne('SELECT * FROM rules WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: `Rule ${id} not found` });

    const errors = validateRule(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { sensor_id, metric, operator, threshold, unit = '', actuator, target_state } = req.body;
    const db = getDb();

    db.run(
      `UPDATE rules
       SET sensor_id=?, metric=?, operator=?, threshold=?, unit=?,
           actuator=?, target_state=?, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE id=?`,
      [sensor_id, metric, operator, threshold, unit, actuator, target_state, id]
    );
    save();

    res.json(queryOne('SELECT * FROM rules WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /rules/:id/toggle — flip enabled flag
router.patch('/:id/toggle', (req, res) => {
  try {
    const id = Number(req.params.id);
    const rule = queryOne('SELECT * FROM rules WHERE id = ?', [id]);
    if (!rule) return res.status(404).json({ error: `Rule ${id} not found` });

    const newEnabled = rule.enabled ? 0 : 1;
    const db = getDb();
    db.run(
      `UPDATE rules SET enabled=?, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?`,
      [newEnabled, id]
    );
    save();

    res.json({ ...rule, enabled: newEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /rules/:id
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = queryOne('SELECT * FROM rules WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: `Rule ${id} not found` });

    const db = getDb();
    db.run('DELETE FROM rules WHERE id = ?', [id]);
    save();

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
