const { getDb } = require('../db/database');
const { callSimulator, writeLog } = require('../routes/actuators');

// Pure function — no side effects, easy to unit test
function evaluate(value, operator, threshold) {
  switch (operator) {
    case '<':  return value <  threshold;
    case '<=': return value <= threshold;
    case '=':  return value === threshold;
    case '>':  return value >  threshold;
    case '>=': return value >= threshold;
    default:
      console.warn(`[Evaluator] Unknown operator: ${operator}`);
      return false;
  }
}

// Load matching enabled rules from DB
function getMatchingRules(sensorId, metric) {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM rules WHERE enabled = 1 AND sensor_id = ? AND metric = ?'
  );
  stmt.bind([sensorId, metric]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Main entry — called for every normalized event
async function evaluateEvent(event) {
  const { sensor_id, metric, value } = event;
  if (value === undefined || value === null) return;

  const rules = getMatchingRules(sensor_id, metric);
  if (rules.length === 0) return;

  for (const rule of rules) {
    const conditionMet = evaluate(value, rule.operator, rule.threshold);

    if (conditionMet) {
      console.log(
        `[Evaluator] Rule #${rule.id} matched: ` +
        `${sensor_id}/${metric} ${rule.operator} ${rule.threshold} → ` +
        `${rule.actuator} = ${rule.target_state}`
      );

      try {
        await callSimulator(rule.actuator, rule.target_state);

        writeLog({
          actuator:     rule.actuator,
          new_state:    rule.target_state,
          trigger_type: 'rule',
          rule_id:      rule.id,
          sensor_id:    sensor_id,
          metric:       metric,
          sensor_value: value,
        });
      } catch (err) {
        console.error(`[Evaluator] Failed to trigger actuator for rule #${rule.id}:`, err.message);
      }
    }
  }
}

module.exports = { evaluateEvent, evaluate };
