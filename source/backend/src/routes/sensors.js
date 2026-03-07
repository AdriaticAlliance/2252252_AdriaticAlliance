const express     = require('express');
const router      = express.Router();
const sensorCache = require('../state/sensorCache');

// GET /sensors/latest — return all in-memory cached readings
router.get('/latest', (req, res) => {
  const data = sensorCache.getAll();
  res.json({ data, count: data.length });
});

// GET /sensors/latest/:sensorId — return all metrics for one sensor
router.get('/latest/:sensorId(*)', (req, res) => {
  const all = sensorCache.getAll().filter(e => e.sensor_id === req.params.sensorId);
  if (all.length === 0) return res.status(404).json({ error: 'No data cached for this sensor yet' });
  res.json({ data: all, count: all.length });
});

module.exports = router;
