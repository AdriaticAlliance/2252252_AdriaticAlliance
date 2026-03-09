const ruleService = require('../services/ruleService');
const actuatorService = require('../services/actuatorService');

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

// Deduplication: track last triggered state per rule to avoid spamming
const lastTriggered = new Map(); // key: ruleId → last target_state triggered

// Main entry — called for every normalized event
async function evaluateEvent(event) {
  const { sensor_id, metric, value } = event;
  if (value === undefined || value === null) return;

  const rules = ruleService.findEnabledByEvent(sensor_id, metric);
  if (rules.length === 0) return;

  for (const rule of rules) {
    const conditionMet = evaluate(value, rule.operator, rule.threshold);

    if (conditionMet) {
      // Skip if we already triggered this exact state for this rule
      const lastState = lastTriggered.get(rule.id);
      if (lastState === rule.target_state) continue;

      console.log(
        `[Evaluator] Rule #${rule.id} matched: ` +
        `${sensor_id}/${metric} ${rule.operator} ${rule.threshold} → ` +
        `${rule.actuator} = ${rule.target_state}`
      );

      try {
        await actuatorService.callSimulator(rule.actuator, rule.target_state, {
          trigger_type: 'rule',
          rule_id: rule.id,
        });

        actuatorService.writeLog({
          actuator:     rule.actuator,
          new_state:    rule.target_state,
          trigger_type: 'rule',
          rule_id:      rule.id,
          sensor_id:    sensor_id,
          metric:       metric,
          sensor_value: value,
        });

        lastTriggered.set(rule.id, rule.target_state);
      } catch (err) {
        console.error(`[Evaluator] Failed to trigger actuator for rule #${rule.id}:`, err.message);
      }
    } else {
      // Condition no longer met — reset so it can fire again if value crosses threshold
      lastTriggered.delete(rule.id);
    }
  }
}

module.exports = { evaluateEvent, evaluate };
