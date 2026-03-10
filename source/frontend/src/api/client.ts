import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const http = axios.create({ baseURL: BASE });


// GET /sensors/latest → { data: NormalizedEvent[], count: number }
export const getSensorsLatest = () =>
  http.get('/sensors/latest').then(r => r.data);

// GET /sensors/latest/{sensorId} → { data: NormalizedEvent[], count: number }
export const getSensorById = (sensorId: string) =>
  http.get(`/sensors/latest/${encodeURIComponent(sensorId)}`).then(r => r.data);

// GET /sensors/history/{sensorId}/{metric} → { data: NormalizedEvent[], count: number }
export const getSensorHistory = (sensorId: string, metric: string) =>
  http.get(`/sensors/history/${encodeURIComponent(sensorId)}/${encodeURIComponent(metric)}`).then(r => r.data);


// GET /rules → { data: Rule[], count: number }
export const getRules = () =>
  http.get('/rules').then(r => r.data);

// GET /rules/{id} → Rule
export const getRuleById = (id: string | number) =>
  http.get(`/rules/${id}`).then(r => r.data);

// POST /rules → Rule (201)
export const createRule = (body: any) =>
  http.post('/rules', body).then(r => r.data);

// PUT /rules/{id} → Rule
export const updateRule = (id: string | number, body: any) =>
  http.put(`/rules/${id}`, body).then(r => r.data);


// pass { enabled: true/false } to set explicitly, or no body to flip
export const toggleRule = (id: string | number, enabled?: boolean) =>
  http.patch(`/rules/${id}/toggle`, enabled !== undefined ? { enabled } : undefined)
    .then(r => r.data);

// DELETE /rules/{id} → 204
export const deleteRule = (id: string | number) =>
  http.delete(`/rules/${id}`);


// GET /actuators → { actuators: { cooling_fan: "ON", ... } }
export const getActuators = () =>
  http.get('/actuators').then(r => r.data);

// POST /actuators/{name} → ActuatorResponse
export const setActuator = (name: string, state: string) =>
  http.post(`/actuators/${name}`, { state }).then(r => r.data);

// GET /actuators/logs?limit=100&offset=0 → { data: ActuatorLog[], count, limit, offset }
export const getAuditLog = (limit = 100, offset = 0) =>
  http.get('/actuators/logs', { params: { limit, offset } }).then(r => r.data);


// GET /meta → { known_sensors[], known_actuators[], valid_operators[] }
export const getMeta = () =>
  http.get('/meta').then(r => r.data);