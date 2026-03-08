// rest.particulate.v1 — air_quality_pm25
module.exports = function normalizeParticulate(sensorId, sourceType, raw) {
  return [
    { metric: 'pm1',  value: raw.pm1_ug_m3,  unit: 'µg/m³' },
    { metric: 'pm25', value: raw.pm25_ug_m3, unit: 'µg/m³' },
    { metric: 'pm10', value: raw.pm10_ug_m3, unit: 'µg/m³' },
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
