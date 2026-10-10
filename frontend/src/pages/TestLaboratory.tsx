import { useState } from 'react';
import { FlaskConical, Play, CheckCircle, AlertTriangle, Download, FileText, Radio } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import SourceBadge from '../components/SourceBadge';
import type { Source, Test } from '../lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

type Stage = 'idle' | 'connecting' | 'stabilizing' | 'measuring' | 'validating' | 'done' | 'error';

const STAGES: Stage[] = ['connecting', 'stabilizing', 'measuring', 'validating', 'done'];
const STAGE_LABELS: Record<Stage, string> = {
  idle: 'Ready',
  connecting: 'Connecting to device...',
  stabilizing: 'Stabilizing probes (20s)...',
  measuring: 'Taking measurements...',
  validating: 'Validating readings...',
  done: 'Complete',
  error: 'Connection error',
};
const STAGE_DURATION_MS: Record<Stage, number> = {
  idle: 0, connecting: 2000, stabilizing: 4000, measuring: 3000, validating: 2000, done: 0, error: 0,
};

export default function TestLaboratory() {
  const { stations, dataMode } = useAppStore();
  const [testType, setTestType] = useState<'home' | 'environmental'>('home');
  const [selectedStationId, setSelectedStationId] = useState<number>(stations[0]?.id ?? 1);
  const [sampleSource, setSampleSource] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [stageIdx, setStageIdx] = useState(-1);
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  const runStages = async (testId: number) => {
    for (let i = 0; i < STAGES.length - 1; i++) {
      setStage(STAGES[i]);
      setStageIdx(i);
      await new Promise((r) => setTimeout(r, STAGE_DURATION_MS[STAGES[i]]));
    }
    // Complete the test
    try {
      const res = await api.post<Test>(`/tests/${testId}/complete`);
      setCurrentTest(res.data);
      setStage('done');
      setStageIdx(STAGES.length - 1);
    } catch {
      setStage('error');
      setError('Failed to complete test. Please try again.');
    }
  };

  const handleStartTest = async () => {
    if (!selectedStationId) return;
    setStage('connecting');
    setStageIdx(0);
    setError('');
    setCurrentTest(null);

    if (dataMode === 'live') {
      // In live mode, we must have a real device — check
      // If no device connected, show error
      const station = stations.find((s) => s.id === selectedStationId);
      if (!station || station.status === 'offline') {
        setStage('error');
        setError(
          'No live device connected to this station. Switch to Simulation mode to run a demo test, or connect an ESP32 device.'
        );
        return;
      }
    }

    try {
      const res = await api.post('/tests', {
        station_id: selectedStationId,
        sample_source: sampleSource || 'Station intake',
        method: testType,
        notes,
      });
      await runStages(res.data.id);
    } catch {
      setStage('error');
      setError('Failed to start test. Please check your connection.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!resultRef.current || !currentTest) return;
    const canvas = await html2canvas(resultRef.current, { scale: 2 });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Watermark for simulated data
    if (currentTest.source === 'simulated') {
      pdf.setFontSize(60);
      pdf.setTextColor(200, 200, 200);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SIMULATED', pdfWidth / 2, pdfHeight / 2, {
        angle: 45, align: 'center', baseline: 'middle',
      });
    }

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`aquasentinel-test-${currentTest.test_uid}.pdf`);
  };

  const resetTest = () => {
    setStage('idle');
    setStageIdx(-1);
    setCurrentTest(null);
    setError('');
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Test Laboratory</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Run water quality tests and generate certified reports.
        </p>
      </div>

      {stage === 'idle' && (
        <div className="space-y-4">
          {/* Test type */}
          <div className="card">
            <h2 className="font-semibold text-slate-800 dark:text-white mb-3">Test Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['home', 'environmental'] as const).map((t) => (
                <button
                  key={t}
                  id={`test-type-${t}`}
                  onClick={() => setTestType(t)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    testType === t
                      ? 'border-ocean bg-ocean/5 dark:bg-ocean/10'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{t === 'home' ? '🏠' : '🌿'}</div>
                  <div className="font-semibold text-slate-800 dark:text-white text-sm capitalize">
                    {t === 'home' ? 'Home Test' : 'Environmental Sample'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {t === 'home' ? 'pH, TDS, turbidity, temperature' : 'Full parameter suite + chemical screening'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Station + sample details */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">Sample Details</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Station</label>
              <select
                id="test-station-picker"
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(Number(e.target.value))}
                className="input"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.water_body_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sample Source</label>
              <input
                id="test-sample-source"
                type="text"
                className="input"
                placeholder="e.g. Station intake, downstream 100m..."
                value={sampleSource}
                onChange={(e) => setSampleSource(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Any additional observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Start button */}
          <button
            id="btn-start-test"
            onClick={handleStartTest}
            className="btn-primary w-full justify-center py-3 text-base font-bold"
          >
            <Play size={18} />
            Start Test
          </button>

          {dataMode === 'simulation' && (
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
              <Radio size={12} />
              Simulation mode: test will use generated data labelled as simulated.
            </div>
          )}
        </div>
      )}

      {/* Progress animation */}
      {stage !== 'idle' && stage !== 'done' && stage !== 'error' && (
        <div className="card space-y-6">
          <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <FlaskConical size={18} className="text-ocean" />
            Test in Progress
          </h2>

          {/* Stage steps */}
          <div className="space-y-3">
            {STAGES.slice(0, -1).map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  i < stageIdx ? 'bg-good text-white' :
                  i === stageIdx ? 'bg-ocean text-white animate-pulse' :
                  'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}>
                  {i < stageIdx ? <CheckCircle size={14} /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <span className={`text-sm ${
                  i === stageIdx ? 'font-semibold text-ocean dark:text-ocean-light' :
                  i < stageIdx ? 'text-slate-400 line-through' :
                  'text-slate-400'
                }`}>
                  {STAGE_LABELS[s]}
                </span>
                {i === stageIdx && (
                  <div className="ml-auto flex gap-0.5">
                    {[0, 1, 2].map((dot) => (
                      <div
                        key={dot}
                        className="w-1.5 h-1.5 bg-ocean rounded-full animate-bounce"
                        style={{ animationDelay: `${dot * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-ocean/5 dark:bg-ocean/10 rounded-xl p-4">
            <p className="text-sm text-ocean dark:text-ocean-light font-semibold">{STAGE_LABELS[stage]}</p>
            <p className="text-xs text-slate-500 mt-1">
              {dataMode === 'simulation' ? 'Running simulated sequence — data is generated.' : 'Reading live sensor data...'}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {stage === 'error' && (
        <div className="card border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-critical flex-shrink-0" />
            <h2 className="font-semibold text-slate-800 dark:text-white">Test Failed</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{error}</p>
          <div className="flex gap-3">
            <button onClick={resetTest} className="btn-secondary">Try again</button>
          </div>
        </div>
      )}

      {/* Results */}
      {stage === 'done' && currentTest && (
        <div className="space-y-4" ref={resultRef}>
          <div className="card border-l-4 border-l-good">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={18} className="text-good" />
                  <h2 className="font-bold text-slate-800 dark:text-white">Test Complete</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{currentTest.test_uid}</span>
                  <span>·</span>
                  <SourceBadge source={currentTest.source} />
                  <span>·</span>
                  <span>{new Date(currentTest.started_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Readings */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Readings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentTest.readings.map((r) => (
                <div key={r.parameter} className="bg-slate-50 dark:bg-navy-light rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">
                    {r.value.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">{r.unit}</div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                    {r.parameter.toUpperCase()}
                  </div>
                  <SourceBadge source={r.source} className="mt-1" />
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">⚠️ Limitations</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Basic sensors (pH, TDS, turbidity, temperature) cannot identify specific chemicals or certify drinking water.
                Monitoring status only — not a drinking-water safety certification.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button id="btn-download-pdf" onClick={handleDownloadPDF} className="btn-primary">
              <Download size={14} /> Download PDF
            </button>
            <button onClick={resetTest} className="btn-secondary">
              <Play size={14} /> New Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
