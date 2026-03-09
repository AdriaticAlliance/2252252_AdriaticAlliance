// rest.level.v1 — water_tank_level
module.exports = function normalizeLevel(sensorId, sourceType, raw) {
  return [
    { metric: 'level_pct',    value: raw.level_pct,    unit: '%' },
    { metric: 'level_liters', value: raw.level_liters, unit: 'L' },
  ].map(m => ({
    sensor_id:   sensorId,
    source_type: sourceType,
    metric:      m.metric,
    value:       m.value,
    unit:        m.unit,
    status:      raw.status || 'ok',
    timestamp:   raw.captured_at,
    raw,
  }));
};
