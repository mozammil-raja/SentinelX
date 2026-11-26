'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, Rule, BacktestReportResponse, BacktestRequest } from '@/lib/api';
import {
  FlaskConical,
  Play,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Layers,
  ArrowRight,
  Database,
  FileCode,
  Activity,
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
      } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error('Backtest run failed:', err);
    } finally {
      setLoading(false);
    }
  }, [rules, candidateWeights, candidateToggles, datasetSource, customJson]);

  return (
    <div className="space-y-5 font-mono text-white">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c222e] border border-slate-800/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                POLICY_SANDBOX // HISTORICAL_BACKTEST_STUDIO
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-bold">
                DRY_RUN
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Simulate rule weight reconfigurations against historical transactions in an isolated zero-risk replay engine.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleResetSliders}
            className="px-3 py-2 rounded-lg bg-[#151922] hover:bg-slate-700 text-neutral-300 flex items-center gap-1.5 transition-colors border border-slate-700/80 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
          <button
            onClick={() => handleRunSimulation()}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-bold text-white flex items-center gap-1.5 transition-all shadow-sm shadow-blue-900/50 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white" />
            )}
            <span>{loading ? 'REPLAYING_BATCH...' : 'EXECUTE_BACKTEST'}</span>
          </button>
        </div>
      </div>

      {/* Dataset & Candidate Rule Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Dataset Selection */}
        <div className="space-y-4">
          <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>01 // SELECT REPLAY DATASET</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDatasetSource('SAMPLE_BENCHMARK')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  datasetSource === 'SAMPLE_BENCHMARK'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-[#151922] border-slate-800 hover:border-slate-700 text-neutral-300'
                }`}
              >
                <Activity className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold uppercase text-white">STANDARD_BENCHMARK (250 TXNS)</div>
                  <div className="text-[11px] font-sans mt-0.5 text-neutral-400">
                    Pre-seeded test matrix covering velocity bursts, VPN hops, luxury transfers, and dark merchants.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('DATABASE_RANGE')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  datasetSource === 'DATABASE_RANGE'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-[#151922] border-slate-800 hover:border-slate-700 text-neutral-300'
                }`}
              >
                <Database className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold uppercase text-white">POSTGRESQL_AUDIT_LOG</div>
                  <div className="text-[11px] font-sans mt-0.5 text-neutral-400">
                    Replay actual historical transactions recorded in your PostgreSQL database instance.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('CUSTOM_PAYLOAD')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  datasetSource === 'CUSTOM_PAYLOAD'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-[#151922] border-slate-800 hover:border-slate-700 text-neutral-300'
                }`}
              >
                <FileCode className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                <div>
                  <div className="text-xs font-bold uppercase text-white">CUSTOM_JSON_PAYLOAD</div>
                  <div className="text-[11px] font-sans mt-0.5 text-neutral-400">
                    Paste an array of custom transaction request objects to test arbitrary attack vectors.
                  </div>
                </div>
              </button>
            </div>

            {datasetSource === 'CUSTOM_PAYLOAD' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-[10px] text-neutral-400 uppercase">CUSTOM_TRANSACTION_ARRAY (JSON):</label>
                <textarea
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  placeholder={`[\n  {\n    "userId": "usr_sarah",\n    "amount": 12000.00,\n    "currency": "USD",\n    "merchantId": "mer_luxury_watches"\n  }\n]`}
                  rows={4}
                  className="w-full bg-[#151922] text-xs p-2.5 rounded-lg border border-slate-700 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono"
                />
                {!isCustomValid && <p className="text-[10px] text-rose-400 font-bold">[SYNTAX_ERROR] Invalid JSON array format.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Candidate Rule Sliders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>02 // CONFIGURE CANDIDATE POLICY WEIGHTS</span>
              </h3>
              <span className="text-[10px] text-neutral-400">ADJUST WEIGHTS &amp; COMPARE SHIFT</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rules.map((rule) => {
                const currentWeight = candidateWeights[rule.id] ?? rule.weight;
                const isEnabled = candidateToggles[rule.id] ?? rule.isActive;
                const delta = currentWeight - rule.weight;

                return (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isEnabled ? 'bg-[#151922] border-slate-800/80' : 'bg-[#151922]/50 border-slate-800/40 opacity-50 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-cyan-400 bg-[#1c222e] px-2 py-0.5 rounded border border-slate-700">{rule.id}</span>
                        <span className="text-xs font-semibold text-white truncate max-w-[140px] uppercase">{rule.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleChange(rule.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors border ${
                          isEnabled ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' : 'bg-slate-900 text-neutral-500 border-slate-700'
                        }`}
                      >
                        {isEnabled ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400">WEIGHT:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-400">{rule.weight} PTS</span>
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                          <span className="text-white font-bold">{currentWeight} PTS</span>
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
                        className="w-full h-1.5 bg-[#11141a] rounded-lg appearance-none cursor-pointer accent-blue-500"
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
        <div className="space-y-4">
          {/* Summary Comparison Header Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#1c222e] border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                BATCH_PROCESSED
              </span>
              <div className="text-xl font-bold text-white mt-1">{report.totalTransactions} TXNS</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">REPLAYED IN {report.simulationDurationMs}MS</div>
            </div>

            <div className="bg-[#1c222e] border border-emerald-500/30 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ALLOW_VERDICTS
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-xl font-bold text-emerald-400">{report.candidate.allowCount}</div>
                <div className="text-[11px] text-neutral-400">({report.candidate.allowPercentage}%)</div>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                <span>BASE: {report.baseline.allowCount}</span>
                <span className="text-emerald-400 font-bold ml-1">
                  ({report.distributionShift.ALLOW >= 0 ? `+${report.distributionShift.ALLOW}` : report.distributionShift.ALLOW})
                </span>
              </div>
            </div>

            <div className="bg-[#1c222e] border border-amber-500/30 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                REVIEW_FLAGGED
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-xl font-bold text-amber-400">{report.candidate.reviewCount}</div>
                <div className="text-[11px] text-neutral-400">({report.candidate.reviewPercentage}%)</div>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                <span>BASE: {report.baseline.reviewCount}</span>
                <span className="text-amber-400 font-bold ml-1">
                  ({report.distributionShift.REVIEW >= 0 ? `+${report.distributionShift.REVIEW}` : report.distributionShift.REVIEW})
                </span>
              </div>
            </div>

            <div className="bg-[#1c222e] border border-rose-500/30 rounded-xl p-3.5 shadow-sm">
              <span className="text-[10px] text-rose-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                BLOCKED_FRAUD
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-xl font-bold text-rose-400">{report.candidate.blockCount}</div>
                <div className="text-[11px] text-neutral-400">({report.candidate.blockPercentage}%)</div>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                <span>BASE: {report.baseline.blockCount}</span>
                <span className="text-rose-400 font-bold ml-1">
                  ({report.distributionShift.BLOCK >= 0 ? `+${report.distributionShift.BLOCK}` : report.distributionShift.BLOCK})
                </span>
              </div>
            </div>
          </div>

          {/* Distribution Shift Visualizer Bar */}
          <div className="bg-[#1c222e] border border-slate-800 rounded-xl p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <h4 className="font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>POLICY_DISTRIBUTION_DELTA (BASELINE vs CANDIDATE)</span>
              </h4>
              <div className="text-neutral-300">
                {report.discrepancyCount} TOTAL SHIFTS (
                <span className={report.blockRateShiftPercentage >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {report.blockRateShiftPercentage >= 0 ? `+${report.blockRateShiftPercentage}%` : `${report.blockRateShiftPercentage}%`} BLOCK_DELTA
                </span>
                )
              </div>
            </div>

            {/* Visual stacked bars */}
            <div className="space-y-2.5 pt-1">
              <div>
                <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                  <span>BASELINE_POLICY</span>
                  <span>
                    ALLOW {report.baseline.allowCount} | REVIEW {report.baseline.reviewCount} | BLOCK {report.baseline.blockCount}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[#11141a]">
                  <div style={{ width: `${report.baseline.allowPercentage}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${report.baseline.reviewPercentage}%` }} className="bg-amber-500" />
                  <div style={{ width: `${report.baseline.blockPercentage}%` }} className="bg-rose-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-white font-bold mb-1">
                  <span className="text-cyan-400">CANDIDATE_POLICY (PROPOSED)</span>
                  <span>
                    ALLOW {report.candidate.allowCount} | REVIEW {report.candidate.reviewCount} | BLOCK {report.candidate.blockCount}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[#11141a] ring-1 ring-cyan-500/40">
                  <div style={{ width: `${report.candidate.allowPercentage}%` }} className="bg-emerald-400" />
                  <div style={{ width: `${report.candidate.reviewPercentage}%` }} className="bg-amber-400" />
                  <div style={{ width: `${report.candidate.blockPercentage}%` }} className="bg-rose-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Discrepancy Drilldown Table */}
          <div className="bg-[#1c222e] border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <h4 className="font-bold text-white uppercase">TRANSACTION_DISCREPANCY_AUDIT (TOP {report.discrepancies.length})</h4>
              <span className="text-[10px] text-neutral-400">TRANSACTIONS WITH ALTERED VERDICTS</span>
            </div>

            {report.discrepancies.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400 border border-slate-800 rounded-lg bg-[#151922]">
                [ZERO_DISCREPANCIES] Candidate weights produced identical verdicts across all evaluated records.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#151922]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-neutral-400 bg-[#11141a] text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">TXN_ID</th>
                      <th className="py-2.5 px-3 font-bold">USER</th>
                      <th className="py-2.5 px-3 font-bold">AMOUNT</th>
                      <th className="py-2.5 px-3 font-bold">BASE_VERDICT</th>
                      <th className="py-2.5 px-3 font-bold">CANDIDATE_VERDICT</th>
                      <th className="py-2.5 px-3 font-bold">SCORE_DELTA</th>
                      <th className="py-2.5 px-3 font-bold">FIRED_SIGNALS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {report.discrepancies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white truncate max-w-[120px]">{item.transactionId}</td>
                        <td className="py-2.5 px-3 text-cyan-400 font-mono">{item.userId}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">${item.amount?.toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.baselineVerdict === 'ALLOW' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' :
                            item.baselineVerdict === 'REVIEW' ? 'bg-amber-950/80 text-amber-400 border-amber-500/40' :
                            'bg-rose-950/80 text-rose-400 border-rose-500/40'
                          }`}>
                            {item.baselineVerdict} ({item.baselineScore})
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.candidateVerdict === 'ALLOW' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' :
                            item.candidateVerdict === 'REVIEW' ? 'bg-amber-950/80 text-amber-400 border-amber-500/40' :
                            'bg-rose-950/80 text-rose-400 border-rose-500/40'
                          }`}>
                            {item.candidateVerdict} ({item.candidateScore})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white font-mono">
                          {item.scoreDelta > 0 ? `+${item.scoreDelta}` : item.scoreDelta} PTS
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.candidateFiredRules.map((ruleName, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-1.5 py-0.5 rounded bg-[#1c222e] text-neutral-300 text-[10px] border border-slate-700"
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
