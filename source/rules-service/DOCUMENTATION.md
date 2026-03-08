# Rules-Service — Technical Documentation

> **Service**: `rules-service` (Student B)
> **Port**: `4000` | **Stack**: Node.js, Express, sql.js (SQLite), KafkaJS, ws
> **Swagger UI**: `http://localhost:4000/docs` | **OpenAPI JSON**: `http://localhost:4000/openapi.json`

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Kafka Integration](#2-kafka-integration)
3. [REST API Reference](#3-rest-api-reference)
4. [WebSocket Protocol](#4-websocket-protocol)
5. [Database Schema](#5-database-schema)
6. [Rule Engine Logic](#6-rule-engine-logic)
7. [Configuration](#7-configuration)
8. [Project Structure](#8-project-structure)
9. [Running the Service](#9-running-the-service)

---

## 1. Architecture

### Layered Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                        index.js (Express)                           │
│  /health  /meta  /docs  /openapi.json                               │
├──────────────┬──────────────────┬────────────────┬──────────────────┤
│ routes/      │ routes/          │ routes/         │ ws/              │
│ rules.js     │ actuators.js     │ sensors.js      │ wsServer.js      │
│ (Controller) │ (Controller)     │ (Controller)    │ (Real-time)      │
├──────────────┼──────────────────┼────────────────┤                  │
│ services/    │ services/        │ services/       │                  │
│ ruleService  │ actuatorService  │ sensorService   │                  │
│ (Business)   │ (Business)       │ (Business)      │                  │
├──────────────┴──────────────────┼────────────────┤                  │
│ db/database.js + migrations.js  │ state/          │                  │
│ (SQLite via sql.js)             │ sensorCache.js  │                  │
├─────────────────────────────────┴────────────────┤                  │
│              engine/ruleEvaluator.js              │◄─── kafka/       │
│              (IF/THEN evaluation)                 │     consumer.js  │
└──────────────────────────────────────────────────┴──────────────────┘
                              ▲                        ▲
                              │ POST                   │ consume
                              ▼                        │
                    ┌──────────────────┐     ┌──────────────────┐
                    │  Mars Simulator  │     │      Kafka       │
                    │  :8080           │     │ mars.events.*    │
                    └──────────────────┘     └──────────────────┘
```

**Layer responsibilities:**

| Layer | Files | Responsibility |
|-------|-------|----------------|
| **Routes** (Controllers) | `routes/*.js` | HTTP handling, input validation, OpenAPI annotations |
| **Services** (Business Logic) | `services/*.js` | DB queries, simulator proxy, audit logging |
| **Engine** | `engine/ruleEvaluator.js` | Evaluates sensor events against rules, triggers actuators |
| **State** | `state/sensorCache.js` | In-memory latest-value cache for sensors |
| **Data** | `db/database.js`, `db/migrations.js` | SQLite singleton, table creation |
| **Real-time** | `kafka/*.js`, `ws/wsServer.js` | Kafka message consumption, WebSocket broadcast |

---

## 2. Kafka Integration

### Approach

The rules-service acts as a **Kafka consumer only** — it does not produce messages. It subscribes to two topics published by Student A's ingestion service:

| Topic | Group ID | Purpose |
|-------|----------|---------|
| `mars.events.normalized` | `rules-service` | All sensor events (after normalization by Student A) |
| `mars.events.warnings` | `rules-service-warnings` | Events with `status: "warning"` (subset of normalized) |

### Consumer Pipeline (`consumer.js`)

```
Kafka message (mars.events.normalized)
       │
       ▼
  Parse JSON
       │
       ▼
  Validate fields (sensor_id, metric, value required)
       │
       ├──► sensorCache.update(event)        // store latest reading
       │
       ├──► evaluateEvent(event)             // check rules → may fire actuators
       │
       └──► wsServer.broadcast({             // push to all frontend clients
              type: 'sensor_update',
              payload: event
            })
```

### Warning Consumer Pipeline (`warningConsumer.js`)

```
Kafka message (mars.events.warnings)
       │
       ▼
  Parse JSON
       │
       └──► wsServer.broadcast({
              type: 'warning',
              payload: event
            })
```

### Expected Message Format (from Student A)

```json
{
  "sensor_id":   "greenhouse_temperature",
  "source_type": "rest",
  "metric":      "temperature",
  "value":       31.2,
  "unit":        "°C",
  "status":      "warning",
  "timestamp":   "2036-03-05T14:32:00Z",
  "raw":         {}
}
```

### Startup Behavior

- On startup, the service attempts to connect to Kafka with **15 retries** (3s delay each = 45s max wait).
- If all retries fail, the service starts in **HTTP-only mode** — the REST API works, but no live events are consumed or broadcast.
- This is logged as: `[rules-service] Could not connect to Kafka. Starting HTTP-only mode.`

### Consumer Group IDs

Two separate consumer groups ensure the normalized consumer and warning consumer process messages independently:

| Consumer | Group ID |
|----------|----------|
| Main | `rules-service` |
| Warnings | `rules-service-warnings` |

---

## 3. REST API Reference

**Base URL**: `http://localhost:4000`

### 3.1 System Endpoints

#### `GET /health`

Service health check.

**Response** `200`:
```json
{
  "status": "ok",
  "service": "rules-service",
  "cached_sensors": 5,
  "uptime_s": 120
}
```

#### `GET /meta`

Lists all known sensors, actuators, and valid operators. Useful for Student C's dropdowns.

**Response** `200`:
```json
{
  "known_sensors": [
    "greenhouse_temperature", "entrance_humidity", "co2_hall",
    "corridor_pressure", "hydroponic_ph", "water_tank_level",
    "air_quality_pm25", "air_quality_voc",
    "mars/telemetry/solar_array", "mars/telemetry/power_bus",
    "mars/telemetry/power_consumption", "mars/telemetry/radiation",
    "mars/telemetry/life_support", "mars/telemetry/thermal_loop",
    "mars/telemetry/airlock"
  ],
  "known_actuators": [
    "cooling_fan", "entrance_humidifier", "hall_ventilation", "habitat_heater"
  ],
  "valid_operators": ["<", "<=", "=", ">", ">="]
}
```

#### `GET /docs`

Interactive Swagger UI for API exploration.

#### `GET /openapi.json`

Raw OpenAPI 3.0.3 specification.

---

### 3.2 Rules CRUD

#### `GET /rules`

List all automation rules.

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "sensor_id": "greenhouse_temperature",
      "metric": "temperature",
      "operator": ">",
      "threshold": 28,
      "unit": "°C",
      "actuator": "cooling_fan",
      "target_state": "ON",
      "enabled": 1,
      "created_at": "2036-03-05T14:00:00Z",
      "updated_at": "2036-03-05T14:00:00Z"
    }
  ],
  "count": 1
}
```

---

#### `GET /rules/:id`

Get a single rule.

| Param | Type | In | Description |
|-------|------|----|-------------|
| `id` | integer | path | Rule ID |

**Response** `200`: Single rule object (same shape as above).
**Response** `404`: `{ "error": "Rule 99 not found" }`

---

#### `POST /rules`

Create a new automation rule.

**Request Body** (all fields required except `unit`):
```json
{
  "sensor_id":    "greenhouse_temperature",
  "metric":       "temperature",
  "operator":     ">",
  "threshold":    28,
  "unit":         "°C",
  "actuator":     "cooling_fan",
  "target_state": "ON"
}
```

**Validation rules:**
| Field | Constraint |
|-------|-----------|
| `sensor_id` | Must be in `KNOWN_SENSORS` |
| `metric` | Non-empty string |
| `operator` | One of: `<`, `<=`, `=`, `>`, `>=` |
| `threshold` | Must be a number |
| `actuator` | Must be in `KNOWN_ACTUATORS` |
| `target_state` | `"ON"` or `"OFF"` |

**Response** `201`: Created rule object with `id`, `enabled`, `created_at`, `updated_at`.
**Response** `400`: `{ "errors": ["sensor_id \"foo\" is not a known sensor"] }`

---

#### `PUT /rules/:id`

Full replacement update. Same body/validation as POST.

**Response** `200`: Updated rule object.
**Response** `404`: Rule not found.
**Response** `400`: Validation errors.

---

#### `PATCH /rules/:id/toggle`

Toggle or explicitly set the `enabled` flag.

**Request Body** (optional):
```json
{ "enabled": true }
```

- **Without body**: Flips `enabled` (0→1 or 1→0).
- **With body**: Sets `enabled` to the exact value provided.

**Response** `200`: Rule object with updated `enabled` field.
**Response** `404`: Rule not found.

---

#### `DELETE /rules/:id`

Delete a rule permanently.

**Response** `204`: No content (success).
**Response** `404`: Rule not found.

---

### 3.3 Actuators

#### `GET /actuators`

Proxy to the simulator — returns current actuator states.

**Response** `200` (from simulator):
```json
{
  "actuators": {
    "cooling_fan": "OFF",
    "entrance_humidifier": "OFF",
    "hall_ventilation": "OFF",
    "habitat_heater": "OFF"
  }
}
```
**Response** `502`: Simulator unreachable.

---

#### `POST /actuators/:name`

Manually set an actuator's state. Proxied to the simulator + logged in audit trail.

| Param | Type | In | Values |
|-------|------|----|--------|
| `name` | string | path | `cooling_fan`, `entrance_humidifier`, `hall_ventilation`, `habitat_heater` |

**Request Body**:
```json
{ "state": "ON" }
```

**Response** `200`:
```json
{
  "actuator": "cooling_fan",
  "state": "ON",
  "updated_at": "2036-03-05T14:32:01Z"
}
```
**Response** `400`: Invalid state.
**Response** `404`: Unknown actuator.
**Response** `502`: Simulator unreachable.

**Side effects:**
1. Simulator receives `POST /api/actuators/{name}` with `{ "state": "ON" }`
2. Audit log row inserted with `trigger_type: "manual"`
3. WebSocket broadcast: `{ type: "actuator_update", payload: {...} }`

---

#### `GET /actuators/logs`

Retrieve the actuator audit log (descending by timestamp).

| Param | Type | In | Default |
|-------|------|----|---------|
| `limit` | integer | query | 100 (max 500) |
| `offset` | integer | query | 0 |

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "actuator": "cooling_fan",
      "new_state": "ON",
      "trigger_type": "rule",
      "rule_id": 1,
      "sensor_id": "greenhouse_temperature",
      "metric": "temperature",
      "sensor_value": 31.2,
      "timestamp": "2036-03-05T14:32:01Z"
    }
  ],
  "count": 1,
  "limit": 100,
  "offset": 0
}
```

---

### 3.4 Sensors

#### `GET /sensors/latest`

All cached sensor readings (in-memory, populated by Kafka consumer).

**Response** `200`:
```json
{
  "data": [
    {
      "sensor_id": "greenhouse_temperature",
      "source_type": "rest",
      "metric": "temperature",
      "value": 31.2,
      "unit": "°C",
      "status": "warning",
      "timestamp": "2036-03-05T14:32:00Z",
      "cached_at": "2036-03-05T14:32:01Z"
    }
  ],
  "count": 1
}
```

> **Note**: Returns empty array `[]` until the first Kafka message is consumed.

---

#### `GET /sensors/latest/:sensorId`

Cached readings for a specific sensor. Supports telemetry IDs with `/` (e.g. `mars/telemetry/solar_array`).

**Response** `200`: Array of metrics for that sensor.
**Response** `404`: `{ "error": "No data cached for this sensor yet" }`

---

## 4. WebSocket Protocol

**URL**: `ws://localhost:4000`

### Connection

On connect, the server sends:
```json
{ "type": "connected", "message": "Mars IoT rules-service WS ready" }
```

### Message Types

| Type | When Emitted | Payload |
|------|-------------|---------|
| `connected` | On initial connection | Welcome message |
| `sensor_update` | Every normalized Kafka event | Full normalized event object |
| `warning` | Every warning Kafka event | Full normalized event object |
| `actuator_update` | After any actuator state change (manual or rule) | Actuator change details |

### Payload Shapes

**`sensor_update`**:
```json
{
  "type": "sensor_update",
  "payload": {
    "sensor_id": "greenhouse_temperature",
    "source_type": "rest",
    "metric": "temperature",
    "value": 31.2,
    "unit": "°C",
    "status": "warning",
    "timestamp": "2036-03-05T14:32:00Z"
  }
}
```

**`warning`**:
```json
{
  "type": "warning",
  "payload": {
    "sensor_id": "co2_hall",
    "source_type": "rest",
    "metric": "co2",
    "value": 850,
    "unit": "ppm",
    "status": "warning",
    "timestamp": "2036-03-05T14:33:00Z"
  }
}
```

**`actuator_update`**:
```json
{
  "type": "actuator_update",
  "payload": {
    "actuator": "cooling_fan",
    "state": "ON",
    "trigger_type": "rule",
    "rule_id": 1,
    "timestamp": "2036-03-05T14:32:01Z"
  }
}
```

---

## 5. Database Schema

**Engine**: SQLite (via sql.js, persisted to `./data/rules.db`)

### Table: `rules`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Rule identifier |
| `sensor_id` | TEXT | NOT NULL | Which sensor to watch |
| `metric` | TEXT | NOT NULL | Which metric (e.g. `temperature`, `power_kw`) |
| `operator` | TEXT | NOT NULL, CHECK(`<`,`<=`,`=`,`>`,`>=`) | Comparison operator |
| `threshold` | REAL | NOT NULL | Trigger value |
| `unit` | TEXT | NOT NULL, DEFAULT `''` | Display unit |
| `actuator` | TEXT | NOT NULL | Target actuator to control |
| `target_state` | TEXT | NOT NULL, CHECK(`ON`,`OFF`) | Desired actuator state when rule fires |
| `enabled` | INTEGER | NOT NULL, DEFAULT `1` | 0 = disabled, 1 = enabled |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |

### Table: `actuator_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Log entry identifier |
| `actuator` | TEXT | NOT NULL | Actuator name |
| `new_state` | TEXT | NOT NULL, CHECK(`ON`,`OFF`) | State it was set to |
| `trigger_type` | TEXT | NOT NULL, CHECK(`manual`,`rule`) | What triggered the change |
| `rule_id` | INTEGER | Nullable | Which rule triggered it (null if manual) |
| `sensor_id` | TEXT | Nullable | Source sensor (null if manual) |
| `metric` | TEXT | Nullable | Source metric (null if manual) |
| `sensor_value` | REAL | Nullable | Value that triggered (null if manual) |
| `timestamp` | TEXT | NOT NULL | ISO 8601 UTC timestamp |

### Persistence

- sql.js runs in-memory and is persisted to disk via `save()` after **every** write operation (INSERT, UPDATE, DELETE).
- On startup, the existing DB file is loaded from `./data/rules.db`. If it doesn't exist, a new DB is created.

---

## 6. Rule Engine Logic

### How Rules Work

A rule defines: **"IF sensor X's metric Y is [operator] threshold → SET actuator Z to state"**

Example: *"If greenhouse_temperature's temperature > 28°C → turn cooling_fan ON"*

### Evaluation Flow

```
1. Kafka event arrives: { sensor_id, metric, value, ... }
2. Query DB: SELECT * FROM rules WHERE enabled=1 AND sensor_id=? AND metric=?
3. For each matching rule:
   a. evaluate(value, operator, threshold)  →  true/false
   b. If true AND not a duplicate trigger:
      - POST to simulator: /api/actuators/{actuator}  { state: target_state }
      - Write audit log row
      - Broadcast actuator_update via WebSocket
      - Mark as lastTriggered
   c. If false:
      - Clear lastTriggered (so it can fire again when condition returns)
```

### Deduplication

To prevent audit log spam (e.g. temperature stays above 28°C and every event re-triggers), the evaluator tracks a `lastTriggered` Map:

| Scenario | Action |
|----------|--------|
| Rule fires, same state as last trigger | **Skip** (no API call, no log) |
| Rule fires, different state from last trigger | **Execute** (call simulator, log it) |
| Rule fires for the first time | **Execute** |
| Condition no longer met | **Reset** (so it can fire again next time) |

### The `evaluate()` Pure Function

```javascript
evaluate(30, '>', 28)   // → true   (30 > 28)
evaluate(25, '>', 28)   // → false  (25 > 28)
evaluate(28, '>=', 28)  // → true   (28 >= 28)
evaluate(28, '=', 28)   // → true   (28 === 28)
evaluate(10, '<', 20)   // → true   (10 < 20)
```

---

## 7. Configuration

All values loaded from `.env` via `dotenv`. See `.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | HTTP + WS server port |
| `KAFKA_BROKER` | `localhost:29092` | Kafka bootstrap server |
| `SIMULATOR_URL` | `http://localhost:8080` | Mars IoT Simulator base URL |
| `DB_PATH` | `./data/rules.db` | SQLite file location |
| `KAFKA_TOPIC_NORMALIZED` | `mars.events.normalized` | Normalized events topic |
| `KAFKA_TOPIC_WARNINGS` | `mars.events.warnings` | Warning events topic |
| `KAFKA_GROUP_ID` | `rules-service` | Kafka consumer group prefix |

---

## 8. Project Structure

```
backend/
├── src/
│   ├── index.js                 # Entry point: Express + WS + Kafka startup
│   ├── config.js                # Environment variables + whitelists
│   ├── swagger.js               # OpenAPI 3.0 spec generation
│   ├── db/
│   │   ├── database.js          # SQLite singleton (sql.js)
│   │   └── migrations.js        # CREATE TABLE statements
│   ├── services/
│   │   ├── ruleService.js       # Rule CRUD business logic
│   │   ├── actuatorService.js   # Simulator proxy + audit log + WS broadcast
│   │   └── sensorService.js     # Sensor cache access
│   ├── routes/
│   │   ├── rules.js             # Rule CRUD endpoints
│   │   ├── actuators.js         # Actuator proxy + logs endpoints
│   │   └── sensors.js           # Sensor cache endpoints
│   ├── engine/
│   │   └── ruleEvaluator.js     # IF/THEN evaluation + deduplication
│   ├── state/
│   │   └── sensorCache.js       # In-memory Map of latest sensor readings
│   ├── kafka/
│   │   ├── consumer.js          # Normalized event consumer
│   │   └── warningConsumer.js   # Warning event consumer
│   └── ws/
│       └── wsServer.js          # WebSocket broadcast server
├── tools/
│   └── mockProducer.js          # Simulates Student A (16 sensor events)
├── package.json
├── Dockerfile
├── docker-compose.dev.yml       # Dev stack: Kafka + Simulator + Kafka UI
├── .env                         # Local config (gitignored)
└── .env.example                 # Template for teammates
```

---

## 9. Running the Service

### Prerequisites
- Node.js v20+
- Docker & Docker Compose (for Kafka + Simulator)

### Start Development Stack

```bash
# 1. Start Kafka, Simulator, Kafka UI
docker compose -f docker-compose.dev.yml up -d

# 2. Wait for Kafka to be ready (~15-20s)
# Check: http://localhost:8090 (Kafka UI)
# Check: http://localhost:8080/health (Simulator)

# 3. Install dependencies & start
npm install
npm run dev

# 4. (Optional) Send mock sensor events
npm run mock
```

### Verify Everything Works

```bash
# Health check
curl http://localhost:4000/health

# Create a rule
curl -X POST http://localhost:4000/rules \
  -H "Content-Type: application/json" \
  -d '{"sensor_id":"greenhouse_temperature","metric":"temperature","operator":">","threshold":28,"unit":"°C","actuator":"cooling_fan","target_state":"ON"}'

# List rules
curl http://localhost:4000/rules

# Check actuator states
curl http://localhost:4000/actuators

# Check audit log
curl http://localhost:4000/actuators/logs

# Check sensor cache
curl http://localhost:4000/sensors/latest

# Open Swagger UI
# → http://localhost:4000/docs
```

### Docker Production Build

```bash
docker build -t rules-service .
docker run -p 4000:4000 \
  -e KAFKA_BROKER=kafka:9092 \
  -e SIMULATOR_URL=http://simulator:8080 \
  -v rules-data:/app/data \
  rules-service
```
