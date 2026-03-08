// topic.power.v1 — solar_array, power_bus, power_consumption
module.exports = function normalizePower(sensorId, sourceType, raw) {
  return [
    { metric: 'power_kw',       value: raw.power_kw,       unit: 'kW'  },
    { metric: 'voltage_v',      value: raw.voltage_v,      unit: 'V'   },
    { metric: 'current_a',      value: raw.current_a,      unit: 'A'   },
    { metric: 'cumulative_kwh', value: raw.cumulative_kwh, unit: 'kWh' },
  ].map(m => ({
    sensor_id:   sensorId,
    source_type: sourceType,
    metric:      m.metric,
    value:       m.value,
    unit:        m.unit,
    status:      'ok',
    timestamp:   raw.event_time,
    raw,
  }));
};
