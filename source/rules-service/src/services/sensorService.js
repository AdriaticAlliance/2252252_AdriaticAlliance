const sensorCache = require('../state/sensorCache');

function getLatestAll() {
  return sensorCache.getAll();
}

function getLatestBySensor(sensorId) {
  return sensorCache.getAll().filter(e => e.sensor_id === sensorId);
}

function getCacheSize() {
  return sensorCache.size();
}

module.exports = { getLatestAll, getLatestBySensor, getCacheSize };
