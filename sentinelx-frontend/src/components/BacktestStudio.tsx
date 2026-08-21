'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, Rule, BacktestReportResponse, BacktestRequest } from '@/lib/api';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Layers,
  ArrowRight,
  Database,
  FileCode2,
  Zap,
} from 'lucide-react';

export function BacktestStudio() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [candidateWeights, setCandidateWeights] = useState<Record<string, number>>({});
  const [candidateToggles, setCandidateToggles] = useState<Record<string, boolean>>({});
  const [datasetSource, setDatasetSource] = useState<'SAMPLE_BENCHMARK' | 'DATABASE_RANGE' | 'CUSTOM_PAYLOAD'>('SAMPLE_BENCHMARK');
  const [customJson, setCustomJson] = useState('');
  const [isCustomValid, setIsCustomValid] = useState(true);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BacktestReportResponse | null>(null);

  // Load baseline rules on mount
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await api.rules.getAll();
        if (!ignore) {
          setRules(data);
          const initialWeights: Record<string, number> = {};
          const initialToggles: Record<string, boolean> = {};
          data.forEach((r) => {
            initialWeights[r.id] = r.weight;
            initialToggles[r.id] = r.isActive;
          });
          setCandidateWeights(initialWeights);
          setCandidateToggles(initialToggles);
        }
      } catch (err) {
        if (!ignore) console.error('Failed to load rules for backtesting:', err);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleWeightChange = (ruleId: string, newWeight: number) => {
    setCandidateWeights((prev) => ({ ...prev, [ruleId]: newWeight }));
  };

  const handleToggleChange = (ruleId: string) => {
    setCandidateToggles((prev) => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  const handleResetSliders = () => {
    const initialWeights: Record<string, number> = {};
    const initialToggles: Record<string, boolean> = {};
    rules.forEach((r) => {
      initialWeights[r.id] = r.weight;
      initialToggles[r.id] = r.isActive;
    });
    setCandidateWeights(initialWeights);
    setCandidateToggles(initialToggles);
  };

  const handleRunSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const candidateOverrides = rules.map((r) => ({
        ruleId: r.id,
        name: r.name,
        description: r.description,
        conditionJson: r.conditionJson,
        weight: candidateWeights[r.id] ?? r.weight,
        isActive: candidateToggles[r.id] ?? r.isActive,
      }));

      let parsedCustomTxns = undefined;
      if (datasetSource === 'CUSTOM_PAYLOAD' && customJson.trim()) {
        try {
          parsedCustomTxns = JSON.parse(customJson);
          setIsCustomValid(true);
        } catch {
          setIsCustomValid(false);
          setLoading(false);
          return;
        }
      }

      const request: BacktestRequest = {
        datasetSource,
        limit: 250,
        customTransactions: parsedCustomTxns,
        candidateRules: candidateOverrides,
      };

      const result = await api.backtest.run(request);
      setReport(result);
    } catch (err) {
      console.error('Backtest run failed:', err);
    } finally {
      setLoading(false);
    }
  }, [rules, candidateWeights, candidateToggles, datasetSource, customJson]);

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-950/80 border border-purple-700/50 text-purple-400">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Historical Replay &amp; Rule Backtesting Studio
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-400 border border-purple-800/60 font-mono font-normal">
                Phase 7
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate rule weight adjustments against historical transactions in a zero-risk dry-run sandbox
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSliders}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={() => handleRunSimulation()}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{loading ? 'Simulating...' : 'Run Backtest Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Dataset & Candidate Rule Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Dataset Selection */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span>1. Select Historical Dataset</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDatasetSource('SAMPLE_BENCHMARK')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  datasetSource === 'SAMPLE_BENCHMARK'
                    ? 'bg-purple-950/40 border-purple-600/60 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Standard Benchmark (250 Txns)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Pre-seeded test matrix covering velocity bursts, VPN hops, luxury transfers, and dark merchants.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('DATABASE_RANGE')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  datasetSource === 'DATABASE_RANGE'
                    ? 'bg-purple-950/40 border-purple-600/60 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">PostgreSQL Transaction History</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Replay actual historical transactions recorded in your PostgreSQL database instance.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('CUSTOM_PAYLOAD')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  datasetSource === 'CUSTOM_PAYLOAD'
                    ? 'bg-purple-950/40 border-purple-600/60 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileCode2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Custom JSON Payload Upload</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Paste an array of custom transaction request objects to test arbitrary attack vectors.
                  </div>
                </div>
              </button>
            </div>

            {datasetSource === 'CUSTOM_PAYLOAD' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-semibold text-slate-400">Custom Transaction Array (JSON):</label>
                <textarea
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  placeholder={`[\n  {\n    "userId": "usr_1001",\n    "amount": 12000.00,\n    "currency": "USD",\n    "merchantId": "mer_luxury"\n  }\n]`}
                  rows={5}
                  className={`w-full bg-slate-950 font-mono text-xs p-3 rounded-lg border focus:outline-none ${
                    isCustomValid ? 'border-slate-800 focus:border-purple-500' : 'border-red-500 text-red-300'
                  }`}
                />
                {!isCustomValid && <p className="text-[11px] text-red-400">Invalid JSON array syntax.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Candidate Rule Sliders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>2. Configure Candidate Rule Parameters</span>
              </h3>
              <span className="text-[11px] text-slate-400">Adjust candidate weights &amp; compare against live baseline</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {rules.map((rule) => {
                const currentWeight = candidateWeights[rule.id] ?? rule.weight;
                const isEnabled = candidateToggles[rule.id] ?? rule.isActive;
                const delta = currentWeight - rule.weight;

                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isEnabled ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-400">{rule.id}</span>
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">{rule.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleChange(rule.id)}
                        className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold transition-colors ${
                          isEnabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isEnabled ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Weight Contribution:</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-slate-400">{rule.weight} pts</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-purple-300 font-bold">{currentWeight} pts</span>
                          {delta !== 0 && (
                            <span className={`text-[10px] font-bold ${delta > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                              ({delta > 0 ? `+${delta}` : delta})
                            </span>
                          )}
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        disabled={!isEnabled}
                        value={currentWeight}
                        onChange={(e) => handleWeightChange(rule.id, parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Backtest Report Results Section */}
      {report && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Summary Comparison Header Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Processed Batch
              </span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{report.totalTransactions}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Dry-run in {report.simulationDurationMs}ms</div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Approved (ALLOW)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-bold font-mono text-emerald-400">{report.candidate.allowCount}</div>
                <div className="text-xs text-slate-400 font-mono">({report.candidate.allowPercentage}%)</div>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Baseline: {report.baseline.allowCount}</span>
                <span className="font-mono text-purple-300 font-semibold">
                  ({report.distributionShift.ALLOW >= 0 ? `+${report.distributionShift.ALLOW}` : report.distributionShift.ALLOW})
                </span>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Flagged (REVIEW)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-bold font-mono text-amber-400">{report.candidate.reviewCount}</div>
                <div className="text-xs text-slate-400 font-mono">({report.candidate.reviewPercentage}%)</div>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Baseline: {report.baseline.reviewCount}</span>
                <span className="font-mono text-amber-300 font-semibold">
                  ({report.distributionShift.REVIEW >= 0 ? `+${report.distributionShift.REVIEW}` : report.distributionShift.REVIEW})
                </span>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                Blocked (BLOCK)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-bold font-mono text-red-400">{report.candidate.blockCount}</div>
                <div className="text-xs text-slate-400 font-mono">({report.candidate.blockPercentage}%)</div>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Baseline: {report.baseline.blockCount}</span>
                <span className="font-mono text-red-300 font-semibold">
                  ({report.distributionShift.BLOCK >= 0 ? `+${report.distributionShift.BLOCK}` : report.distributionShift.BLOCK})
                </span>
              </div>
            </div>
          </div>

          {/* Distribution Shift Visualizer Bar */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Verdict Distribution Shift (Baseline vs Candidate)</span>
              </h4>
              <div className="text-xs font-mono text-slate-400">
                {report.discrepancyCount} Total Discrepancies (
                <span className={report.blockRateShiftPercentage >= 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {report.blockRateShiftPercentage >= 0 ? `+${report.blockRateShiftPercentage}%` : `${report.blockRateShiftPercentage}%`} Block Shift
                </span>
                )
              </div>
            </div>

            {/* Visual stacked bars */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Baseline Policy</span>
                  <span className="font-mono">
                    ALLOW {report.baseline.allowCount} | REVIEW {report.baseline.reviewCount} | BLOCK {report.baseline.blockCount}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
                  <div style={{ width: `${report.baseline.allowPercentage}%` }} className="bg-emerald-500/80" />
                  <div style={{ width: `${report.baseline.reviewPercentage}%` }} className="bg-amber-500/80" />
                  <div style={{ width: `${report.baseline.blockPercentage}%` }} className="bg-red-500/80" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 font-semibold mb-1">
                  <span className="text-purple-300">Candidate Policy (Proposed)</span>
                  <span className="font-mono">
                    ALLOW {report.candidate.allowCount} | REVIEW {report.candidate.reviewCount} | BLOCK {report.candidate.blockCount}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-950 border border-purple-800/60">
                  <div style={{ width: `${report.candidate.allowPercentage}%` }} className="bg-emerald-400" />
                  <div style={{ width: `${report.candidate.reviewPercentage}%` }} className="bg-amber-400" />
                  <div style={{ width: `${report.candidate.blockPercentage}%` }} className="bg-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Discrepancy Drilldown Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-200">Transaction Discrepancy Drilldown (Top {report.discrepancies.length})</h4>
              <span className="text-xs text-slate-400">Transactions where verdict or score shifted significantly</span>
            </div>

            {report.discrepancies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-800/60 rounded-lg bg-slate-950/40 font-mono">
                Zero verdict discrepancies detected between baseline and candidate configurations.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Txn ID</th>
                      <th className="py-2.5 px-3 font-semibold">User</th>
                      <th className="py-2.5 px-3 font-semibold">Amount</th>
                      <th className="py-2.5 px-3 font-semibold">Baseline Verdict</th>
                      <th className="py-2.5 px-3 font-semibold">Candidate Verdict</th>
                      <th className="py-2.5 px-3 font-semibold">Score Shift</th>
                      <th className="py-2.5 px-3 font-semibold">Candidate Fired Rules</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {report.discrepancies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-300">{item.transactionId}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{item.userId}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">${item.amount?.toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.baselineVerdict === 'ALLOW'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                : item.baselineVerdict === 'REVIEW'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                                : 'bg-red-950/80 text-red-400 border border-red-800/50'
                            }`}
                          >
                            {item.baselineVerdict} ({item.baselineScore})
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.candidateVerdict === 'ALLOW'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                : item.candidateVerdict === 'REVIEW'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                                : 'bg-red-950/80 text-red-400 border border-red-800/50'
                            }`}
                          >
                            {item.candidateVerdict} ({item.candidateScore})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={item.scoreDelta > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {item.scoreDelta > 0 ? `+${item.scoreDelta}` : item.scoreDelta} pts
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.candidateFiredRules.map((ruleName, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 text-[10px] font-mono border border-slate-700/60"
                              >
                                {ruleName}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
