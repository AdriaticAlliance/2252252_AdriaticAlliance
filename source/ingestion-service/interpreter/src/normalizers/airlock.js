// topic.airlock.v1
module.exports = function normalizeAirlock(sensorId, sourceType, raw) {
  return [{
    sensor_id:   sensorId,
    source_type: sourceType,
    metric:      'cycles_per_hour',
    value:       raw.cycles_per_hour,
    unit:        'cycles/h',
    status:      'ok',
    timestamp:   raw.event_time,
    raw,
  }];
};
