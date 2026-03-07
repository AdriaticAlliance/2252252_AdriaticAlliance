const express = require('express');
const router  = express.Router();
const sensorService = require('../services/sensorService');

/**
 * @openapi
 * /sensors/latest:
 *   get:
 *     tags: [Sensors]
 *     summary: Get all cached sensor readings
 *     responses:
 *       200:
 *         description: Array of latest sensor events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NormalizedEvent'
 *                 count:
 *                   type: integer
 */
router.get('/latest', (req, res) => {
  const data = sensorService.getLatestAll();
  res.json({ data, count: data.length });
});

/**
 * @openapi
 * /sensors/latest/{sensorId}:
 *   get:
 *     tags: [Sensors]
 *     summary: Get cached readings for a specific sensor
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of latest metrics for the sensor
 *       404:
 *         description: No cached data for this sensor
 */
router.get('/latest/:sensorId(*)', (req, res) => {
  const data = sensorService.getLatestBySensor(req.params.sensorId);
  if (data.length === 0) return res.status(404).json({ error: 'No data cached for this sensor yet' });
  res.json({ data, count: data.length });
});

module.exports = router;
