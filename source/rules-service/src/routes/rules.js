const express = require('express');
const router  = express.Router();
const ruleService = require('../services/ruleService');
const config  = require('../config');

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRule(body) {
  const errors = [];
  const { sensor_id, metric, operator, threshold, actuator, target_state } = body;

  if (!config.KNOWN_SENSORS.includes(sensor_id))
    errors.push(`sensor_id "${sensor_id}" is not a known sensor`);
  if (!metric || typeof metric !== 'string' || metric.trim() === '')
    errors.push('metric must be a non-empty string');
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

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /rules:
 *   get:
 *     tags: [Rules]
 *     summary: List all automation rules
 *     responses:
 *       200:
 *         description: Array of rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rule'
 *                 count:
 *                   type: integer
 */
router.get('/', (req, res) => {
  try {
    const rules = ruleService.findAll();
    res.json({ data: rules, count: rules.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /rules/{id}:
 *   get:
 *     tags: [Rules]
 *     summary: Get a single rule by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rule object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rule'
 *       404:
 *         description: Rule not found
 */
router.get('/:id', (req, res) => {
  try {
    const rule = ruleService.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: `Rule ${req.params.id} not found` });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /rules:
 *   post:
 *     tags: [Rules]
 *     summary: Create a new automation rule
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleInput'
 *     responses:
 *       201:
 *         description: Created rule
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rule'
 *       400:
 *         description: Validation errors
 */
router.post('/', (req, res) => {
  try {
    const errors = validateRule(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const newRule = ruleService.create(req.body);
    res.status(201).json(newRule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /rules/{id}:
 *   put:
 *     tags: [Rules]
 *     summary: Fully update an existing rule
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleInput'
 *     responses:
 *       200:
 *         description: Updated rule
 *       404:
 *         description: Rule not found
 */
router.put('/:id', (req, res) => {
  try {
    const existing = ruleService.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: `Rule ${req.params.id} not found` });

    const errors = validateRule(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const updated = ruleService.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /rules/{id}/toggle:
 *   patch:
 *     tags: [Rules]
 *     summary: Toggle or explicitly set a rule's enabled state
 *     description: "Without a body, flips the enabled flag. With an enabled property in the body, sets it explicitly."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Rule with updated enabled flag
 *       404:
 *         description: Rule not found
 */
router.patch('/:id/toggle', (req, res) => {
  try {
    const explicitEnabled = req.body && typeof req.body.enabled === 'boolean'
      ? req.body.enabled
      : undefined;
    const result = ruleService.toggle(req.params.id, explicitEnabled);
    if (!result) return res.status(404).json({ error: `Rule ${req.params.id} not found` });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /rules/{id}:
 *   delete:
 *     tags: [Rules]
 *     summary: Delete a rule
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       404:
 *         description: Rule not found
 */
router.delete('/:id', (req, res) => {
  try {
    const deleted = ruleService.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: `Rule ${req.params.id} not found` });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
