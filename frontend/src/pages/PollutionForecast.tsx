import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import { Play, Pause, AlertTriangle, ChevronRight, Info, MapPin, FlaskConical, Zap } from 'lucide-react';
import { api, formatTimeAgo } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { Incident, ForecastEntry, NextBestSample } from '../lib/types';

const MOCK_RIVER_CHAIN = [
  { id: 1, name: 'Station A', km: 0 },
  { id: 2, name: 'Station B', km: 8 },
  { id: 3, name: 'Station C', km: 17 },
  { id: 4, name: 'Station D', km: 27 },
  { id: 5, name: 'Station E', km: 40 },
];

export default function PollutionForecast() {
  const { stations } = useAppStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [nextSamples, setNextSamples] = useState<NextBestSample[]>([]);
  const [sliderTime, setSliderTime] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [howCalcOpen, setHowCalcOpen] = useState(false);
  const [simOrigin, setSimOrigin] = useState(stations[0]?.id ?? 1);
  const [simType, setSimType] = useState<string>('industrial_discharge');

  useEffect(() => {
    api.get<Incident[]>('/incidents').then((r) => setIncidents(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedIncident) return;
    api.get<{ forecast: ForecastEntry[]; next_samples: NextBestSample[] }>(
      `/forecast/${selectedIncident.id}`
    ).then((r) => {
      setForecast(r.data.forecast);
      setNextSamples(r.data.next_samples);
    }).catch(() => {});
  }, [selectedIncident]);

  // Auto-play slider
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setSliderTime((t) => {
        if (t >= 100) { setPlaying(false); return 100; }
        return t + 1;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  const handleSimulate = async () => {
    try {
      const res = await api.post<Incident>('/incidents/simulate', {
        origin_station_id: simOrigin,
        type: simType,
      });
      setIncidents((prev) => [res.data, ...prev]);
      setSelectedIncident(res.data);
    } catch {}
  };

  // Generate chart data combining observed + modelled
  const generateChartData = () => {
    const now = 50; // slider midpoint
    return Array.from({ length: 100 }, (_, i) => ({
      t: i - 50,
      observed: i <= now ? Math.max(0, Math.sin((i - 20) / 15) * 120 + (Math.random() - 0.5) * 8) : undefined,
      modelled: i >= now ? Math.max(0, Math.sin((i - 20) / 15) * 120 * (1 - (i - now) * 0.01)) : undefined,
      uncertainty_hi: i >= now ? Math.max(0, Math.sin((i - 20) / 15) * 120 * (1 - (i - now) * 0.01) * 1.25) : undefined,
      uncertainty_lo: i >= now ? Math.max(0, Math.sin((i - 20) / 15) * 120 * (1 - (i - now) * 0.01) * 0.75) : undefined,
    }));
  };

  const chartData = generateChartData();
  const currentT = sliderTime - 50;

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pollution Forecast</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Time Machine & Arrival Estimation</p>
        </div>
        <button id="btn-simulate-incident" onClick={handleSimulate} className="btn-danger">
          <Zap size={14} /> Simulate Incident
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Incidents list */}
        <div className="card lg:col-span-1">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-3">Incidents</h2>
          {incidents.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              No incidents. Click "Simulate Incident" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                    selectedIncident?.id === inc.id
                      ? 'border-ocean bg-ocean/5 dark:bg-ocean/10'
                      : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-navy-light'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-critical flex-shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-white truncate">{inc.title}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{formatTimeAgo(inc.started_at)}</div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                    inc.status === 'active' ? 'badge-critical' :
                    inc.status === 'monitoring' ? 'badge-warning' : 'badge-good'
                  }`}>
                    {inc.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Simulate controls */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Simulation controls</h3>
            <select
              value={simOrigin}
              onChange={(e) => setSimOrigin(Number(e.target.value))}
              className="input text-xs"
            >
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={simType}
              onChange={(e) => setSimType(e.target.value)}
              className="input text-xs"
            >
              {['industrial_discharge', 'acidic_spill', 'sediment_turbidity_surge', 'sewage_thermal'].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main forecast area */}
        <div className="lg:col-span-2 space-y-5">
          {/* River chain diagram */}
          <div className="card">
            <h2 className="font-semibold text-slate-800 dark:text-white mb-4">River Flow Diagram</h2>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {MOCK_RIVER_CHAIN.map((st, i) => {
                const fEntry = forecast.find((f) => f.station_id === st.id);
                const isOrigin = selectedIncident?.origin_station_id === st.id;
                return (
                  <div key={st.id} className="flex items-center">
                    <div className={`flex flex-col items-center gap-1 min-w-[80px] ${isOrigin ? 'scale-110' : ''}`}>
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                          isOrigin
                            ? 'border-critical bg-critical text-white'
                            : fEntry
                            ? 'border-warning bg-amber-50 dark:bg-amber-900/20 text-warning'
                            : 'border-ocean bg-ocean/10 text-ocean'
                        }`}
                      >
                        {st.name.split(' ')[1]}
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium text-center">{st.name}</span>
                      <span className="text-[10px] text-slate-400">{st.km}km</span>
                      {fEntry && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          ~{new Date(fEntry.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {i < MOCK_RIVER_CHAIN.length - 1 && (
                      <div className="flex items-center mx-1">
                        <div className="h-0.5 w-8 bg-ocean/40" />
                        <ChevronRight size={12} className="text-ocean -ml-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Machine */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                Time Machine
                <span className="badge-simulated text-[10px]">Modelled</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((v) => !v)}
                  className={`${playing ? 'btn-secondary' : 'btn-primary'} py-1.5 px-3`}
                >
                  {playing ? <Pause size={12} /> : <Play size={12} />}
                  {playing ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>

            {/* NOW marker */}
            <div className="relative mb-2">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>-50h (Past)</span>
                <span className="font-bold text-ocean">NOW</span>
                <span>+50h (Modelled)</span>
              </div>
              <input
                id="time-slider"
                type="range"
                min={0}
                max={100}
                value={sliderTime}
                onChange={(e) => { setSliderTime(Number(e.target.value)); setPlaying(false); }}
                className="w-full accent-ocean"
              />
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [`${v?.toFixed(1)} µS/cm`, name]}
                  contentStyle={{ borderRadius: '12px', fontSize: 12 }}
                />
                {/* Uncertainty band */}
                <Area
                  type="monotone"
                  dataKey="uncertainty_hi"
                  stroke="none"
                  fill="#F59E0B"
                  fillOpacity={0.15}
                  name="Uncertainty high"
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="uncertainty_lo"
                  stroke="none"
                  fill="#F59E0B"
                  fillOpacity={0}
                  name="Uncertainty low"
                  legendType="none"
                />
                {/* Observed: solid */}
                <Line
                  type="monotone"
                  dataKey="observed"
                  stroke="#0A6FB8"
                  strokeWidth={2.5}
                  dot={false}
                  name="Observed"
                  connectNulls={false}
                />
                {/* Modelled: dashed */}
                <Line
                  type="monotone"
                  dataKey="modelled"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  name="Modelled"
                  connectNulls={false}
                />
                <ReferenceLine x={0} stroke="#0EA5A4" strokeWidth={2} label={{ value: 'NOW', position: 'top', fontSize: 10, fill: '#0EA5A4' }} />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
              <div className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-ocean inline-block" /> Observed</div>
              <div className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-warning inline-block border-t-2 border-dashed border-warning" style={{borderTop: '2px dashed #F59E0B', background: 'none'}} /> Modelled</div>
              <div className="flex items-center gap-1.5"><span className="w-4 h-3 bg-amber-200 opacity-60 inline-block rounded-sm" /> Uncertainty</div>
            </div>
          </div>

          {/* Forecast arrival windows */}
          {forecast.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800 dark:text-white">Arrival Windows</h2>
                <button onClick={() => setHowCalcOpen((v) => !v)} className="btn-ghost py-1 px-2">
                  <Info size={13} /> How is this calculated?
                </button>
              </div>

              {howCalcOpen && (
                <div className="bg-slate-50 dark:bg-navy-light rounded-xl p-4 mb-4 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold mb-2">Travel time formula:</p>
                  <p className="font-mono bg-white dark:bg-navy rounded px-3 py-2 mb-2">t = d / v</p>
                  <p>Where <code>d</code> = distance (km) and <code>v</code> = measured flow velocity (m/s, converted). Uncertainty window: ±25%, widening with distance. Dispersion: peak concentration flattens and widens downstream.</p>
                  <p className="mt-2 italic text-slate-400">
                    This is a simplified advection model. Actual arrival times depend on channel geometry, flow variability, and dispersion coefficients. Always treat as an estimate.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {forecast.map((f) => (
                  <div key={f.station_id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-navy-light rounded-xl">
                    <MapPin size={14} className="text-ocean flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-slate-800 dark:text-white">{f.station_name}</div>
                      <div className="text-xs text-slate-400">{f.distance_km.toFixed(1)} km downstream</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800 dark:text-white">
                        {new Date(f.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-slate-400">
                        ±{Math.round((new Date(f.arrival_window[1]).getTime() - new Date(f.arrival_time).getTime()) / 60000)}min
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      f.confidence === 'high' ? 'badge-good' :
                      f.confidence === 'medium' ? 'badge-warning' : 'badge-offline'
                    }`}>
                      {f.confidence}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 italic mt-3">
                Arrival windows are modelled estimates, not verified measurements. Labelled <strong>Modelled</strong>.
              </p>
            </div>
          )}

          {/* Next best sample */}
          {nextSamples.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <FlaskConical size={16} className="text-teal" /> Next-Best-Sample Recommender
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Ranked by expected information gain over competing hypotheses.
              </p>
              <div className="space-y-3">
                {nextSamples.map((s, i) => (
                  <div key={s.station_id} className="flex items-start gap-3 p-3 bg-teal/5 dark:bg-teal/10 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-teal text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-800 dark:text-white">{s.station_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.reason}</div>
                      <div className="text-xs text-teal dark:text-teal-light font-medium mt-1">Test: {s.recommended_test}</div>
                    </div>
                    <div className="ml-auto text-xs font-semibold text-teal">
                      {(s.score * 100).toFixed(0)}% IG
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
