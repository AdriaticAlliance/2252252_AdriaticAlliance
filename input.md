# Mars IoT Platform — input.md

## 1. System Overview

The Mars IoT Platform is a distributed, event-driven system designed to collect, normalize, evaluate, and visualize real-time telemetry and sensor data from a simulated Mars habitat. By utilizing a robust Kafka message broker backbone, the system seamlessly ingests heterogeneous sensor formats and translates them into a single unified event model, ensuring decoupling across the architecture.

The system is compartmentalized into four core services. The `simulator` creates the raw environmental data. The `ingestion-gate` handles HTTP REST polling and WebSocket subscriptions to capture this raw data and forward it. The `ingestion-interpreter` consumes the raw payloads, reshapes them into standard records, and publishes the normalized events. Finally, the `rules-service` consumes the unified stream, caches the latest sensor states, evaluates dynamic automation rules, triggers required actuators, and exposes a REST + WebSocket API consumed by the frontend.

The end-to-end data flow operates circularly: The Simulator generates data which the Gate collects and forwards. The Interpreter normalizes the payloads and drops them into a Kafka topic. The Rules Service consumes from Kafka, evaluates IF-THEN conditions against its SQLite database, and if a threshold is breached, issues a command back to the Simulator's actuator endpoint while simultaneously broadcasting WebSocket updates to the Frontend for live UI reflection.

## 2. User Stories

| ID    | As a...           | I want to...                                                           | So that...                                             |
|-------|-------------------|------------------------------------------------------------------------|--------------------------------------------------------|
| US-01 | ingestion service | periodically poll all 8 REST sensors every N seconds                  | their data is always up to date                        |
| US-02 | ingestion service | subscribe to all 7 telemetry topics via WebSocket                     | streaming data is captured as it arrives               |
| US-03 | ingestion service | convert every payload into a unified internal event schema            | downstream services are decoupled from device formats  |
| US-04 | ingestion service | publish every normalized event to a Kafka topic                       | all consumers share a single event bus                 |
| US-05 | operator          | define an IF-THEN automation rule via the dashboard                   | the habitat reacts automatically to sensor conditions  |
| US-06 | operator          | edit an existing rule's condition or action                           | I can tune automations without deleting them           |
| US-07 | operator          | toggle a rule on/off without deleting it                              | I can suspend automations during maintenance           |
| US-08 | operator          | delete a rule permanently                                             | obsolete automations are removed                       |
| US-09 | rules engine      | evaluate every incoming event against all enabled rules               | actuator commands are triggered automatically          |
| US-10 | processing service| detect when a sensor reports status "warning"                         | the system can surface the anomaly in real time        |
| US-11 | operator          | see a live alert panel showing active warnings                        | I can react quickly to habitat anomalies               |
| US-12 | operator          | see the current reading of every sensor on a dashboard                | I can monitor the full habitat state at a glance       |
| US-13 | operator          | see a live-updating line chart for a selected sensor                  | I can observe trends over time                         |
| US-14 | operator          | toggle any actuator directly from the dashboard                       | I can override automatic control in an emergency       |
| US-15 | operator          | see a chronological log of all actuator state changes                 | I can audit what happened and when                     |

## 3. Unified Internal Event Schema

The unified event schema guarantees that regardless of the sensor's origin format (REST vs WebSocket, scalar vs complex array), the downstream consumers only have to parse a single, flat structure per metric.

```json
{
  "sensor_id": "string - The unique identifier of the sensor (e.g. greenhouse_temperature)",
  "source_type": "string - The data origin, enum: 'rest' or 'telemetry'",
  "metric": "string - The specific metric name measured (e.g. pm25, temperature_c, voltage_v)",
  "value": "number - The actual numeric reading",
  "unit": "string - The physical unit of the measurement (e.g. °C, kW, L)",
  "status": "string - The health indicator, typically 'ok' or 'warning'",
  "timestamp": "string - The ISO 8601 UTC timestamp of when the event was captured",
  "raw": "object - The original unparsed payload directly from the simulator"
}
```

Note: the `raw` field contains the original unmodified simulator payload. It is preserved for debugging purposes and is not used by downstream consumers.

All normalized events are published to the Kafka topic **`mars.common-data-records`**. This is the single topic consumed by all downstream services.

### Examples

**REST Scalar Sensor Example (greenhouse_temperature):**
```json
{
  "sensor_id": "greenhouse_temperature",
  "source_type": "rest",
  "metric": "temperature",
  "value": 24.5,
  "unit": "°C",
  "status": "ok",
  "timestamp": "2036-03-09T22:00:00.000Z",
  "raw": { "metric": "temperature", "value": 24.5, "unit": "°C", "status": "ok", "captured_at": "2036-03-09T22:00:00.000Z" }
}
```

**Telemetry Power Sensor Example (mars/telemetry/solar_array):**
```json
{
  "sensor_id": "mars/telemetry/solar_array",
  "source_type": "telemetry",
  "metric": "power_kw",
  "value": 120.4,
  "unit": "kW",
  "status": "ok",
  "timestamp": "2036-03-09T22:05:00.000Z",
  "raw": { "power_kw": 120.4, "voltage_v": 240, "current_a": 501.6, "cumulative_kwh": 45000, "event_time": "2036-03-09T22:05:00.000Z" }
}
```

### Sensor Mapping Table

| Sensor ID | Schema Family | Events Emitted per Reading |
| :--- | :--- | :--- |
| greenhouse_temperature | scalar | 1 |
| entrance_humidity | scalar | 1 |
| co2_hall | scalar | 1 |
| corridor_pressure | scalar | 1 |
| hydroponic_ph | chemistry | 1 per item in measurements array |
| water_tank_level | level | 2 |
| air_quality_pm25 | particulate | 3 |
| air_quality_voc | chemistry | 1 per item in measurements array |
| mars/telemetry/solar_array | power | 4 |
| mars/telemetry/power_bus | power | 4 |
| mars/telemetry/power_consumption | power | 4 |
| mars/telemetry/radiation | environment | 1 per item in measurements array |
| mars/telemetry/life_support | environment | 1 per item in measurements array |
| mars/telemetry/thermal_loop | thermalLoop | 2 |
| mars/telemetry/airlock | airlock | 1 |

## 4. Rule Model

### Rule Record Fields

```json
{
  "id": "integer - Primary key, auto-incremented",
  "sensor_id": "string - The exact target sensor (e.g. greenhouse_temperature)",
  "metric": "string - The target metric provided by the sensor (e.g. temperature)",
  "operator": "string - The comparison operator (<, <=, =, >, >=)",
  "threshold": "number - The numeric trigger boundary",
  "unit": "string - The unit of the metric, for display purposes",
  "actuator": "string - The target actuator name (e.g. cooling_fan)",
  "target_state": "string - The state to apply if the condition is met (ON or OFF)",
  "enabled": "integer - Boolean flag representing active status (1=enabled, 0=disabled)",
  "created_at": "string - UTC ISO timestamp of creation",
  "updated_at": "string - UTC ISO timestamp of last modification"
}
```

### Syntax

`IF <sensor_id>/<metric> <operator> <threshold> THEN set <actuator> = <target_state>`

### Example Rule

`IF greenhouse_temperature/temperature > 28 THEN set cooling_fan = ON`

### Evaluation Logic

When a normalized event arrives off the Kafka broker, the `ruleEvaluator.js` engine immediately handles it. 
1. It queries the database for all enabled rules (`enabled = 1`) that explicitly match the incoming `sensor_id` and `metric`.
2. For each matched rule, the engine executes a pure algebraic comparison between the real-time event `value` and the rule's `threshold` using the specified `operator`.
3. If the mathematical condition evaluates to `true`, the engine checks an internal state map (`lastTriggered`) to perform deduplication. If the actuator was already triggered to this exact `target_state` for this specific rule, the engine skips execution to avoid spamming the simulator.
4. If it's a new trigger state, the engine calls the Simulator Actuator API via POST and logs the action into the `actuator_logs` table. Finally, it updates the `lastTriggered` cache. If the condition evaluates to `false`, the rule's state is flushed from the `lastTriggered` map, resetting the lock so it can fire again once the threshold is crossed.
