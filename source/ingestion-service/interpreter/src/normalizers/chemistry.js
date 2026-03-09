// rest.chemistry.v1 — hydroponic_ph, air_quality_voc
module.exports = function normalizeChemistry(sensorId, sourceType, raw) {
  return raw.measurements.map(m => ({
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
