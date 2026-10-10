import axios from 'axios';
import { useAppStore } from '../store/appStore';

// Create axios instance – requests go through Vite proxy to localhost:8000
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper: format parameter name for display
export function formatParameter(param: string): string {
  const map: Record<string, string> = {
    ph: 'pH',
    tds_ppm: 'TDS',
    ec_us_cm: 'Conductivity',
    turbidity_ntu: 'Turbidity',
    temp_c: 'Temperature',
    water_level_m: 'Water Level',
    flow_ms: 'Flow Rate',
  };
  return map[param] ?? param;
}

export function formatUnit(param: string): string {
  const map: Record<string, string> = {
    ph: 'pH',
    tds_ppm: 'ppm',
    ec_us_cm: 'µS/cm',
    turbidity_ntu: 'NTU',
    temp_c: '°C',
    water_level_m: 'm',
    flow_ms: 'm/s',
  };
  return map[param] ?? '';
}

export function formatTimeAgo(ts: string | null): string {
  if (!ts) return 'Never';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'good': return '#16A34A';
    case 'warning': return '#F59E0B';
    case 'critical': return '#DC2626';
    case 'offline': return '#6B7280';
    default: return '#6B7280';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'good': return 'Good';
    case 'warning': return 'Warning';
    case 'critical': return 'Critical';
    case 'offline': return 'Offline / Stale';
    default: return 'Unknown';
  }
}
