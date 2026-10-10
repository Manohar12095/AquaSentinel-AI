// Core types for AquaSentinel AI

export type DataMode = 'simulation' | 'live';
export type Source = 'live' | 'simulated' | 'lab';
export type QualityFlag = 'ok' | 'suspect' | 'bad';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertKind = 'anomaly' | 'verified_incident';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type StationStatus = 'good' | 'warning' | 'critical' | 'offline';
export type WaterBodyType = 'river' | 'lake' | 'pond' | 'dam' | 'tap' | 'borewell' | 'tank' | 'discharge';
export type UserRole = 'family' | 'researcher' | 'operator' | 'admin';
export type IdentificationStatus = 'Confirmed' | 'Presumptive' | 'Suspected' | 'Not tested';
export type DeviceType = 'home' | 'commercial';
export type TestStatus = 'running' | 'completed' | 'failed';
export type BlogPostStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface Station {
  id: number;
  name: string;
  water_body_type: WaterBodyType;
  water_body_name: string;
  lat: number;
  lon: number;
  district: string;
  state: string;
  country: string;
  upstream_station_id: number | null;
  downstream_station_id: number | null;
  reach_distance_km_to_downstream: number | null;
  reporting_interval_s: number;
  stale_after_s: number;
  status: StationStatus;
  last_reading_at: string | null;
  latest_readings: Record<string, ParameterReading>;
}

export interface ParameterReading {
  value: number;
  unit: string;
  ts: string;
  source: Source;
  quality_flag: QualityFlag;
  status: StationStatus;
}

export interface Measurement {
  id: number;
  station_id: number;
  device_id: number | null;
  ts: string;
  parameter: string;
  value: number;
  unit: string;
  quality_flag: QualityFlag;
  source: Source;
}

export interface Alert {
  id: number;
  station_id: number;
  station_name: string;
  parameter: string;
  severity: AlertSeverity;
  kind: AlertKind;
  message: string;
  recommended_action: string;
  status: AlertStatus;
  created_at: string;
  acknowledged_by: string | null;
  evidence: {
    value: number;
    unit: string;
    threshold: number;
    timestamp: string;
  };
}

export interface Device {
  id: number;
  device_uid: string;
  type: DeviceType;
  model: string;
  firmware_version: string;
  owner_id: number;
  station_id: number | null;
  battery_pct: number | null;
  rssi: number | null;
  last_seen_at: string | null;
  status: 'online' | 'offline' | 'stale';
  api_key?: string; // only shown once at pairing
}

export interface Chemical {
  id: number;
  name: string;
  formula: string;
  cas_number: string;
  pubchem_cid: number | null;
  molar_mass: number;
  hazards: string[];
  reference_limits: ReferenceLimitEntry[];
  reactions: string[];
  references: string[];
  last_reviewed: string;
}

export interface ReferenceLimitEntry {
  use: string;
  value: number;
  unit: string;
  source: string;
}

export interface ChemicalResult {
  id: number;
  chemical_id: number;
  chemical_name: string;
  station_id: number | null;
  test_id: number | null;
  concentration: number;
  unit: string;
  method: string;
  detection_limit: number;
  identification_status: IdentificationStatus;
  evidence: Record<string, unknown>;
  lab_report_url: string | null;
  ts: string;
}

export interface Test {
  id: number;
  test_uid: string;
  station_id: number;
  device_id: number | null;
  sample_source: string;
  method: string;
  status: TestStatus;
  source: Source;
  started_at: string;
  finished_at: string | null;
  readings: Measurement[];
  chemical_results: ChemicalResult[];
  notes: string;
}

export interface Incident {
  id: number;
  title: string;
  origin_station_id: number;
  started_at: string;
  status: 'active' | 'monitoring' | 'resolved';
  hypotheses: Hypothesis[];
  forecast: ForecastEntry[];
  outcome: string | null;
}

export interface Hypothesis {
  station_id: number;
  station_name: string;
  score: number;
  reasoning: string;
}

export interface ForecastEntry {
  station_id: number;
  station_name: string;
  distance_km: number;
  arrival_time: string;
  arrival_window: [string, string];
  peak_concentration: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface BlogPost {
  id: number;
  author_id: number;
  author_name: string;
  title: string;
  body_md: string;
  tags: string[];
  references: string[];
  status: BlogPostStatus;
  moderation_note: string | null;
  created_at: string;
  station_id: number | null;
  incident_id: number | null;
}

export interface DashboardSummary {
  total_stations: number;
  online_stations: number;
  offline_stations: number;
  tests_today: number;
  open_warnings: number;
  open_criticals: number;
  open_incidents: number;
  trend_ph: number | null;
  trend_tds: number | null;
  trend_turbidity: number | null;
  trend_temp: number | null;
}

export interface SSEEvent {
  type: 'reading' | 'station_status' | 'alert' | 'incident' | 'test_progress';
  data: unknown;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AlertRule {
  id: number;
  scope: 'station' | 'global';
  parameter: string;
  operator: string;
  warn_value: number;
  crit_value: number;
  min_duration_s: number;
  enabled: boolean;
  rationale: string;
}

export interface SensorHealth {
  station_id: number;
  parameter: string;
  health_score: number;
  issues: string[];
  last_calibration: string | null;
  battery_pct: number | null;
  rssi: number | null;
}

export interface NextBestSample {
  station_id: number;
  station_name: string;
  lat: number;
  lon: number;
  score: number;
  reason: string;
  recommended_test: string;
}
