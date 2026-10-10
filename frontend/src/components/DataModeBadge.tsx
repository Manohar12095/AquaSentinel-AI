import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { formatParameter, formatUnit } from '../lib/api';

const PARAMS = ['ph', 'tds_ppm', 'turbidity_ntu', 'temp_c'];
const PARAM_ICONS: Record<string, string> = {
  ph: '🌊',
  tds_ppm: '💧',
  turbidity_ntu: '☁️',
  temp_c: '🌡️',
};

export default function DataModeBadge() {
  const dataMode = useAppStore((s) => s.dataMode);
  const stations = useAppStore((s) => s.stations);
  const selectedStationId = useAppStore((s) => s.selectedStationId);
  const [tick, setTick] = useState(0);
  const [flash, setFlash] = useState(false);

  // Pulse flash on new readings
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [stations]);

  // Cycle through parameters every 2s for the ticker
  useEffect(() => {
    const id = setInterval(() => setTick((n) => (n + 1) % PARAMS.length), 2000);
    return () => clearInterval(id);
  }, []);

  const station = stations.find((s) => s.id === selectedStationId) ?? stations[0];
  const readings = station?.latest_readings ?? {};

  if (dataMode === 'simulation') {
    // Build ticker items from live store values
    const items = PARAMS.map((p) => {
      const r = readings[p];
      return r
        ? `${PARAM_ICONS[p]} ${formatParameter(p)} ${r.value.toFixed(2)} ${formatUnit(p)}`
        : null;
    }).filter(Boolean);

    const activeItem = items[tick % items.length];

    return (
      <div className="flex items-center bg-purple-600 text-white text-xs font-semibold py-1.5 px-4 gap-3 z-40 relative overflow-hidden">
        {/* Pulse dot */}
        <span className="flex items-center gap-1 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
          SIMULATED DATA
        </span>

        <span className="text-purple-300 flex-shrink-0">|</span>

        {/* Animated ticker */}
        <span
          key={tick}
          className={`transition-all duration-500 tabular-nums ${flash ? 'text-white scale-105' : 'text-purple-100'}`}
          style={{ animation: 'fadeSlideIn 0.4s ease' }}
        >
          {activeItem ?? 'Waiting for data…'}
        </span>

        <span className="text-purple-300 hidden sm:inline flex-shrink-0">|</span>

        <span className="text-purple-200 hidden sm:inline truncate">
          Demo mode — all features active with generated sensor values
        </span>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  if (dataMode === 'live') {
    // Check if any device reported recently
    const lastAt = station?.last_reading_at;
    const stale = !lastAt || (Date.now() - new Date(lastAt).getTime()) > 60000;

    return (
      <div className={`flex items-center text-white text-xs font-semibold py-1.5 px-4 gap-3 z-40 relative ${
        stale ? 'bg-amber-500' : 'bg-green-600'
      }`}>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full bg-white inline-block ${stale ? '' : 'animate-pulse'}`} />
          {stale ? 'LIVE — Waiting for device…' : '🟢 LIVE IoT DATA'}
        </span>
        {!stale && station && (
          <>
            <span className="text-green-200 flex-shrink-0">|</span>
            <span className="tabular-nums text-green-100 hidden sm:inline">
              {PARAMS.map((p) => {
                const r = readings[p];
                return r ? `${PARAM_ICONS[p]} ${r.value.toFixed(2)} ${formatUnit(p)}` : null;
              }).filter(Boolean).join('  ·  ')}
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
}
