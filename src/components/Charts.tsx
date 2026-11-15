// Recharts is the largest dependency in the app, so charts live in their own lazily loaded chunk.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactNumber, formatNumber } from '../services/format';

export interface ChartPoint {
  year: number;
  value: number;
}

export function TrendChart({ data, unit, label }: { data: ChartPoint[]; unit?: string; label?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#dde5dc" vertical={false} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} stroke="#667085" />
        <YAxis
          tickLine={false}
          axisLine={false}
          stroke="#667085"
          tickFormatter={(value) => compactNumber(Number(value))}
          width={56}
        />
        <Tooltip
          formatter={(value) => [formatNumber(Number(value), unit), label]}
          labelFormatter={(year) => `Year ${year}`}
          contentStyle={{ borderRadius: 8, border: '1px solid #d5ded7' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0f7a4f"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, color }: { data: ChartPoint[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={92}>
      <LineChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <XAxis hide dataKey="year" />
      </LineChart>
    </ResponsiveContainer>
  );
}
