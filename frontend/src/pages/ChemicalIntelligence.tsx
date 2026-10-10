import { useState, useEffect } from 'react';
import { Search, ExternalLink, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';
import type { Chemical, IdentificationStatus } from '../lib/types';

const STATUS_COLORS: Record<IdentificationStatus, string> = {
  Confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Presumptive: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Suspected: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Not tested': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const SUSPECTED_PATTERNS = [
  {
    pattern: 'High TDS + High conductivity',
    categories: ['Dissolved salts (NaCl, sulfates)', 'Industrial discharge', 'Seawater intrusion'],
    confidence: 'Medium',
    test: 'Ion chromatography or certified lab analysis for ionic species',
  },
  {
    pattern: 'Low pH (< 6.0)',
    categories: ['Acid mine drainage', 'Industrial acidic effluent', 'CO₂ dissolution'],
    confidence: 'Low',
    test: 'Acid-base titration + metal analysis (Fe, Mn, Cu) by certified lab',
  },
  {
    pattern: 'High turbidity + elevated temp',
    categories: ['Sediment runoff', 'Sewage discharge', 'Algal bloom (thermal stratification)'],
    confidence: 'Low',
    test: 'Microscopy, BOD/COD analysis, coliform culture',
  },
  {
    pattern: 'Conductivity spike (>30% in 10 min)',
    categories: ['Salt/chemical spill', 'Industrial discharge event'],
    confidence: 'Medium',
    test: 'Lab sampling within 2h — multi-element ICP-MS analysis',
  },
  {
    pattern: 'High pH (> 9.0)',
    categories: ['Lime/caustic spill', 'Cement/construction runoff', 'Algal photosynthesis'],
    confidence: 'Low',
    test: 'Alkalinity titration + ICP-OES for cations',
  },
];

export default function ChemicalIntelligence() {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Chemical | null>(null);
  const [loading, setLoading] = useState(true);
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperPattern, setHelperPattern] = useState(0);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    api.get<Chemical[]>('/chemicals')
      .then((r) => setChemicals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = chemicals.filter((c) =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.formula.toLowerCase().includes(query.toLowerCase()) ||
    c.cas_number.includes(query)
  );

  const getPubChemImgUrl = (cid: number | null) =>
    cid ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=200x200` : null;

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* Left panel: list */}
      <div className="flex flex-col w-full md:w-72 lg:w-80 bg-white dark:bg-navy border-r border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h1 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Chemical Intelligence</h1>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="chemical-search"
              type="text"
              placeholder="Search name, formula, CAS..."
              className="input pl-8 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-ocean border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">No chemicals found</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                id={`chemical-${c.id}`}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-navy-light transition-colors ${
                  selected?.id === c.id ? 'bg-ocean/5 dark:bg-ocean/10' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-white text-sm">{c.name}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">{c.formula} · CAS {c.cas_number}</div>
              </button>
            ))
          )}
        </div>

        {/* Helper & Explainer buttons */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <button
            id="btn-suspected-helper"
            onClick={() => setHelperOpen((v) => !v)}
            className="btn-ghost w-full justify-between"
          >
            <span className="flex items-center gap-2"><AlertTriangle size={13} /> Suspected-substance helper</span>
            {helperOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={() => setExplainerOpen((v) => !v)}
            className="btn-ghost w-full justify-between"
          >
            <span className="flex items-center gap-2"><Info size={13} /> What can my device tell me?</span>
            {explainerOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Right panel: detail or helpers */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {/* Suspected substance helper */}
        {helperOpen && (
          <div className="card mb-5 border-l-4 border-l-amber-400">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-bold text-slate-800 dark:text-white">Suspected-Substance Helper</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select an observed reading pattern. The helper suggests possible <strong>categories</strong> of cause
              — it <strong>never</strong> states a specific chemical as present.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {SUSPECTED_PATTERNS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setHelperPattern(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    helperPattern === i
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {SUSPECTED_PATTERNS[i].pattern}
                </button>
              ))}
            </div>
            <div className="bg-slate-50 dark:bg-navy-light rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-800 dark:text-white text-sm">
                  Pattern: {SUSPECTED_PATTERNS[helperPattern].pattern}
                </span>
                <span className="badge-warning">{SUSPECTED_PATTERNS[helperPattern].confidence} confidence</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                Possible categories of cause:
              </p>
              <ul className="space-y-1 mb-4">
                {SUSPECTED_PATTERNS[helperPattern].categories.map((cat) => (
                  <li key={cat} className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {cat}
                  </li>
                ))}
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold mb-1">Confirmatory test needed:</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">{SUSPECTED_PATTERNS[helperPattern].test}</p>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 italic">
                This helper lists possible categories, not confirmed detections. Unusual readings alone cannot
                identify a specific chemical. Always confirm with certified laboratory analysis.
              </p>
            </div>
          </div>
        )}

        {/* Explainer */}
        {explainerOpen && (
          <div className="card mb-5">
            <h2 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <Info size={16} className="text-ocean" /> What Can My Device Actually Tell Me?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  level: 'Level 1',
                  title: 'General Screening',
                  sensors: 'pH, TDS, Turbidity, Temperature',
                  can: 'Detect anomalies, trigger alerts, flag water outside normal ranges',
                  cannot: 'Identify specific chemicals, certify potability',
                  badge: 'badge-offline',
                },
                {
                  level: 'Level 2',
                  title: 'Targeted Screening',
                  sensors: 'Ion-selective electrodes, colorimetric kits',
                  can: 'Presumptive detection of specific ions (nitrate, chloride, etc.)',
                  cannot: 'Confirm presence below detection limit, identify unknown substances',
                  badge: 'badge-warning',
                },
                {
                  level: 'Level 3',
                  title: 'Molecular Identification',
                  sensors: 'Certified lab (ICP-MS, GC-MS, LC-MS)',
                  can: 'Confirmed identification and quantification of specific chemicals',
                  cannot: 'Real-time monitoring',
                  badge: 'badge-good',
                },
              ].map(({ level, title, sensors, can, cannot, badge }) => (
                <div key={level} className="bg-slate-50 dark:bg-navy-light rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={badge}>{level}</span>
                    <span className="font-semibold text-sm text-slate-800 dark:text-white">{title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2"><strong>Instruments:</strong> {sensors}</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mb-1">✓ {can}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">✗ {cannot}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chemical detail */}
        {selected ? (
          <div className="space-y-4 animate-fade-in">
            <div className="card">
              <div className="flex items-start gap-4">
                {/* Structure image */}
                {selected.pubchem_cid && (
                  <img
                    src={getPubChemImgUrl(selected.pubchem_cid)!}
                    alt={`2D structure of ${selected.name}`}
                    className="w-28 h-28 rounded-xl border border-slate-100 dark:border-slate-700 bg-white object-contain flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selected.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{selected.formula}</span>
                    <span>CAS: {selected.cas_number}</span>
                    <span>MW: {selected.molar_mass} g/mol</span>
                  </div>
                  {selected.pubchem_cid && (
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${selected.pubchem_cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-ocean hover:underline mt-2"
                    >
                      PubChem <ExternalLink size={10} />
                    </a>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2 italic">
                    Last reviewed: {selected.last_reviewed}. Reference values are informational —
                    verify against current official standards before regulatory use.
                  </p>
                </div>
              </div>
            </div>

            {/* Hazards */}
            {selected.hazards.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">⚠️ Known Hazards</h3>
                <ul className="space-y-1">
                  {selected.hazards.map((h, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-critical flex-shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reference limits */}
            {selected.reference_limits.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Reference Limits</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Use</th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Limit</th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.reference_limits.map((l, i) => (
                      <tr key={i} className="table-row">
                        <td className="py-2 text-slate-700 dark:text-slate-200 capitalize">{l.use}</td>
                        <td className="py-2 text-right font-mono text-slate-800 dark:text-white">
                          {l.value} {l.unit}
                        </td>
                        <td className="py-2 text-right text-xs text-slate-400">{l.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-400 italic mt-2">
                  Reference values must be verified against current official local/national standards.
                </p>
              </div>
            )}

            {/* References */}
            {selected.references.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">References</h3>
                <ul className="space-y-1">
                  {selected.references.map((r, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400">[{i + 1}] {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : !helperOpen && !explainerOpen ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Search size={40} strokeWidth={1} />
            <p className="text-sm">Select a chemical from the list to view details</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
