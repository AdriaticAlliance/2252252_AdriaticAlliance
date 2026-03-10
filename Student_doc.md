# SYSTEM DESCRIPTION:

The Mars IoT Platform is a distributed, event-driven architecture designed to autonomously collect, normalize, evaluate, and visualize real-time telemetry and sensor data from a simulated Mars habitat simulator. By utilizing a central Kafka message broker backbone, the platform ensures decoupled ingestion routing and stream processing, allowing disparate sensor topologies to be translated into a unified state representation that powers a live React-based dashboard.

The overarching flow routes data across four principal microservices. The Gate service polls the simulator for raw device feeds and forwards these arbitrary formats over Kafka to the Interpreter. The Interpreter flattens and normalizes every distinct payload format against an internal JSON schema, pushing unified events to a common broker topic. The Rules Service consumes this normalized stream to maintain an in-memory real-time state cache, executes mathematical operator logic for automation conditions via its SQLite persistence backend, triggers physical simulator actuators upon rule breaches, and serves WebSocket broadcasts and REST endpoints natively consumed by the external Frontend web application.

# USER STORIES:
US-01: As a ingestion service I want to periodically poll all 8 REST sensors every N seconds So that their data is always up to date
US-02: As a ingestion service I want to subscribe to all 7 telemetry topics via WebSocket So that streaming data is captured as it arrives
US-03: As a ingestion service I want to convert every payload into a unified internal event schema So that downstream services are decoupled from device formats
US-04: As a ingestion service I want to publish every normalized event to a Kafka topic So that all consumers share a single event bus
US-05: As a operator I want to define an IF-THEN automation rule via the dashboard So that the habitat reacts automatically to sensor conditions
US-06: As a operator I want to edit an existing rule's condition or action So that I can tune automations without deleting them
US-07: As a operator I want to toggle a rule on/off without deleting it So that I can suspend automations during maintenance
US-08: As a operator I want to delete a rule permanently So that obsolete automations are removed
US-09: As a rules engine I want to evaluate every incoming event against all enabled rules So that actuator commands are triggered automatically
US-10: As a processing service I want to detect when a sensor reports status "warning" So that the system can surface the anomaly in real time
US-11: As a operator I want to see a live alert panel showing active warnings So that I can react quickly to habitat anomalies
US-12: As a operator I want to see the current reading of every sensor on a dashboard So that I can monitor the full habitat state at a glance
US-13: As a operator I want to see a live-updating line chart for a selected sensor So that I can observe trends over time
US-14: As a operator I want to toggle any actuator directly from the dashboard So that I can override automatic control in an emergency
US-15: As a operator I want to see a chronological log of all actuator state changes So that I can audit what happened and when

# CONTAINERS:

## CONTAINER_NAME: kafka
### DESCRIPTION:
The Kafka message broker running in KRaft mode (no Zookeeper). It serves as the primary internal communication bus for all decoupled ingestion and rule processing event streams.
### USER STORIES:
Internal infrastructure component.
### PORTS:
9092
### DESCRIPTION:
Acts as the intermediary event bus eliminating point-to-point coupling between the Gate, Interpreter, and Rules engines.
### PERSISTENCE EVALUATION:
Kafka retains messages on disk temporarily (/tmp/kraft-combined-logs). Automation rule data is not stored here.
### EXTERNAL SERVICES CONNECTIONS:
None.

### MICROSERVICES:
#### MICROSERVICE: kafka
- TYPE: broker
- DESCRIPTION: KRaft-mode Kafka broker. Single node.
- PORTS: 9092
- TECHNOLOGICAL SPECIFICATION:
  Image: confluentinc/cp-kafka:7.5.0
  Key Environment Variables:
  - KAFKA_NODE_ID: Sets the cluster node identifier (1).
  - KAFKA_PROCESS_ROLES: Designates the node as both a broker and controller for KRaft.
  - KAFKA_LISTENERS: Defines the bind addresses for PLAINTEXT and CONTROLLER protocols.
  - KAFKA_CONTROLLER_QUORUM_VOTERS: Defines the controller quorum for KRaft leader election.
  - KAFKA_LOG_DIRS: Specifies the local path for segment persistence.
- SERVICE ARCHITECTURE:
  Two topic types are utilized on the broker. The `interpret_sensor_*` topics transport arbitrary raw payloads produced asynchronously by the gate routing towards the interpreter. The `mars.common-data-records` topic holds the strictly formatted single-event schema structures transmitted by the interpreter and ultimately consumed exclusively by the downstream rules-service.

## CONTAINER_NAME: ingestion-gate
### DESCRIPTION:
Responsible for data collection from the simulator. Polls all 8 REST sensors and subscribes to all 7 telemetry WebSocket topics. Forwards raw payloads to the interpreter via Kafka.
### USER STORIES:
US-01, US-02
### PORTS:
3001
### DESCRIPTION:
Ingests environmental data at the edge of the network and proxies it cleanly onto the event broker.
### PERSISTENCE EVALUATION:
No persistence. Stateless collector.
### EXTERNAL SERVICES CONNECTIONS:
Connects to the simulator at http://simulator:8080 for REST polling and WebSocket telemetry. Connects to Kafka broker to publish raw payloads.

### MICROSERVICES:
#### MICROSERVICE: ingestion-gate
- TYPE: backend
- DESCRIPTION: Autonomous REST poller and WebSocket telemetry subscriber. Forwards all raw payloads to Kafka topic interpret_sensor_{name}.
- PORTS: 3001
- TECHNOLOGICAL SPECIFICATION:
  Node.js Version: node:20-alpine
  Framework: Express
  Key Dependencies:
  - axios: Handles HTTP GET polling executing against the Simulator REST endpoints.
  - express: Exposes health check endpoints and single-sensor poll triggers.
  - kafkajs: Manages connection to the Kafka broker for raw data publishing.
  - ws: Establishes the persistent WebSocket telemetry stream against the Simulator.
- SERVICE ARCHITECTURE:
  - poller.js: Operates on a detached `setInterval` loop according to configuration timing, asynchronously requesting the current state of strictly defined REST-based sensors and emitting them back to the main router.
  - index.js telemetry section: Calls `startSubscriptions()` to formulate a WebSocket client attached immediately to the Simulator's `/api/telemetry/ws` port, passively awaiting complex streaming telemetry blocks.
  - Kafka producer: Collects data from both the poller and WebSocket subscriber, formatting it with correct topic prefixes, and producing it into the broker via the `mars-gate` client connection logic targeting `interpret_sensor_<name>` or `interpret_telemetry_<name>`.
- ENDPOINTS:

| HTTP METHOD | URL | Description | User Stories |
| ----------- | --- | ----------- | ------------ |
| GET | /health | Returns service health status | - |
| GET | /sensors/:sensorName | Triggers a manual REST poll for a specific sensor | - |

## CONTAINER_NAME: ingestion-interpreter
### DESCRIPTION:
Consumes raw sensor payloads from Kafka, normalizes them into the unified internal event schema, and publishes normalized events to mars.common-data-records.
### USER STORIES:
US-03, US-04
### PORTS:
3002
### DESCRIPTION:
Performs heavy schema translation, decoupling external hardware payload formats from internal operational definitions.
### PERSISTENCE EVALUATION:
No persistence. Stateless transformer.
### EXTERNAL SERVICES CONNECTIONS:
Connects to Kafka broker only. No connection to simulator.

### MICROSERVICES:
#### MICROSERVICE: ingestion-interpreter
- TYPE: backend
- DESCRIPTION: Schema normalization engine. Routes each raw payload to the correct normalizer based on sensor type and publishes flattened events.
- PORTS: 3002
- TECHNOLOGICAL SPECIFICATION:
  Node.js Version: node:20-alpine
  Framework: Express (Native HTTP routes initialized on app instance)
  Key Dependencies:
  - ajv: Parses and actively validates incoming/outgoing schema definitions to guarantee the unified payload format structure.
  - kafkajs: Maintains Consumer subscriptions and Producer publishing streams against the broker.
- SERVICE ARCHITECTURE:
  - How the consumer subscribes: It attaches directly to wildcards/metrics emitted by the Gate targeting `simulator.sensors.raw`, `simulator.telemetry.raw`, and implicitly proxies events towards specific interpretation pipelines.
  - Normalizer dispatcher: Reads the raw Kafka topic or payload identifier and dynamically directs execution context into the corresponding logic file isolated specifically for that shape structure.
  - 8 Normalizer files: 
    - scalar.js (Returns 1 flattened event)
    - chemistry.js (Returns N events by iterating arrays)
    - particulate.js (Returns 3 events splitting air composition)
    - level.js (Returns 2 events splitting metrics)
    - power.js (Returns 4 events splitting electrical buses)
    - environment.js (Returns N events mapping constraints)
    - thermalLoop.js (Returns 2 events parsing loop strings)
    - airlock.js (Returns 1 flattened event describing gate status)
  - How the producer publishes: Takes the aggregated flat arrays returned by the normalizers, validates them against the AJV schema, and produces them synchronously onto the `mars.common-data-records` topic.
  - ensureTopicsExist() pattern: Programmatically asserts the target topic presence utilizing Kafka Admin commands to prevent producer faults on boot.
- ENDPOINTS:

| HTTP METHOD | URL | Description | User Stories |
| ----------- | --- | ----------- | ------------ |
| GET | /health | Returns service health status | - |
| POST | /ingest | Accept raw payloads bypassing the gate | - |

## CONTAINER_NAME: rules-service
### DESCRIPTION:
The core automation and state management service. Consumes normalized events from Kafka, maintains a sensor state cache, evaluates automation rules, triggers actuators, persists rules and audit logs in SQLite, and exposes a REST + WebSocket API.
### USER STORIES:
US-05, US-06, US-07, US-08, US-09, US-10, US-12, US-14, US-15
### PORTS:
4000
### DESCRIPTION:
Acts as the central brain of the Mars application executing rule sets instantly against live metrics.
### PERSISTENCE EVALUATION:
Uses SQLite via sql.js. Two tables are persisted: rules and actuator_logs. The database file is stored at the path defined in the DB_PATH env var. It is mounted via a Docker named volume so data survives container restarts. The exact volume name is rules-data.
### EXTERNAL SERVICES CONNECTIONS:
Connects to Kafka broker (mars.common-data-records topic, consumer). Connects to simulator at http://simulator:8080 for actuator POST commands.

### MICROSERVICES:
#### MICROSERVICE: rules-service
- TYPE: backend
- DESCRIPTION: Express REST API + WebSocket server. Manages rule CRUD, actuator proxy, sensor cache, and rule evaluation.
- PORTS: 4000
- TECHNOLOGICAL SPECIFICATION:
  Node.js Version: node:20-alpine
  Framework: Express
  Key Dependencies:
  - kafkajs: Receives the canonical normalized stream from interpreter.
  - sql.js: Provides identical WASM-powered disk-backed relational DB properties without external native C++ requirements.
  - express: Structures the primary REST endpoints spanning rule definitions, data fetches, and swagger mounting.
  - ws: Establishes bidirectional unauthenticated sockets mirroring UI state events dynamically.
  - node-fetch: Issues HTTP POST transmissions targeting the Simulator's actuator APIs.
  - cors: Overrides cross-site network constraints between the dashboard and API.
  - dotenv: Imports raw variables from the host OS context.
  - swagger-jsdoc / swagger-ui-express: Compiles and exposes the interactive `/docs` UI schema.
- SERVICE ARCHITECTURE:
  - kafka/consumer.js: Subscribes exclusively to `mars.common-data-records`, immediately passing deserialized JSON structs towards the evaluator and sensor caches dynamically.
  - engine/ruleEvaluator.js: The core functional engine parsing operator conditions (`>`, `<`, `=`). Controls duplicate execution throttling utilizing a Map (`lastTriggered`).
  - state/sensorCache.js: Executes volatile writes caching a rolling history (up to 30 events) in a memory Map uniquely keyed by `sensor_id::metric`.
  - db/migrations.js: Creates exact schemas upon bootstrap utilizing `CREATE TABLE IF NOT EXISTS` executing directly within the sql.js Wasm binary context.
  - ws/wsServer.js: Defines the `broadcast()` array loop pushing stringified payloads dynamically downstream toward registered web clients.
  - routes/rules.js: Abstracts the CRUD definitions inserting, reading, or toggling rule boolean integers against the DB.
  - routes/actuators.js: Acts as the proxy boundary issuing actual network POST requests to the simulator, instantly creating audit tracking rows locally.
  - routes/sensors.js: Proxies volatile reads of the SensorCache memory objects down via conventional Express JSON responses.
- ENDPOINTS:

| HTTP METHOD | URL | Description | User Stories |
| ----------- | --- | ----------- | ------------ |
| GET | /health | Returns service uptime and cache total | - |
| GET | /meta | Returns distinct dropdown metadata | US-05 |
| GET | /rules | Lists all automation rules | US-06, US-07, US-08 |
| GET | /rules/:id | Fetches a single rule by ID | US-06 |
| POST | /rules | Registers a new automation rule | US-05 |
| PUT | /rules/:id | Applies a complete mutation to an existing rule | US-06 |
| PATCH | /rules/:id/toggle | Switches the enabled/disabled state flag | US-07 |
| DELETE | /rules/:id | Hard deletes the referenced rule | US-08 |
| GET | /actuators | Queries current physical actuator states from Simulator | US-14 |
| GET | /actuators/logs | Provides chronologically ordered triggered actions | US-15 |
| POST | /actuators/:name | Performs a manual override toggle on a hardware component | US-14 |
| GET | /sensors/latest | Returns the globally cached snapshot of every last metric | US-12 |
| GET | /sensors/latest/:sensorId | Returns the cache snapshot specifically isolated to one device | US-13 |
| GET | /sensors/history/:sensorId/:metric | Returns the historical cached readings for a specific sensor | US-13 |
| GET | /docs | Renders Swagger UI documentation portal | - |
| GET | /openapi.json | Exports the raw Swagger JSON schema | - |

WebSocket Messages (ws://host:4000)

| Type | Direction | Payload | Trigger |
| ---- | --------- | ------- | ------- |
| connected | server→client | { type: "connected", message: "Mars IoT rules-service WS ready" } | on connection |
| sensor_update | server→client | NormalizedEvent | on Kafka message |
| warning | server→client | NormalizedEvent | when status=warning |
| actuator_update | server→client | { actuator, state, trigger_type, rule_id, timestamp } | on actuator change |

- DB STRUCTURE:

**_rules_** : | **_id_** | sensor_id | metric | operator | threshold | unit | actuator | target_state | enabled | created_at | updated_at |

**_actuator_logs_** : | **_id_** | actuator | new_state | trigger_type | rule_id | sensor_id | metric | sensor_value | timestamp |

## CONTAINER_NAME: frontend
### DESCRIPTION:
React single-page application served by Nginx. Provides the real-time operator dashboard.
### USER STORIES:
US-05, US-06, US-07, US-08, US-11, US-12, US-13, US-14, US-15
### PORTS:
3000
### DESCRIPTION:
Binds visual elements mapped directly to remote API data architectures in an interactive graphical layout.
### PERSISTENCE EVALUATION:
No persistence. Stateless SPA. Short-term sensor history (up to 30 points) is preloaded from the rules-service cache upon mount and dynamically appended in React component state.
### EXTERNAL SERVICES CONNECTIONS:
Connects to rules-service REST API at http://rules-service:4000. Connects to rules-service WebSocket at ws://rules-service:4000. No connection to simulator or Kafka directly.

### MICROSERVICES:
#### MICROSERVICE: frontend
- TYPE: frontend
- DESCRIPTION: React dashboard for real-time habitat monitoring, rule management, actuator control, and audit log.
- PORTS: 3000
- TECHNOLOGICAL SPECIFICATION:
  React Version: ^18.3.1
  Vite Version: ^5.4.10
  Recharts Version: ^2.10.0
  React Router Version: ^6.16.0
  Nginx serves the production build. Employs a two-stage Docker build separating the node:20-alpine `npm run build` stage outputting to `/dist`, and moving artifacts onto an `nginx:alpine` image context exposing port 80.
- SERVICE ARCHITECTURE:
  - useWebSocket hook: Operates as a singleton WS connection to the rules-service, routing inbound string messages utilizing a switch mapped against the `type` payload component.
  - useSensors hook: Consolidates the initial massive array REST fetch representing the full state cache with identical granular live WS updates.
  - api/client.js: Decouples rendering component layers from the network layer establishing specifically named function bindings wrapping absolute Axios API URL paths and standardized error interception.
  - Message handling: `sensor_update` directly overwrites component state definitions referencing metrics. `warning` triggers identical logic alongside potential visual flashing. `actuator_update` dynamically un-toggles physical UI button state mappings corresponding to automated backend hardware changes.
- PAGES:

| Name | Description | Related Microservice | User Stories |
| ---- | ----------- | -------------------- | ------------ |
| Dashboard | Sensor grid + alert panel | rules-service | US-11, US-12, US-13 |
| Rules | Rule CRUD interface | rules-service | US-05, US-06, US-07, US-08 |
| Actuators | Manual actuator toggles | rules-service | US-14 |
| AuditLog | Chronological actuator history | rules-service | US-15 |
