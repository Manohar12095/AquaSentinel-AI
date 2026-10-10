import { useState, useEffect, useCallback } from 'react';
import {
  Wifi, Cpu, Key, Copy, CheckCircle, ChevronRight,
  Plug, RefreshCw, Circle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api, formatTimeAgo } from '../lib/api';
import type { Device } from '../lib/types';

type Step = 1 | 2 | 3 | 4 | 5;

const CODE_SNIPPETS = {
  curl: (deviceUid: string, apiKey: string, stationId: number) =>
    `curl -X POST http://localhost:8000/api/ingest \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_uid": "${deviceUid}",
    "station_id": ${stationId},
    "ts": "2026-01-01T00:00:00Z",
    "readings": [
      {"parameter": "ph", "value": 7.2, "unit": "pH"},
      {"parameter": "tds_ppm", "value": 150, "unit": "ppm"},
      {"parameter": "turbidity_ntu", "value": 1.5, "unit": "NTU"},
      {"parameter": "temp_c", "value": 23.0, "unit": "°C"}
    ]
  }'`,

  arduino: (deviceUid: string, apiKey: string, stationId: number) =>
    `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* API_URL = "http://<YOUR_PC_IP>:8000/api/ingest";
const char* API_KEY = "${apiKey}";

void sendReading(float ph, float tds, float turbidity, float temp) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  StaticJsonDocument<256> doc;
  doc["device_uid"] = "${deviceUid}";
  doc["station_id"] = ${stationId};
  doc["ts"] = "2026-01-01T00:00:00Z"; // use NTP time

  JsonArray readings = doc.createNestedArray("readings");
  auto addR = [&](const char* p, float v, const char* u) {
    auto r = readings.createNestedObject();
    r["parameter"] = p; r["value"] = v; r["unit"] = u;
  };
  addR("ph", ph, "pH");
  addR("tds_ppm", tds, "ppm");
  addR("turbidity_ntu", turbidity, "NTU");
  addR("temp_c", temp, "°C");

  String body; serializeJson(doc, body);
  int code = http.POST(body);
  Serial.printf("POST %d\\n", code);
  http.end();
}`,

  python: (deviceUid: string, apiKey: string, stationId: number) =>
    `import requests, datetime

API_URL = "http://localhost:8000/api/ingest"
API_KEY = "${apiKey}"

def send_reading(ph, tds, turbidity, temp):
    resp = requests.post(API_URL,
        headers={"X-API-Key": API_KEY},
        json={
            "device_uid": "${deviceUid}",
            "station_id": ${stationId},
            "ts": datetime.datetime.utcnow().isoformat() + "Z",
            "readings": [
                {"parameter": "ph", "value": ph, "unit": "pH"},
                {"parameter": "tds_ppm", "value": tds, "unit": "ppm"},
                {"parameter": "turbidity_ntu", "value": turbidity, "unit": "NTU"},
                {"parameter": "temp_c", "value": temp, "unit": "°C"},
            ],
        },
    )
    print(resp.status_code, resp.json())

# Example
send_reading(ph=7.2, tds=150, turbidity=1.5, temp=23.0)`,
};

export default function LiveModePanel() {
  const { stations, dataMode, user } = useAppStore();
  const [step, setStep] = useState<Step>(1);
  const [selectedStationId, setSelectedStationId] = useState<number | ''>('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [newUid, setNewUid] = useState('');
  const [codeTab, setCodeTab] = useState<'curl' | 'arduino' | 'python'>('curl');
  const [copied, setCopied] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<Device | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    if (stations.length > 0 && selectedStationId === '') {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const r = await api.get<Device[]>('/devices');
      setDevices(r.data);
    } catch {}
    finally { setLoadingDevices(false); }
  }, []);

  useEffect(() => {
    if (step >= 2) loadDevices();
  }, [step, loadDevices]);

  // Ping selected device every 5s when on step 5
  useEffect(() => {
    if (step !== 5 || !selectedDevice) return;
    const poll = async () => {
      try {
        const r = await api.get<Device>(`/devices/${selectedDevice.id}`);
        setDeviceStatus(r.data);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [step, selectedDevice]);

  const handleAddDevice = async () => {
    if (!newUid.trim()) return;
    setAddingDevice(true);
    try {
      const r = await api.post<Device>('/devices', {
        device_uid: newUid.trim(),
        type: 'home',
        model: 'ESP32',
        firmware_version: '1.0.0',
      });
      setDevices((prev) => [...prev, r.data]);
      setSelectedDevice(r.data);
      setNewUid('');
    } catch { alert('Failed to add device. Check device UID.'); }
    finally { setAddingDevice(false); }
  };

  const handleGenerateKey = async () => {
    if (!selectedDevice) return;
    setGeneratingKey(true);
    try {
      const r = await api.post<{ api_key: string }>(`/devices/${selectedDevice.id}/generate-key`);
      setApiKey(r.data.api_key);
    } catch { alert('Failed to generate key.'); }
    finally { setGeneratingKey(false); }
  };

  const copyCode = () => {
    const snippet = getSnippet();
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSnippet = () => {
    const uid = selectedDevice?.device_uid ?? 'AQS-DEVICE-001';
    const key = apiKey || '<YOUR_API_KEY>';
    const sid = Number(selectedStationId) || 1;
    return CODE_SNIPPETS[codeTab](uid, key, sid);
  };

  const connectionStatus = () => {
    if (!deviceStatus?.last_seen_at) return 'never';
    const secsAgo = (Date.now() - new Date(deviceStatus.last_seen_at).getTime()) / 1000;
    if (secsAgo < 30) return 'online';
    if (secsAgo < 120) return 'stale';
    return 'offline';
  };

  if (dataMode !== 'live') return null;

  const stepDone = (s: Step) => step > s;

  return (
    <div className="card border border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <Plug size={14} className="text-green-600 dark:text-green-400" />
        </div>
        <div>
          <span className="font-semibold text-sm text-green-800 dark:text-green-300">Connect IoT Device</span>
          <span className="ml-2 text-xs text-green-500 dark:text-green-400">Follow these steps to stream live sensor data</span>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 mb-5">
        {([1, 2, 3, 4, 5] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => setStep(s)}
              className={`w-6 h-6 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                step === s
                  ? 'bg-green-600 text-white scale-110 shadow'
                  : stepDone(s)
                  ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
              }`}
            >
              {stepDone(s) ? <CheckCircle size={12} /> : s}
            </button>
            {i < 4 && <div className={`h-0.5 w-5 rounded ${stepDone(s) ? 'bg-green-300 dark:bg-green-700' : 'bg-slate-200 dark:bg-slate-700'}`} />}
          </div>
        ))}
        <span className="ml-2 text-xs text-slate-400">
          {['', 'Select Station', 'Select Device', 'Get API Key', 'Flash Device', 'Live Status'][step]}
        </span>
      </div>

      {/* Step 1: Station */}
      {step === 1 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Which monitoring station is this device for?
          </label>
          <select
            id="live-station-select"
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-navy-light text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.water_body_name}</option>
            ))}
          </select>
          <button
            id="live-step1-next"
            onClick={() => setStep(2)}
            disabled={selectedStationId === ''}
            className="btn-primary bg-green-600 hover:bg-green-700 py-2 px-4 text-sm flex items-center gap-2"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Step 2: Device */}
      {step === 2 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Select an existing device or add a new one
          </label>
          {loadingDevices ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><RefreshCw size={14} className="animate-spin" /> Loading…</div>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
              {devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDevice(d)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                    selectedDevice?.id === d.id
                      ? 'bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700'
                      : 'hover:bg-slate-50 dark:hover:bg-navy-light border border-transparent'
                  }`}
                >
                  <Cpu size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="flex-1 font-mono font-medium text-slate-700 dark:text-slate-200">{d.device_uid}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    d.status === 'online' ? 'badge-good' : d.status === 'stale' ? 'badge-warning' : 'badge-offline'
                  }`}>{d.status}</span>
                </button>
              ))}
            </div>
          )}

          {/* Add new device */}
          {(user?.role === 'admin' || user?.role === 'operator') && (
            <div className="flex gap-2 mt-2">
              <input
                id="live-new-uid"
                type="text"
                placeholder="New device UID (e.g. AQS-ESP32-001)"
                value={newUid}
                onChange={(e) => setNewUid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDevice()}
                className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-navy-light text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                id="live-add-device"
                onClick={handleAddDevice}
                disabled={addingDevice || !newUid.trim()}
                className="btn-secondary py-2 px-3 text-sm"
              >
                {addingDevice ? <RefreshCw size={13} className="animate-spin" /> : '+ Add'}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="btn-ghost py-2 px-3 text-sm">Back</button>
            <button
              id="live-step2-next"
              onClick={() => setStep(3)}
              disabled={!selectedDevice}
              className="btn-primary bg-green-600 hover:bg-green-700 py-2 px-4 text-sm flex items-center gap-2"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: API Key */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Generate an API key for <span className="font-mono text-green-700 dark:text-green-300">{selectedDevice?.device_uid}</span>
          </p>
          <p className="text-xs text-slate-400">The key is shown once. Store it in your device firmware.</p>
          {apiKey ? (
            <div className="flex items-center gap-2 bg-white dark:bg-navy-light rounded-lg px-3 py-2 border border-green-200 dark:border-green-700">
              <code className="flex-1 text-sm font-mono text-slate-800 dark:text-white break-all">{apiKey}</code>
              <button onClick={() => { navigator.clipboard.writeText(apiKey); }} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1">
                <Copy size={11} /> Copy
              </button>
            </div>
          ) : (
            <button
              id="live-gen-key"
              onClick={handleGenerateKey}
              disabled={generatingKey}
              className="btn-primary bg-green-600 hover:bg-green-700 py-2 px-4 text-sm flex items-center gap-2"
            >
              {generatingKey ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
              Generate API Key
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="btn-ghost py-2 px-3 text-sm">Back</button>
            <button
              id="live-step3-next"
              onClick={() => setStep(4)}
              disabled={!apiKey}
              className="btn-primary bg-green-600 hover:bg-green-700 py-2 px-4 text-sm flex items-center gap-2"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Code snippets */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Flash your device with one of these code snippets:</p>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg w-fit">
            {(['curl', 'arduino', 'python'] as const).map((tab) => (
              <button
                key={tab}
                id={`live-code-${tab}`}
                onClick={() => setCodeTab(tab)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  codeTab === tab
                    ? 'bg-white dark:bg-navy text-slate-800 dark:text-white shadow'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab === 'curl' ? 'cURL' : tab === 'arduino' ? 'ESP32/Arduino' : 'Python'}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre className="bg-slate-900 text-green-300 text-xs rounded-xl p-4 overflow-x-auto max-h-52 scrollbar-thin font-mono leading-relaxed whitespace-pre">
              {getSnippet()}
            </pre>
            <button
              id="live-copy-snippet"
              onClick={copyCode}
              className="absolute top-2 right-2 btn-ghost py-1 px-2 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 border-0 flex items-center gap-1"
            >
              <Copy size={11} /> {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            💡 Replace <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">&lt;YOUR_PC_IP&gt;</code> with your machine's IP so the ESP32 can reach the API.
          </p>

          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="btn-ghost py-2 px-3 text-sm">Back</button>
            <button
              id="live-step4-next"
              onClick={() => setStep(5)}
              className="btn-primary bg-green-600 hover:bg-green-700 py-2 px-4 text-sm flex items-center gap-2"
            >
              Check Connection <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Live status */}
      {step === 5 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Live connection status for <span className="font-mono text-green-700 dark:text-green-300">{selectedDevice?.device_uid}</span></p>

          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            connectionStatus() === 'online'
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
              : connectionStatus() === 'stale'
              ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700'
              : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
          }`}>
            <Circle
              size={14}
              className={`flex-shrink-0 fill-current ${
                connectionStatus() === 'online' ? 'text-green-500 animate-pulse' :
                connectionStatus() === 'stale' ? 'text-amber-500' : 'text-slate-400'
              }`}
            />
            <div>
              <div className="font-semibold text-sm text-slate-800 dark:text-white capitalize">
                {connectionStatus() === 'never' ? 'Not yet connected' :
                 connectionStatus() === 'online' ? '🟢 Online — receiving data' :
                 connectionStatus() === 'stale' ? '🟡 Stale — no recent data' : '🔴 Offline'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {deviceStatus?.last_seen_at
                  ? `Last seen: ${formatTimeAgo(deviceStatus.last_seen_at)}`
                  : 'Send the first payload using your snippet above'}
              </div>
            </div>
            {deviceStatus?.battery_pct != null && (
              <span className="ml-auto text-xs text-slate-500">🔋 {deviceStatus.battery_pct}%</span>
            )}
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1">
            <RefreshCw size={10} className="animate-spin" /> Polling every 5 seconds. Once online, all gauges and charts on this page update live.
          </p>

          <div className="flex gap-2">
            <button onClick={() => setStep(4)} className="btn-ghost py-2 px-3 text-sm">Back to Code</button>
            <button onClick={() => setStep(1)} className="btn-secondary py-2 px-3 text-sm">Add Another Device</button>
          </div>
        </div>
      )}
    </div>
  );
}
