interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  status: 'good' | 'warning' | 'critical' | 'offline';
  size?: number;
}

const statusStroke: Record<string, string> = {
  good: '#16A34A',
  warning: '#F59E0B',
  critical: '#DC2626',
  offline: '#6B7280',
};

export default function Gauge({ value, min, max, label, unit, status, size = 120 }: GaugeProps) {
  const radius = (size / 2) - 12;
  const circumference = Math.PI * radius; // half-circle
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const dashOffset = circumference * (1 - pct);
  const stroke = statusStroke[status];
  const cx = size / 2;
  const cy = size / 2 + 10;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.65} className="overflow-visible">
        {/* Track */}
        <path
          d={`M ${12} ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
          strokeLinecap="round"
          className="dark:stroke-slate-700"
        />
        {/* Fill */}
        <path
          d={`M ${12} ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Value */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="fill-slate-800 dark:fill-slate-100 font-bold"
          style={{ fontSize: size * 0.18, fontFamily: 'Inter, system-ui' }}
        >
          {status === 'offline' ? '—' : typeof value === 'number' ? value.toFixed(1) : '—'}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: size * 0.1, fontFamily: 'Inter, system-ui' }}
        >
          {unit}
        </text>
      </svg>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}
