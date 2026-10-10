import { useEffect, useRef, useState } from 'react';
import { Radio, Cpu, Zap } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api, formatParameter, formatUnit } from '../lib/api';

const PARAMS = ['ph', 'tds_ppm', 'turbidity_ntu', 'temp_c'];
const PARAM_ICONS: Record<string, string> = {
  ph: '🌊',
  tds_ppm: '💧',
  turbidity_ntu: '☁️',
  temp_c: '🌡️',
};

interface FeedEntry {
  ts: string;
  param: string;
  value: number;
  unit: string;
  stationName: string;
}

export default function SimulationPanel() {
  const { stations, selectedStationId, dataMode } = useAppStore();
  const [speed, setSpeed] = useState(5);
  const [feedLog, setFeedLog] = useState<FeedEntry[]>([]);
  const [newEntryIdx, setNewEntryIdx] = useState(-1);
  const prevReadingsRef = useRef<Record<string, number>>({});

  // Track reading changes and append to log
  useEffect(() => {
    if (dataMode !== 'simulation') return;
    const station = stations.find((s) => s.id === selectedStationId) ?? stations[0];
    if (!station?.latest_readings) return;

    const entries: FeedEntry[] = [];
    PARAMS.forEach((param) => {
      const r = station.latest_readings[param];
      if (!r) return;
      const prev = prevReadingsRef.current[param];
      if (prev === undefined || Math.abs(r.value - prev) > 0.001) {
        entries.push({
          ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          param,
          value: r.value,
          unit: r.unit,
          stationName: station.name,
        });
        prevReadingsRef.current[param] = r.value;
      }
    });

    if (entries.length > 0) {
      setFeedLog((prev) => [...entries, ...prev].slice(0, 12));
      setNewEntryIdx(entries.length - 1);
      const t = setTimeout(() => setNewEntryIdx(-1), 1200);
      return () => clearTimeout(t);
    }
  }, [stations, selectedStationId, dataMode]);

  const handleSpeedChange = async (s: number) => {
    setSpeed(s);
    try {
      await api.post('/simulator/speed', { interval_s: s });
    } catch {/* best-effort */}
  };

  if (dataMode !== 'simulation') return null;

  return (
    <div className="card border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-900/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40">
            <Radio size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <div>
            <span className="font-semibold text-sm text-purple-800 dark:text-purple-300">Auto-Demo Running</span>
            <span className="ml-2 text-xs text-purple-500 dark:text-purple-400">
              Fake sensor values are auto-generated to demonstrate all features
            </span>
          </div>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-purple-500" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Speed:</span>
          <div className="flex gap-0.5 bg-purple-100 dark:bg-purple-900/40 rounded-full p-0.5">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                id={`sim-speed-${s}s`}
                onClick={() => handleSpeedChange(s)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                  speed === s
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live feed log */}
      <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
        {feedLog.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-purple-400 py-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Waiting for first simulation tick…
          </div>
        ) : (
          feedLog.map((entry, i) => (
            <div
              key={`${entry.ts}-${entry.param}-${i}`}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-all duration-500 ${
                i < newEntryIdx + 1 && i <= newEntryIdx
                  ? 'bg-purple-200/80 dark:bg-purple-700/40 scale-[1.01]'
                  : 'bg-white/60 dark:bg-navy/40'
              }`}
            >
              <span className="text-slate-400 font-mono w-20 flex-shrink-0">{entry.ts}</span>
              <span className="text-slate-500 dark:text-slate-400 flex-shrink-0 w-4">{PARAM_ICONS[entry.param]}</span>
              <span className="font-medium text-slate-600 dark:text-slate-300 w-24 flex-shrink-0">
                {formatParameter(entry.param)}
              </span>
              <span className="font-bold text-purple-700 dark:text-purple-300 tabular-nums">
                {entry.value.toFixed(2)}
              </span>
              <span className="text-slate-400">{entry.unit}</span>
              <span className="ml-auto text-slate-400 truncate max-w-[120px]">{entry.stationName}</span>
            </div>
          ))
        )}
      </div>

      <p className="mt-2 text-[10px] text-purple-400 dark:text-purple-500 flex items-center gap-1">
        <Cpu size={9} />
        All alerts, charts, forecasts, and reports on every page reflect these simulated values in real-time.
      </p>
    </div>
  );
}
