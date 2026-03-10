// Key format: "sensor_id::metric"  e.g. "greenhouse_temperature::temperature"
// Value: an array of up to 30 recent normalized event objects

const cache = new Map();
const MAX_HISTORY = 30;

function update(event) {
  if (!event.sensor_id || !event.metric) return;
  const key = `${event.sensor_id}::${event.metric}`;
  const record = {
    ...event,
    cached_at: new Date().toISOString(),
  };
  
  if (!cache.has(key)) {
    cache.set(key, []);
  }
  const history = cache.get(key);
  history.push(record);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

function getAll() {
  return Array.from(cache.values()).map(history => history[history.length - 1]);
}

function get(sensorId, metric) {
  const history = cache.get(`${sensorId}::${metric}`);
  return history ? history[history.length - 1] : null;
}

function getHistory(sensorId, metric) {
  return cache.get(`${sensorId}::${metric}`) || [];
}

function size() {
  return cache.size;
}

module.exports = { update, getAll, get, getHistory, size };
