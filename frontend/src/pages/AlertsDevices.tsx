import { useState, useEffect } from 'react';
import {
  Bell, CheckCircle, XCircle, AlertTriangle, Eye, Settings,
  Key, Copy, Wifi, Battery, Signal, Cpu, Plus, Trash2
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api, formatTimeAgo } from '../lib/api';
import type { Alert, AlertRule, Device } from '../lib/types';

export default function AlertsDevices() {
  const { alerts, updateAlert, setAlerts, user } = useAppStore();
  const [tab, setTab] = useState<'alerts' | 'rules' | 'devices'>('alerts');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<AlertRule[]>('/alert-rules').then((r) => setRules(r.data)).catch(() => {});
    api.get<Device[]>('/devices').then((r) => setDevices(r.data)).catch(() => {});
  }, []);

  const handleAck = async (id: number) => {
    await api.post(`/alerts/${id}/ack`);
    updateAlert(id, { status: 'acknowledged', acknowledged_by: user?.name ?? 'Unknown' });
  };

  const handleResolve = async (id: number) => {
    await api.post(`/alerts/${id}/resolve`);
    updateAlert(id, { status: 'resolved' });
  };

  const handleGenerateKey = async (deviceId: number) => {
    try {
      const res = await api.post(`/devices/${deviceId}/generate-key`);
      setNewApiKey(res.data.api_key);
    } catch {}
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'operator';

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Devices & Alerts</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
        {([
          { key: 'alerts', label: 'Alerts Inbox', icon: Bell },
          { key: 'rules', label: 'Alert Rules', icon: Settings },
          { key: 'devices', label: 'Devices', icon: Cpu },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            id={`tab-${key}`}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white dark:bg-navy shadow text-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={14} />
            {label}
            {key === 'alerts' && alerts.filter((a) => a.status === 'open').length > 0 && (
              <span className="badge-critical text-[10px] px-1.5 py-0.5">
                {alerts.filter((a) => a.status === 'open').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts Inbox */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['all', 'critical', 'warning', 'info'] as const).map((s) => (
                <button
                  key={s}
                  id={`filter-severity-${s}`}
                  onClick={() => setFilterSeverity(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filterSeverity === s
                      ? 'bg-ocean text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="card flex flex-col items-center py-10 gap-2 text-slate-400">
                <Bell size={32} strokeWidth={1} />
                <p className="text-sm">No alerts</p>
              </div>
            ) : (
              filteredAlerts.map((a) => (
                <div
                  key={a.id}
                  id={`alert-${a.id}`}
                  className={`card border-l-4 ${
                    a.severity === 'critical' ? 'border-l-critical' :
                    a.severity === 'warning' ? 'border-l-warning' : 'border-l-ocean'
                  } ${a.status !== 'open' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={
                          a.severity === 'critical' ? 'badge-critical' :
                          a.severity === 'warning' ? 'badge-warning' : 'badge-offline'
                        }>
                          {a.severity}
                        </span>
                        <span className={a.kind === 'verified_incident' ? 'badge-critical' : 'badge-offline'}>
                          {a.kind === 'verified_incident' ? 'Verified Incident' : 'Automatic Anomaly'}
                        </span>
                        <span className={
                          a.status === 'open' ? 'badge-warning' :
                          a.status === 'acknowledged' ? 'badge-offline' : 'badge-good'
                        }>
                          {a.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{a.station_name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{a.message}</p>

                      {/* Evidence */}
                      <div className="mt-2 bg-slate-50 dark:bg-navy-light rounded-lg px-3 py-2 text-xs">
                        <span className="text-slate-500">Evidence: </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-white">
                          {a.parameter} = {a.evidence?.value} (threshold: {a.evidence?.threshold})
                        </span>
                        <span className="text-slate-400 ml-2">@ {formatTimeAgo(a.evidence?.timestamp?.toString())}</span>
                      </div>

                      <div className="mt-2 text-xs text-ocean dark:text-ocean-light font-medium">
                        💡 {a.recommended_action}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {a.status === 'open' && (
                        <button
                          id={`btn-ack-${a.id}`}
                          onClick={() => handleAck(a.id)}
                          className="btn-ghost py-1 px-2 text-xs"
                        >
                          <Eye size={12} /> Ack
                        </button>
                      )}
                      {a.status !== 'resolved' && isAdmin && (
                        <button
                          id={`btn-resolve-${a.id}`}
                          onClick={() => handleResolve(a.id)}
                          className="btn-secondary py-1 px-2 text-xs"
                        >
                          <CheckCircle size={12} /> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Alert Rules */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="card flex items-start gap-4">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${r.enabled ? 'bg-good' : 'bg-offline'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-white text-sm">{r.parameter}</span>
                    <span className="badge-offline text-xs">{r.scope}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Warn: {r.warn_value} · Critical: {r.crit_value} · Min duration: {r.min_duration_s}s
                  </div>
                  <p className="text-xs text-slate-400 mt-1 italic">{r.rationale}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={async () => {
                          await api.put(`/alert-rules/${r.id}`, { enabled: !r.enabled });
                          setRules((prev) => prev.map((x) => x.id === r.id ? { ...x, enabled: !x.enabled } : x));
                        }}
                        className="accent-ocean"
                      />
                      <span className="text-xs text-slate-500">{r.enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devices */}
      {tab === 'devices' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end mb-2">
              <button
                onClick={async () => {
                  const uid = prompt("Enter new Device UID (e.g. AQS-ESP32-SIM-001):");
                  if (!uid) return;
                  try {
                    const res = await api.post('/devices', {
                      device_uid: uid,
                      type: 'edge_node',
                      model: 'ESP32',
                      firmware_version: '1.0.0-sim'
                    });
                    setDevices((prev) => [...prev, res.data]);
                  } catch (e) {
                    alert("Failed to add device");
                  }
                }}
                className="btn-primary py-1.5 px-3 text-sm"
              >
                <Plus size={14} /> Add Device
              </button>
            </div>
          )}

          {newApiKey && (
            <div className="card border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <Key size={14} className="text-good" /> API Key Generated — Save this now!
              </h3>
              <p className="text-xs text-slate-500 mb-2">This key will only be shown once.</p>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-navy-light rounded-lg px-3 py-2">
                <code className="flex-1 text-sm font-mono text-slate-800 dark:text-white break-all">{newApiKey}</code>
                <button onClick={() => handleCopy(newApiKey)} className="btn-ghost py-1 px-2">
                  <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="mt-3 p-3 bg-slate-50 dark:bg-navy-light rounded-lg">
                <p className="text-xs text-slate-500 mb-1 font-semibold">Example cURL command:</p>
                <code className="text-xs text-slate-700 dark:text-slate-200 block whitespace-pre-wrap">
{`curl -X POST http://localhost:8000/api/ingest \\
  -H "X-API-Key: ${newApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"device_uid":"AQS-HOME-0001","station_id":1,"readings":[...]}'`}
                </code>
              </div>
              <button onClick={() => setNewApiKey(null)} className="btn-secondary mt-3">Dismiss</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.map((d) => (
              <div key={d.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white text-sm">{d.device_uid}</div>
                    <div className="text-xs text-slate-400 capitalize">{d.type} · {d.model}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    d.status === 'online' ? 'badge-good' :
                    d.status === 'stale' ? 'badge-warning' : 'badge-offline'
                  }`}>
                    {d.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    { icon: Battery, label: 'Battery', value: d.battery_pct !== null ? `${d.battery_pct}%` : 'N/A' },
                    { icon: Signal, label: 'Signal (RSSI)', value: d.rssi !== null ? `${d.rssi} dBm` : 'N/A' },
                    { icon: Cpu, label: 'Firmware', value: d.firmware_version },
                    { icon: Wifi, label: 'Last seen', value: formatTimeAgo(d.last_seen_at) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Icon size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="w-24 text-slate-500">{label}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {isAdmin && (
                  <button
                    id={`btn-gen-key-${d.id}`}
                    onClick={() => handleGenerateKey(d.id)}
                    className="btn-ghost w-full justify-center py-1.5 text-xs"
                  >
                    <Key size={11} /> Generate API Key
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
