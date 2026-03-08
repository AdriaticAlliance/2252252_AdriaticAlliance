// rest.scalar.v1 — greenhouse_temperature, entrance_humidity, co2_hall, corridor_pressure
module.exports = function normalizeScalar(sensorId, sourceType, raw) {
  return [{
    sensor_id:   sensorId,
    source_type: sourceType,
    metric:      raw.metric,
    value:       raw.value,
    unit:        raw.unit,
    status:      raw.status || 'ok',
    timestamp:   raw.captured_at,
    raw,
  }];
};
