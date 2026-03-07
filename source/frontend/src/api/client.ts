import type { Actuator, Rule, RuleInput, SensorReading } from '../types';
import { initialActuators, initialRules, initialSensors } from '../mock/data';

// Add this declaration so TypeScript recognizes import.meta.env
interface ImportMetaEnv {
  readonly VITE_STATE_API_URL?: string;
  readonly VITE_RULES_API_URL?: string;
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const STATE_API_URL = import.meta.env.VITE_STATE_API_URL || 'http://localhost:8000';
const RULES_API_URL = import.meta.env.VITE_RULES_API_URL || 'http://localhost:8001';
const USE_MOCK = true

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export const api = {
  async getState(): Promise<SensorReading[]> {
    if (USE_MOCK){console.log(USE_MOCK); return initialSensors};
    return requestJson<SensorReading[]>(`${STATE_API_URL}/state`);
  },
async getActuators(): Promise<Actuator[]> {
  if (USE_MOCK) return initialActuators;
  try {
    console.log(`Fetching actuators from: ${RULES_API_URL}/actuators`);
    const result = await requestJson<Actuator[]>(`${RULES_API_URL}/actuators`);
    console.log('Actuators loaded:', result);
    return result;
  } catch (error) {
    console.error('Failed to load actuators:', error);
    console.log(import.meta.env.VITE_USE_MOCK)
    throw error;
  }
},
async getRules(): Promise<Rule[]> {
    if (USE_MOCK) return initialRules;
    return requestJson<Rule[]>(`${RULES_API_URL}/rules`);
  },
  async createRule(rule: RuleInput): Promise<Rule> {
    if (USE_MOCK) throw new Error('Mock mode');
    return requestJson<Rule>(`${RULES_API_URL}/rules`, { method: 'POST', body: JSON.stringify(rule) });
  },
  async toggleRule(ruleId: string | number): Promise<void> {
    if (USE_MOCK) throw new Error('Mock mode');
    await requestJson<void>(`${RULES_API_URL}/rules/${ruleId}/toggle`, { method: 'PATCH' });
  },
  async deleteRule(ruleId: string | number): Promise<void> {
    if (USE_MOCK) throw new Error('Mock mode');
    await requestJson<void>(`${RULES_API_URL}/rules/${ruleId}`, { method: 'DELETE' });
  },
  subscribeToState(onMessage: (payload: SensorReading | SensorReading[]) => void): (() => void) | null {
    if (USE_MOCK) return null;
    const eventSource = new EventSource(`${STATE_API_URL}/state/stream`);
    eventSource.onmessage = (event: MessageEvent<string>) => {
      onMessage(JSON.parse(event.data) as SensorReading | SensorReading[]);
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  },
};