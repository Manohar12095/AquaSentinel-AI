// Demo/fallback data for when the backend is not available (e.g. Vercel-only deployment)
import type { Station, Alert, DashboardSummary, User } from './types';

export const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@aquasentinel.local': {
    password: 'admin123',
    user: { id: 1, name: 'Admin User', email: 'admin@aquasentinel.local', role: 'admin' },
  },
  'family@aquasentinel.local': {
    password: 'family123',
    user: { id: 2, name: 'Test Family', email: 'family@aquasentinel.local', role: 'family' },
  },
};

function randomReading(param: string, source: 'simulated' = 'simulated') {
  const ranges: Record<string, [number, number, string]> = {
    ph: [6.5, 8.5, 'pH'],
    tds_ppm: [150, 600, 'ppm'],
    turbidity_ntu: [0.5, 8, 'NTU'],
    temp_c: [22, 32, '°C'],
  };
  const [lo, hi, unit] = ranges[param] ?? [0, 100, ''];
  const value = +(lo + Math.random() * (hi - lo)).toFixed(2);
  return {
    value,
    unit,
    ts: new Date().toISOString(),
    source,
    quality_flag: 'ok' as const,
    status: 'good' as const,
  };
}

export const DEMO_STATIONS: Station[] = [
  { id: 1, name: 'Mettur Dam', water_body_type: 'dam', water_body_name: 'Cauvery', lat: 11.8, lon: 77.8, district: 'Salem', state: 'Tamil Nadu', country: 'India', upstream_station_id: null, downstream_station_id: 2, reach_distance_km_to_downstream: 80, reporting_interval_s: 30, stale_after_s: 300, status: 'good', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
  { id: 2, name: 'Erode Checkpoint', water_body_type: 'river', water_body_name: 'Cauvery', lat: 11.35, lon: 77.73, district: 'Erode', state: 'Tamil Nadu', country: 'India', upstream_station_id: 1, downstream_station_id: 3, reach_distance_km_to_downstream: 120, reporting_interval_s: 30, stale_after_s: 300, status: 'good', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
  { id: 3, name: 'Trichy Grand Anicut', water_body_type: 'river', water_body_name: 'Cauvery', lat: 10.82, lon: 78.7, district: 'Trichy', state: 'Tamil Nadu', country: 'India', upstream_station_id: 2, downstream_station_id: 4, reach_distance_km_to_downstream: 150, reporting_interval_s: 30, stale_after_s: 300, status: 'warning', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
  { id: 4, name: 'Poompuhar Estuary', water_body_type: 'river', water_body_name: 'Cauvery', lat: 11.14, lon: 79.85, district: 'Mayiladuthurai', state: 'Tamil Nadu', country: 'India', upstream_station_id: 3, downstream_station_id: null, reach_distance_km_to_downstream: null, reporting_interval_s: 30, stale_after_s: 300, status: 'good', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
  { id: 5, name: 'Vaigai Dam', water_body_type: 'dam', water_body_name: 'Vaigai', lat: 10.05, lon: 77.58, district: 'Theni', state: 'Tamil Nadu', country: 'India', upstream_station_id: null, downstream_station_id: 6, reach_distance_km_to_downstream: 60, reporting_interval_s: 30, stale_after_s: 300, status: 'good', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
  { id: 6, name: 'Madurai City', water_body_type: 'river', water_body_name: 'Vaigai', lat: 9.93, lon: 78.12, district: 'Madurai', state: 'Tamil Nadu', country: 'India', upstream_station_id: 5, downstream_station_id: null, reach_distance_km_to_downstream: null, reporting_interval_s: 30, stale_after_s: 300, status: 'good', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
  { id: 7, name: 'Chembarambakkam', water_body_type: 'lake', water_body_name: 'Chembarambakkam Lake', lat: 13.01, lon: 80.05, district: 'Chennai', state: 'Tamil Nadu', country: 'India', upstream_station_id: null, downstream_station_id: null, reach_distance_km_to_downstream: null, reporting_interval_s: 30, stale_after_s: 300, status: 'good', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
  { id: 8, name: 'Ooty Lake', water_body_type: 'lake', water_body_name: 'Ooty Lake', lat: 11.4, lon: 76.68, district: 'Nilgiris', state: 'Tamil Nadu', country: 'India', upstream_station_id: null, downstream_station_id: null, reach_distance_km_to_downstream: null, reporting_interval_s: 30, stale_after_s: 300, status: 'critical', last_reading_at: new Date().toISOString(), latest_readings: { ph: randomReading('ph'), tds_ppm: randomReading('tds_ppm'), turbidity_ntu: randomReading('turbidity_ntu'), temp_c: randomReading('temp_c') } },
];

export const DEMO_ALERTS: Alert[] = [
  { id: 1, station_id: 3, station_name: 'Trichy Grand Anicut', parameter: 'turbidity_ntu', severity: 'warning', kind: 'anomaly', message: 'Turbidity elevated to 7.2 NTU — possible sediment runoff', recommended_action: 'Monitor for 30 min; if sustained, collect grab sample', status: 'open', created_at: new Date(Date.now() - 600_000).toISOString(), acknowledged_by: null, evidence: { value: 7.2, unit: 'NTU', threshold: 5, timestamp: new Date(Date.now() - 600_000).toISOString() } },
  { id: 2, station_id: 8, station_name: 'Ooty Lake', parameter: 'ph', severity: 'critical', kind: 'anomaly', message: 'pH dropped to 5.8 — below safe range', recommended_action: 'Investigate upstream discharge; consider sampling', status: 'open', created_at: new Date(Date.now() - 1_800_000).toISOString(), acknowledged_by: null, evidence: { value: 5.8, unit: 'pH', threshold: 6.5, timestamp: new Date(Date.now() - 1_800_000).toISOString() } },
];

export const DEMO_DASHBOARD: DashboardSummary = {
  total_stations: 8,
  online_stations: 7,
  offline_stations: 1,
  tests_today: 3,
  open_warnings: 1,
  open_criticals: 1,
  open_incidents: 0,
  trend_ph: -0.1,
  trend_tds: 12,
  trend_turbidity: 0.3,
  trend_temp: 0.5,
};

export const DEMO_TOKEN = 'demo-offline-token';
