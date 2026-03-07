const express = require('express');
const router  = express.Router();
const actuatorService = require('../services/actuatorService');
const config  = require('../config');

/**
 * @openapi
 * /actuators:
 *   get:
 *     tags: [Actuators]
 *     summary: Get current actuator states from simulator
 *     responses:
 *       200:
 *         description: Map of actuator names to ON/OFF states
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actuators:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                     enum: [ON, OFF]
 *       502:
 *         description: Simulator unreachable
 */
router.get('/', async (req, res) => {
  try {
    const data = await actuatorService.getSimulatorStates();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Cannot reach simulator', detail: err.message });
  }
});

/**
 * @openapi
 * /actuators/logs:
 *   get:
 *     tags: [Actuators]
 *     summary: Get actuator audit log
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActuatorLog'
 *                 count:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
router.get('/logs', (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit || '100'), 500);
    const offset = parseInt(req.query.offset || '0');
    const logs   = actuatorService.getLogs(limit, offset);
    res.json({ data: logs, count: logs.length, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /actuators/{name}:
 *   post:
 *     tags: [Actuators]
 *     summary: Manually set an actuator state
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cooling_fan, entrance_humidifier, hall_ventilation, habitat_heater]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [state]
 *             properties:
 *               state:
 *                 type: string
 *                 enum: [ON, OFF]
 *     responses:
 *       200:
 *         description: Actuator state updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActuatorResponse'
 *       400:
 *         description: Invalid state
 *       404:
 *         description: Unknown actuator
 *       502:
 *         description: Simulator unreachable
 */
router.post('/:name', async (req, res) => {
  const { name } = req.params;
  const { state } = req.body;

  if (!config.KNOWN_ACTUATORS.includes(name))
    return res.status(404).json({ error: `Unknown actuator: ${name}` });
  if (!['ON', 'OFF'].includes(state))
    return res.status(400).json({ error: 'state must be "ON" or "OFF"' });

  try {
    const result = await actuatorService.manualToggle(name, state);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Simulator call failed', detail: err.message });
  }
});

module.exports = router;
