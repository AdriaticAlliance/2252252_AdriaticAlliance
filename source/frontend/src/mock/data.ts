import type { Actuator, Rule, SensorReading } from '../types';

export const initialSensors: SensorReading[] = [
  { source_name: 'greenhouse_temperature', metric_name: 'temperature', value: 24.6, unit: 'C', status: 'ok', observed_at: new Date().toISOString(), source_kind: 'rest', raw_schema: 'rest.scalar.v1' },
  { source_name: 'entrance_humidity', metric_name: 'humidity', value: 51.2, unit: '%', status: 'ok', observed_at: new Date().toISOString(), source_kind: 'rest', raw_schema: 'rest.scalar.v1' },
  { source_name: 'co2_hall', metric_name: 'co2', value: 730, unit: 'ppm', status: 'warning', observed_at: new Date().toISOString(), source_kind: 'rest', raw_schema: 'rest.scalar.v1' },
  { source_name: 'water_tank_level', metric_name: 'level_pct', value: 68, unit: '%', status: 'ok', observed_at: new Date().toISOString(), source_kind: 'rest', raw_schema: 'rest.level.v1' },
  { source_name: 'mars/telemetry/power_consumption', metric_name: 'power_kw', value: 9.8, unit: 'kW', status: 'ok', observed_at: new Date().toISOString(), source_kind: 'telemetry', raw_schema: 'topic.power.v1' }
];

export const initialRules: Rule[] = [
  { id: 1, enabled: true, sensor_name: 'greenhouse_temperature', metric_name: 'temperature', operator: '>', threshold: 28, unit: 'C', actuator_name: 'cooling_fan', target_state: 'ON' },
  { id: 2, enabled: true, sensor_name: 'co2_hall', metric_name: 'co2', operator: '>', threshold: 700, unit: 'ppm', actuator_name: 'hall_ventilation', target_state: 'ON' }
];

export const initialActuators: Actuator[] = [
  { actuator_name: 'cooling_fan', state: 'OFF', updated_at: new Date().toISOString() },
  { actuator_name: 'entrance_humidifier', state: 'OFF', updated_at: new Date().toISOString() },
  { actuator_name: 'hall_ventilation', state: 'ON', updated_at: new Date().toISOString() },
  { actuator_name: 'habitat_heater', state: 'OFF', updated_at: new Date().toISOString() }
];