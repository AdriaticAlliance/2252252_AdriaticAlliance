// topic.environment.v1 — radiation, life_support
module.exports = function normalizeEnvironment(sensorId, sourceType, raw) {
  return raw.measurements.map(m => ({
    sensor_id:   sensorId,
    source_type: sourceType,
    metric:      m.metric,
    value:       m.value,
    unit:        m.unit,
    status:      raw.status || 'ok',
    timestamp:   raw.event_time,
    raw,
  }));
};
