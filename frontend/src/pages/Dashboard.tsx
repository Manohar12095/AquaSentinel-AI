import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Wifi, Activity, FlaskConical, AlertTriangle, XCircle, Zap,
  RefreshCw, MapPin, Battery, Signal, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api, formatTimeAgo, formatParameter, formatUnit } from '../lib/api';
import Gauge from '../components/Gauge';
import StatusBadge from '../components/StatusBadge';
import SourceBadge from '../components/SourceBadge';
import SimulationPanel from '../components/SimulationPanel';
import LiveModePanel from '../components/LiveModePanel';
import type { DashboardSummary, Measurement, StationStatus } from '../lib/types';

const PARAMETERS = ['ph', 'tds_ppm', 'turbidity_ntu', 'temp_c'];
const GAUGE_RANGES: Record<string, [number, number]> = {
  ph: [0, 14],
  tds_ppm: [0, 1200],
  turbidity_ntu: [0, 30],
  temp_c: [0, 50],
};

function getParamStatus(param: string, value: number): StationStatus {
  switch (param) {
    case 'ph':
      if (value < 6.0 || value > 9.0) return 'critical';
      if (value < 6.5 || value > 8.5) return 'warning';
      return 'good';
    case 'tds_ppm':
      if (value > 900) return 'critical';
      if (value > 500) return 'warning';
      return 'good';
    case 'turbidity_ntu':
      if (value > 10) return 'critical';
      if (value > 5) return 'warning';
      return 'good';
    case 'temp_c':
      if (value > 35 || value < 5) return 'critical';
      if (value > 30) return 'warning';
      return 'good';
    default:
      return 'good';
  }
}

const CHART_COLORS = {
  ph: '#0A6FB8',
  tds_ppm: '#0EA5A4',
  turbidity_ntu: '#F59E0B',
  temp_c: '#DC2626',
};

const CHART_THRESHOLDS: Record<string, { warn: number; crit: number }> = {
  ph: { warn: 8.5, crit: 9.0 },
  tds_ppm: { warn: 500, crit: 900 },
  turbidity_ntu: { warn: 5, crit: 10 },
  temp_c: { warn: 30, crit: 35 },
};

type Range = '1h' | '6h' | '24h' | '7d';

export default function Dashboard() {
  const { stations, alerts, dashboard, setDashboard } = useAppStore();
  const selectedStationId = useAppStore((s) => s.selectedStationId);
  const setSelectedStationId = useAppStore((s) => s.setSelectedStationId);

  const [chartData, setChartData] = useState<Measurement[]>([]);
  const [chartParam, setChartParam] = useState('ph');
  const [chartRange, setChartRange] = useState<Range>('1h');
  const [chartLoading, setChartLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? stations[0];

  // Fetch dashboard summary
  useEffect(() => {
    api.get<DashboardSummary>('/dashboard/summary')
      .then((r) => setDashboard(r.data))
      .catch(() => {});
  }, [setDashboard]);

  // Auto-select first station
  useEffect(() => {
    if (!selectedStationId && stations.length > 0) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId, setSelectedStationId]);

  // Fetch chart data
  const fetchChartData = useCallback(() => {
    if (!selectedStation) return;
    setChartLoading(true);
    const hours = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 }[chartRange];
    const from = new Date(Date.now() - hours * 3600000).toISOString();
    api.get<Measurement[]>(
      `/stations/${selectedStation.id}/measurements?parameter=${chartParam}&from=${from}`
    )
      .then((r) => {
        setChartData(r.data);
        setLastUpdated(Date.now());
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, [selectedStation, chartParam, chartRange]);

  useEffect(() => {
    fetchChartData();
    const id = setInterval(fetchChartData, 10000);
    return () => clearInterval(id);
  }, [fetchChartData]);

  const formattedChartData = chartData.map((m) => ({
    time: new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: m.value,
  }));

  const openAlerts = alerts.filter((a) => a.status === 'open');
  const criticalAlerts = openAlerts.filter((a) => a.severity === 'critical');

  const overallStatus: StationStatus = criticalAlerts.length > 0
    ? 'critical'
    : openAlerts.some((a) => a.severity === 'warning')
    ? 'warning'
    : 'good';

  const kpis = [
    {
      id: 'kpi-total-stations',
      label: 'Total Stations',
      value: dashboard?.total_stations ?? stations.length,
      icon: MapPin,
      color: 'text-ocean',
      bg: 'bg-ocean/10',
    },
    {
      id: 'kpi-online',
      label: 'Online',
      value: dashboard?.online_stations ?? stations.filter((s) => s.status !== 'offline').length,
      icon: Wifi,
      color: 'text-good',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      id: 'kpi-tests-today',
      label: 'Tests Today',
      value: dashboard?.tests_today ?? 0,
      icon: FlaskConical,
      color: 'text-teal',
      bg: 'bg-teal/10',
    },
    {
      id: 'kpi-warnings',
      label: 'Open Warnings',
      value: dashboard?.open_warnings ?? openAlerts.filter((a) => a.severity === 'warning').length,
      icon: AlertTriangle,
      color: 'text-warning',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      id: 'kpi-critical',
      label: 'Critical Alerts',
      value: dashboard?.open_criticals ?? criticalAlerts.length,
      icon: XCircle,
      color: 'text-critical',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      id: 'kpi-incidents',
      label: 'Active Incidents',
      value: dashboard?.open_incidents ?? 0,
      icon: Zap,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  const reading = selectedStation?.latest_readings ?? {};

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time water quality overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw size={12} className={chartLoading ? 'animate-spin' : ''} />
          Updated {formatTimeAgo(new Date(lastUpdated).toISOString())}
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`card flex items-center gap-4 border-l-4 ${
        overallStatus === 'good' ? 'border-l-good' :
        overallStatus === 'warning' ? 'border-l-warning' : 'border-l-critical'
      }`}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <StatusBadge status={overallStatus} />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Overall Network Status
            </span>
          </div>
          <p className="disclaimer mt-1">
            Monitoring status only — not a drinking-water safety certification.
          </p>
        </div>
        <Activity size={24} className="text-slate-300 flex-shrink-0" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ id, label, value, icon: Icon, color, bg }) => (
          <div key={id} id={id} className="card flex flex-col gap-2 p-4">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white animate-count-up">
              {value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Mode-specific panels */}
      <SimulationPanel />
      <LiveModePanel />

      {/* Gauges + Chart row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Gauges */}
        <div className="card xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">Live Readings</h2>
            <select
              id="station-picker"
              value={selectedStationId ?? ''}
              onChange={(e) => setSelectedStationId(Number(e.target.value))}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-navy-light text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {selectedStation ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {PARAMETERS.map((param) => {
                  const r = reading[param];
                  const val = r?.value ?? 0;
                  const status = r ? getParamStatus(param, val) : 'offline';
                  const [min, max] = GAUGE_RANGES[param];
                  return (
                    <div key={param} className="flex flex-col items-center">
                      <Gauge
                        value={val}
                        min={min}
                        max={max}
                        label={formatParameter(param)}
                        unit={formatUnit(param)}
                        status={status}
                        size={110}
                      />
                      {r && <SourceBadge source={r.source} className="mt-1" />}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {selectedStation.water_body_name}
                </span>
                <span>{formatTimeAgo(selectedStation.last_reading_at)}</span>
              </div>

              {selectedStation.status === 'offline' && (
                <div className="mt-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                  <WifiOff size={12} className="inline mr-1" />
                  No data / Offline since {formatTimeAgo(selectedStation.last_reading_at)}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              No stations available
            </div>
          )}
        </div>

        {/* Trend Chart */}
        <div className="card xl:col-span-2">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white mr-auto">Trend</h2>

            {/* Parameter tabs */}
            <div className="flex gap-1">
              {PARAMETERS.map((p) => (
                <button
                  key={p}
                  id={`chart-param-${p}`}
                  onClick={() => setChartParam(p)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    chartParam === p
                      ? 'bg-ocean text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {formatParameter(p)}
                </button>
              ))}
            </div>

            {/* Range buttons */}
            <div className="flex gap-1">
              {(['1h', '6h', '24h', '7d'] as Range[]).map((r) => (
                <button
                  key={r}
                  id={`chart-range-${r}`}
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    chartRange === r
                      ? 'bg-navy dark:bg-slate-200 text-white dark:text-navy'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {formattedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={formattedChartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.5} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(v: number) => [`${v.toFixed(2)} ${formatUnit(chartParam)}`, formatParameter(chartParam)]}
                />
                <ReferenceLine
                  y={CHART_THRESHOLDS[chartParam]?.warn}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{ value: 'Warn', position: 'right', fontSize: 10, fill: '#F59E0B' }}
                />
                <ReferenceLine
                  y={CHART_THRESHOLDS[chartParam]?.crit}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  label={{ value: 'Crit', position: 'right', fontSize: 10, fill: '#DC2626' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS[chartParam as keyof typeof CHART_COLORS] ?? '#0A6FB8'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              {chartLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  Loading data...
                </div>
              ) : (
                'No data for selected range'
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Alerts + Stations list + Sensor health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Recent Alerts */}
        <div className="card">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" /> Recent Alerts
          </h2>
          <div className="space-y-2">
            {openAlerts.slice(0, 5).length === 0 ? (
              <div className="text-slate-400 text-sm py-4 text-center">No open alerts 🎉</div>
            ) : (
              openAlerts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg border text-sm ${
                    a.severity === 'critical'
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-white">{a.station_name}</span>
                    <span className={a.severity === 'critical' ? 'badge-critical' : 'badge-warning'}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-xs">{a.message}</p>
                  <p className="text-slate-400 text-xs mt-1">{formatTimeAgo(a.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stations list */}
        <div className="card">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-ocean" /> Stations
          </h2>
          <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
            {stations.slice(0, 12).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStationId(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                  selectedStationId === s.id
                    ? 'bg-ocean/10 dark:bg-ocean/20'
                    : 'hover:bg-slate-50 dark:hover:bg-navy-light'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      s.status === 'good' ? '#16A34A' :
                      s.status === 'warning' ? '#F59E0B' :
                      s.status === 'critical' ? '#DC2626' : '#6B7280',
                  }}
                />
                <span className="flex-1 font-medium text-slate-700 dark:text-slate-200 truncate">{s.name}</span>
                <span className="text-xs text-slate-400">{formatTimeAgo(s.last_reading_at)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sensor Health */}
        <div className="card">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Activity size={16} className="text-teal" /> Sensor Health
          </h2>
          {selectedStation ? (
            <div className="space-y-3">
              {[
                { label: 'Battery', icon: Battery, value: selectedStation.latest_readings?.['battery_pct']?.value ?? null, unit: '%' },
                { label: 'Signal (RSSI)', icon: Signal, value: selectedStation.latest_readings?.['rssi']?.value ?? null, unit: 'dBm' },
              ].map(({ label, icon: Icon, value, unit }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-600 dark:text-slate-300 w-24">{label}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-ocean h-1.5 rounded-full transition-all"
                      style={{ width: value !== null ? `${Math.min(100, Math.abs(value as number))}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-16 text-right">
                    {value !== null ? `${value}${unit}` : 'N/A'}
                  </span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Station: <span className="font-semibold">{selectedStation.name}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interval: {selectedStation.reporting_interval_s}s &bull;
                  Stale after: {Math.floor(selectedStation.stale_after_s / 60)}min
                </p>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm py-4 text-center">Select a station</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Import missing icon
function WifiOff({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  );
}
