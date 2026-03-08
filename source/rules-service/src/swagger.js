const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Mars IoT Platform — Rules Service API',
      version: '1.0.0',
      description:
        'Backend API for the Mars habitat automation platform. ' +
        'Manages automation rules, proxies actuator commands to the simulator, ' +
        'caches sensor state, and streams live events via WebSocket.',
      contact: { name: 'Student B' },
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local development' },
    ],
    tags: [
      { name: 'Rules',     description: 'CRUD for IF/THEN automation rules' },
      { name: 'Actuators', description: 'Proxy actuator commands + audit log' },
      { name: 'Sensors',   description: 'In-memory cached sensor readings' },
      { name: 'System',    description: 'Health, metadata, and service info' },
    ],
    components: {
      schemas: {
        RuleInput: {
          type: 'object',
          required: ['sensor_id', 'metric', 'operator', 'threshold', 'actuator', 'target_state'],
          properties: {
            sensor_id:    { type: 'string',  example: 'greenhouse_temperature' },
            metric:       { type: 'string',  example: 'temperature' },
            operator:     { type: 'string',  enum: ['<', '<=', '=', '>', '>='], example: '>' },
            threshold:    { type: 'number',  example: 28 },
            unit:         { type: 'string',  example: '°C' },
            actuator:     { type: 'string',  example: 'cooling_fan' },
            target_state: { type: 'string',  enum: ['ON', 'OFF'], example: 'ON' },
          },
        },
        Rule: {
          allOf: [
            { $ref: '#/components/schemas/RuleInput' },
            {
              type: 'object',
              properties: {
                id:         { type: 'integer', example: 1 },
                enabled:    { type: 'integer', enum: [0, 1], example: 1 },
                created_at: { type: 'string',  format: 'date-time' },
                updated_at: { type: 'string',  format: 'date-time' },
              },
            },
          ],
        },
        NormalizedEvent: {
          type: 'object',
          properties: {
            sensor_id:   { type: 'string',  example: 'greenhouse_temperature' },
            source_type: { type: 'string',  enum: ['rest', 'telemetry'] },
            metric:      { type: 'string',  example: 'temperature' },
            value:       { type: 'number',  example: 31.2 },
            unit:        { type: 'string',  example: '°C' },
            status:      { type: 'string',  enum: ['ok', 'warning', 'unknown'] },
            timestamp:   { type: 'string',  format: 'date-time' },
            cached_at:   { type: 'string',  format: 'date-time' },
          },
        },
        ActuatorResponse: {
          type: 'object',
          properties: {
            actuator:   { type: 'string', example: 'cooling_fan' },
            state:      { type: 'string', enum: ['ON', 'OFF'] },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ActuatorLog: {
          type: 'object',
          properties: {
            id:           { type: 'integer' },
            actuator:     { type: 'string',  example: 'cooling_fan' },
            new_state:    { type: 'string',  enum: ['ON', 'OFF'] },
            trigger_type: { type: 'string',  enum: ['manual', 'rule'] },
            rule_id:      { type: 'integer', nullable: true },
            sensor_id:    { type: 'string',  nullable: true },
            metric:       { type: 'string',  nullable: true },
            sensor_value: { type: 'number',  nullable: true },
            timestamp:    { type: 'string',  format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
