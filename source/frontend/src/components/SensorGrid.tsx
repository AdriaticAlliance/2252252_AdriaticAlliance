import type { SensorReading } from '../types';
import SensorCard from './SensorCard';

export default function SensorGrid({ sensors }: { sensors: SensorReading[] }) {
  return <div className="sensor-grid">{sensors.map((sensor) => <SensorCard key={`${sensor.source_name}:${sensor.metric_name}`} sensor={sensor} />)}</div>;
}