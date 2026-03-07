export type SensorStatus = 'ok' | 'warning';
export type ConnectionStatus = 'connecting' | 'live' | 'mock';
export type ActuatorState = 'ON' | 'OFF';
export type RuleOperator = '<' | '<=' | '=' | '>' | '>=';

export interface SensorReading {
  source_name: string;
  metric_name: string;
  value: number | string;
  unit: string;
  status: SensorStatus;
  observed_at: string;
  source_kind?: 'rest' | 'telemetry';
  raw_schema?: string;
}

export interface Rule {
  id: string | number;
  enabled: boolean;
  sensor_name: string;
  metric_name: string;
  operator: RuleOperator;
  threshold: number;
  unit: string;
  actuator_name: string;
  target_state: ActuatorState;
}

export interface RuleInput {
  sensor_name: string;
  metric_name: string;
  operator: RuleOperator;
  threshold: number;
  unit: string;
  actuator_name: string;
  target_state: ActuatorState;
  enabled: boolean;
}

export interface Actuator {
  actuator_name: string;
  state: ActuatorState;
  updated_at: string;
}