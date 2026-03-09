import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useWebSocket } from '../../hooks/useWebSocket';

const MAX_POINTS = 30;

interface ChartDataPoint {
  time: string;
  value: number;
  unit: string;
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0d0d14',
      border: '1px solid var(--border)',
      padding: '8px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
    }}>
      <div style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ color: 'var(--cyan)', fontWeight: 700 }}>
        {payload[0].value?.toFixed(3)} {payload[0].payload.unit}
      </div>
    </div>
  );
}

interface SensorChartProps {
  sensorId: string;
  metric: string;
  unit: string;
}

export default function SensorChart({ sensorId, metric, unit }: SensorChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);

  useWebSocket('sensor_update', (event: any) => {
    if (event.sensor_id !== sensorId || event.metric !== metric) return;
    setData(prev => [
      ...prev,
      {
        time:  new Date(event.timestamp).toLocaleTimeString(),
        value: event.value,
        unit:  event.unit,
      },
    ].slice(-MAX_POINTS));
  });

  if (data.length === 0) {
    return (
      <div style={{
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        border: '1px dashed var(--border)',
        borderRadius: '4px',
      }}>
        Waiting for data...
      </div>
    );
  }

  const avg = data.reduce((s, d) => s + d.value, 0) / data.length;

  return (
    <div style={{ height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#1e1e2e' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avg} stroke="#334155" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--cyan)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--cyan)', stroke: 'none' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
