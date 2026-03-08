// Key format: "sensor_id::metric"  e.g. "greenhouse_temperature::temperature"
// Value: the full normalized event object

const cache = new Map();

function update(event) {
  if (!event.sensor_id || !event.metric) return;
  const key = `${event.sensor_id}::${event.metric}`;
  cache.set(key, {
    ...event,
    cached_at: new Date().toISOString(),
  });
}

function getAll() {
  return Array.from(cache.values());
}

function get(sensorId, metric) {
  return cache.get(`${sensorId}::${metric}`) || null;
}

function size() {
  return cache.size;
}

module.exports = { update, getAll, get, size };
