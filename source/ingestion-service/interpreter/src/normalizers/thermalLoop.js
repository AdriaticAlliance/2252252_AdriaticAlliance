// topic.thermal_loop.v1
module.exports = function normalizeThermalLoop(sensorId, sourceType, raw) {
  return [
    { metric: 'temperature_c', value: raw.temperature_c, unit: '°C'    },
    { metric: 'flow_l_min',    value: raw.flow_l_min,    unit: 'L/min' },
  ].map(m => ({
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
