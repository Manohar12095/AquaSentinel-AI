import { useState, useEffect } from 'react';
import { Search, Download, FileText, Calendar, Filter } from 'lucide-react';
import { api, formatTimeAgo } from '../lib/api';
import SourceBadge from '../components/SourceBadge';
import StatusBadge from '../components/StatusBadge';
import type { Test } from '../lib/types';

export default function ReportsHistory() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [selected, setSelected] = useState<Test | null>(null);

  useEffect(() => {
    api.get<Test[]>('/tests')
      .then((r) => setTests(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tests.filter((t) => {
    if (filterSource !== 'all' && t.source !== filterSource) return false;
    if (query && !t.test_uid.toLowerCase().includes(query.toLowerCase()) &&
        !t.sample_source?.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const handleExportCSV = () => {
    const rows = [
      ['Test UID', 'Station', 'Source', 'Started', 'Status', 'Sample Source'],
      ...tests.map((t) => [
        t.test_uid, String(t.station_id), t.source,
        t.started_at, t.status, t.sample_source,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aquasentinel-tests.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* List panel */}
      <div className="flex flex-col w-full md:w-80 bg-white dark:bg-navy border-r border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Reports & History</h1>
            <button id="btn-export-csv" onClick={handleExportCSV} className="btn-ghost py-1.5 px-2">
              <Download size={12} /> CSV
            </button>
          </div>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="reports-search"
              type="text"
              placeholder="Search by UID or source..."
              className="input pl-8 text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'live', 'simulated', 'lab'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSource(s)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterSource === s
                    ? 'bg-ocean text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-ocean border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">No tests found</div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                id={`test-row-${t.id}`}
                onClick={() => setSelected(t)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-navy-light transition-colors ${
                  selected?.id === t.id ? 'bg-ocean/5 dark:bg-ocean/10' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-semibold text-xs text-slate-800 dark:text-white">{t.test_uid}</span>
                  <SourceBadge source={t.source} />
                </div>
                <div className="text-xs text-slate-400">{formatTimeAgo(t.started_at)}</div>
                <div className="text-xs text-slate-500 truncate">{t.sample_source}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {selected ? (
          <div className="max-w-2xl space-y-5 animate-fade-in">
            <div className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{selected.test_uid}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <SourceBadge source={selected.source} />
                    <span>·</span>
                    <Calendar size={11} />
                    <span>{new Date(selected.started_at).toLocaleString()}</span>
                    <span>·</span>
                    <span>{selected.sample_source}</span>
                  </div>
                </div>
                <span className={selected.status === 'completed' ? 'badge-good' : 'badge-warning'}>
                  {selected.status}
                </span>
              </div>
            </div>

            {/* Readings */}
            <div className="card">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Measurements</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selected.readings.map((r) => (
                  <div key={r.parameter} className="bg-slate-50 dark:bg-navy-light rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{r.value.toFixed(2)}</div>
                    <div className="text-xs text-slate-400">{r.unit}</div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 uppercase">{r.parameter}</div>
                    <SourceBadge source={r.source} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>

            {selected.notes && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Notes</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selected.notes}</p>
              </div>
            )}

            <div className="card border border-amber-100 dark:border-amber-900/30">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">⚠️ Data source: <SourceBadge source={selected.source} /></p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Monitoring status only — not a drinking-water safety certification.
                {selected.source === 'simulated' && ' This report was generated using simulated data.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <FileText size={40} strokeWidth={1} />
            <p className="text-sm">Select a test to view its full report</p>
          </div>
        )}
      </div>
    </div>
  );
}
