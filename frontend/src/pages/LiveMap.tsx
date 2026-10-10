import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import { X, MapPin, FlaskConical, History, ChevronRight, Radio } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatTimeAgo, formatParameter, formatUnit, statusColor } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import SourceBadge from '../components/SourceBadge';
import type { Station, WaterBodyType, StationStatus } from '../lib/types';
import { useNavigate } from 'react-router-dom';

const WATER_BODY_ICONS: Record<WaterBodyType, string> = {
  river: '🌊', lake: '🏞️', pond: '🌿', dam: '🏗️',
  tap: '🚰', borewell: '🕳️', tank: '🪣', discharge: '⚠️',
};

function FitBounds({ stations }: { stations: Station[] }) {
  const map = useMap();
  useEffect(() => {
    if (stations.length === 0) return;
    const lats = stations.map((s) => s.lat);
    const lons = stations.map((s) => s.lon);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats) - 0.5, Math.min(...lons) - 0.5],
      [Math.max(...lats) + 0.5, Math.max(...lons) + 0.5],
    ];
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [stations, map]);
  return null;
}

export default function LiveMap() {
  const { stations, dataMode } = useAppStore();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Station | null>(null);
  const [filterStatus, setFilterStatus] = useState<StationStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<WaterBodyType | 'all'>('all');
  const [searchQ, setSearchQ] = useState('');

  const filtered = stations.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterType !== 'all' && s.water_body_type !== filterType) return false;
    if (searchQ && !s.name.toLowerCase().includes(searchQ.toLowerCase()) &&
        !s.water_body_name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  // Build river chain polylines
  const polylines: Array<[number, number][]> = [];
  stations.forEach((s) => {
    if (s.downstream_station_id) {
      const ds = stations.find((x) => x.id === s.downstream_station_id);
      if (ds) polylines.push([[s.lat, s.lon], [ds.lat, ds.lon]]);
    }
  });

  const statusOptions: Array<StationStatus | 'all'> = ['all', 'good', 'warning', 'critical', 'offline'];
  const typeOptions: Array<WaterBodyType | 'all'> = ['all', 'river', 'lake', 'dam', 'tap', 'borewell'];

  return (
    <div className="flex h-full relative animate-fade-in">
      {/* Filter sidebar */}
      <div className="hidden md:flex flex-col w-56 bg-white dark:bg-navy border-r border-slate-100 dark:border-slate-700 p-4 gap-4 overflow-y-auto flex-shrink-0">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-white text-sm mb-2">Search</h2>
          <input
            id="map-search"
            type="text"
            placeholder="Station or river..."
            className="input text-xs"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Status</h3>
          <div className="space-y-1">
            {statusOptions.map((s) => (
              <button
                key={s}
                id={`filter-status-${s}`}
                onClick={() => setFilterStatus(s)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-ocean/15 text-ocean dark:text-ocean-light'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-light'
                }`}
              >
                {s === 'all' ? 'All statuses' : (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor(s) }} />
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Water Body</h3>
          <div className="space-y-1">
            {typeOptions.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t as WaterBodyType | 'all')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === t
                    ? 'bg-ocean/15 text-ocean dark:text-ocean-light'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-light'
                }`}
              >
                {t === 'all' ? 'All types' : `${WATER_BODY_ICONS[t as WaterBodyType]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Legend</h3>
          <div className="space-y-1.5 text-xs">
            {[
              { color: '#16A34A', label: 'Good' },
              { color: '#F59E0B', label: 'Warning' },
              { color: '#DC2626', label: 'Critical' },
              { color: '#6B7280', label: 'Offline / Stale' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
            <div className="text-slate-400 mt-2 text-[10px] leading-relaxed">
              Grey = station offline or reading older than stale limit.
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[11.1271, 78.6569]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FitBounds stations={filtered} />

          {/* River polylines */}
          {polylines.map((positions, i) => (
            <Polyline
              key={i}
              positions={positions}
              pathOptions={{ color: '#0A6FB8', weight: 2, opacity: 0.5, dashArray: '6 4' }}
            />
          ))}

          {/* Station markers */}
          {filtered.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lon]}
              radius={s.status === 'critical' ? 12 : 9}
              pathOptions={{
                color: statusColor(s.status),
                fillColor: statusColor(s.status),
                fillOpacity: s.status === 'offline' ? 0.3 : 0.8,
                weight: s.status === 'critical' ? 2 : 1.5,
              }}
              eventHandlers={{ click: () => setSelected(s) }}
            >
              <Popup>
                <div className="text-xs font-semibold">{s.name}</div>
                <div className="text-xs text-slate-500">{s.water_body_name}</div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Data mode indicator on map */}
        {dataMode === 'simulation' && (
          <div className="absolute top-3 right-3 z-[500] bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Radio size={12} />
            SIMULATED
          </div>
        )}
      </div>

      {/* Station side panel */}
      {selected && (
        <div className="w-72 bg-white dark:bg-navy border-l border-slate-100 dark:border-slate-700 flex flex-col overflow-y-auto flex-shrink-0 animate-slide-in">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{WATER_BODY_ICONS[selected.water_body_type]}</span>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{selected.name}</h3>
              </div>
              <div className="text-xs text-slate-500">{selected.water_body_name} · {selected.district}</div>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1">
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Last reading: {formatTimeAgo(selected.last_reading_at)}
            </div>

            {/* Readings */}
            <div className="space-y-2">
              {Object.entries(selected.latest_readings ?? {}).map(([param, reading]) => (
                <div key={param} className="flex items-center justify-between bg-slate-50 dark:bg-navy-light rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatParameter(param)}</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-white">
                      {reading.value.toFixed(2)}
                      <span className="text-xs font-normal text-slate-400 ml-1">{formatUnit(param)}</span>
                    </div>
                  </div>
                  <SourceBadge source={reading.source} />
                </div>
              ))}
              {Object.keys(selected.latest_readings ?? {}).length === 0 && (
                <div className="text-sm text-slate-400 py-4 text-center">
                  No data / Offline
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Monitoring status only — not a drinking-water safety certification.
            </p>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
            <button
              id={`btn-start-test-${selected.id}`}
              onClick={() => navigate('/laboratory')}
              className="btn-primary w-full justify-center"
            >
              <FlaskConical size={14} /> Start Test
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="btn-secondary w-full justify-center"
            >
              <History size={14} /> View History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
