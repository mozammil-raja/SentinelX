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
    <div className="space-y-5 font-mono">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E1219] border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
            <FlaskConical className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                POLICY_SANDBOX // HISTORICAL_BACKTEST_STUDIO
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                DRY_RUN
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Simulate rule weight reconfigurations against historical transactions in an isolated zero-risk replay engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleResetSliders}
            className="px-3 py-1.5 rounded bg-[#090C10] hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
          <button
            onClick={() => handleRunSimulation()}
            disabled={loading}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-bold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{loading ? 'REPLAYING_BATCH...' : 'EXECUTE_BACKTEST'}</span>
          </button>
        </div>
      </div>

      {/* Dataset & Candidate Rule Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Dataset Selection */}
        <div className="space-y-4">
          <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>01 // SELECT REPLAY DATASET</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDatasetSource('SAMPLE_BENCHMARK')}
                className={`w-full p-2.5 rounded border text-left transition-colors flex items-start gap-2.5 ${
                  datasetSource === 'SAMPLE_BENCHMARK'
                    ? 'bg-slate-800/80 border-blue-500 text-slate-100'
                    : 'bg-[#090C10] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Activity className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase">STANDARD_BENCHMARK (250 TXNS)</div>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Pre-seeded test matrix covering velocity bursts, VPN hops, luxury transfers, and dark merchants.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('DATABASE_RANGE')}
                className={`w-full p-2.5 rounded border text-left transition-colors flex items-start gap-2.5 ${
                  datasetSource === 'DATABASE_RANGE'
                    ? 'bg-slate-800/80 border-blue-500 text-slate-100'
                    : 'bg-[#090C10] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase">POSTGRESQL_AUDIT_LOG</div>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Replay actual historical transactions recorded in your PostgreSQL database instance.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('CUSTOM_PAYLOAD')}
                className={`w-full p-2.5 rounded border text-left transition-colors flex items-start gap-2.5 ${
                  datasetSource === 'CUSTOM_PAYLOAD'
                    ? 'bg-slate-800/80 border-blue-500 text-slate-100'
                    : 'bg-[#090C10] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileCode className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase">CUSTOM_JSON_PAYLOAD</div>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Paste an array of custom transaction request objects to test arbitrary attack vectors.
                  </div>
                </div>
              </button>
            </div>

            {datasetSource === 'CUSTOM_PAYLOAD' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-[10px] text-slate-400 uppercase">CUSTOM_TRANSACTION_ARRAY (JSON):</label>
                <textarea
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  placeholder={`[\n  {\n    "userId": "usr_sarah",\n    "amount": 12000.00,\n    "currency": "USD",\n    "merchantId": "mer_luxury"\n  }\n]`}
                  rows={4}
                  className={`w-full bg-[#090C10] text-xs p-2 rounded border focus:outline-none ${
                    isCustomValid ? 'border-slate-800 focus:border-blue-500' : 'border-red-500 text-red-300'
                  }`}
                />
                {!isCustomValid && <p className="text-[10px] text-red-400">[SYNTAX_ERROR] Invalid JSON array format.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Candidate Rule Sliders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>02 // CONFIGURE CANDIDATE POLICY WEIGHTS</span>
              </h3>
              <span className="text-[10px] text-slate-500">ADJUST WEIGHTS &amp; COMPARE SHIFT</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rules.map((rule) => {
                const currentWeight = candidateWeights[rule.id] ?? rule.weight;
                const isEnabled = candidateToggles[rule.id] ?? rule.isActive;
                const delta = currentWeight - rule.weight;

                return (
                  <div
                    key={rule.id}
                    className={`p-3 rounded border transition-colors ${
                      isEnabled ? 'bg-[#090C10] border-slate-800' : 'bg-[#090C10]/40 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-blue-400">{rule.id}</span>
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px] uppercase">{rule.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleChange(rule.id)}
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold transition-colors ${
                          isEnabled ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {isEnabled ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">WEIGHT:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">{rule.weight} PTS</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="text-slate-200 font-bold">{currentWeight} PTS</span>
                          {delta !== 0 && (
                            <span className={`text-[10px] font-bold ${delta > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
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
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                BATCH_PROCESSED
              </span>
              <div className="text-xl font-bold text-slate-100 mt-0.5">{report.totalTransactions} TXNS</div>
              <div className="text-[10px] text-slate-500 mt-0.5">REPLAYED IN {report.simulationDurationMs}MS</div>
            </div>

            <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ALLOW_VERDICTS
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-xl font-bold text-emerald-400">{report.candidate.allowCount}</div>
                <div className="text-[11px] text-slate-400">({report.candidate.allowPercentage}%)</div>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                <span>BASE: {report.baseline.allowCount}</span>
                <span className="text-emerald-400 font-bold ml-1">
                  ({report.distributionShift.ALLOW >= 0 ? `+${report.distributionShift.ALLOW}` : report.distributionShift.ALLOW})
                </span>
              </div>
            </div>

            <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                REVIEW_FLAGGED
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-xl font-bold text-amber-400">{report.candidate.reviewCount}</div>
                <div className="text-[11px] text-slate-400">({report.candidate.reviewPercentage}%)</div>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                <span>BASE: {report.baseline.reviewCount}</span>
                <span className="text-amber-400 font-bold ml-1">
                  ({report.distributionShift.REVIEW >= 0 ? `+${report.distributionShift.REVIEW}` : report.distributionShift.REVIEW})
                </span>
              </div>
            </div>

            <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                BLOCKED_FRAUD
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-xl font-bold text-red-400">{report.candidate.blockCount}</div>
                <div className="text-[11px] text-slate-400">({report.candidate.blockPercentage}%)</div>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                <span>BASE: {report.baseline.blockCount}</span>
                <span className="text-red-400 font-bold ml-1">
                  ({report.distributionShift.BLOCK >= 0 ? `+${report.distributionShift.BLOCK}` : report.distributionShift.BLOCK})
                </span>
              </div>
            </div>
          </div>

          {/* Distribution Shift Visualizer Bar */}
          <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>POLICY_DISTRIBUTION_DELTA (BASELINE vs CANDIDATE)</span>
              </h4>
              <div className="text-slate-400">
                {report.discrepancyCount} TOTAL SHIFTS (
                <span className={report.blockRateShiftPercentage >= 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {report.blockRateShiftPercentage >= 0 ? `+${report.blockRateShiftPercentage}%` : `${report.blockRateShiftPercentage}%`} BLOCK_DELTA
                </span>
                )
              </div>
            </div>

            {/* Visual stacked bars */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>BASELINE_POLICY</span>
                  <span>
                    ALLOW {report.baseline.allowCount} | REVIEW {report.baseline.reviewCount} | BLOCK {report.baseline.blockCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded overflow-hidden flex bg-[#090C10] border border-slate-800">
                  <div style={{ width: `${report.baseline.allowPercentage}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${report.baseline.reviewPercentage}%` }} className="bg-amber-500" />
                  <div style={{ width: `${report.baseline.blockPercentage}%` }} className="bg-red-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-300 font-bold mb-1">
                  <span className="text-blue-400">CANDIDATE_POLICY (PROPOSED)</span>
                  <span>
                    ALLOW {report.candidate.allowCount} | REVIEW {report.candidate.reviewCount} | BLOCK {report.candidate.blockCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded overflow-hidden flex bg-[#090C10] border border-blue-800">
                  <div style={{ width: `${report.candidate.allowPercentage}%` }} className="bg-emerald-400" />
                  <div style={{ width: `${report.candidate.reviewPercentage}%` }} className="bg-amber-400" />
                  <div style={{ width: `${report.candidate.blockPercentage}%` }} className="bg-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Discrepancy Drilldown Table */}
          <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <h4 className="font-bold text-slate-200 uppercase">TRANSACTION_DISCREPANCY_AUDIT (TOP {report.discrepancies.length})</h4>
              <span className="text-[10px] text-slate-500">TRANSACTIONS WITH ALTERED VERDICTS</span>
            </div>

            {report.discrepancies.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-slate-800 rounded bg-[#090C10]">
                [ZERO_DISCREPANCIES] Candidate weights produced identical verdicts across all evaluated records.
              </div>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-800 bg-[#090C10]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-[#0E1219] text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3 font-semibold">TXN_ID</th>
                      <th className="py-2 px-3 font-semibold">USER</th>
                      <th className="py-2 px-3 font-semibold">AMOUNT</th>
                      <th className="py-2 px-3 font-semibold">BASE_VERDICT</th>
                      <th className="py-2 px-3 font-semibold">CANDIDATE_VERDICT</th>
                      <th className="py-2 px-3 font-semibold">SCORE_DELTA</th>
                      <th className="py-2 px-3 font-semibold">FIRED_SIGNALS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {report.discrepancies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-300">{item.transactionId}</td>
                        <td className="py-2 px-3 text-slate-400">{item.userId}</td>
                        <td className="py-2 px-3 font-semibold text-slate-200">${item.amount?.toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                              item.baselineVerdict === 'ALLOW'
                                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                                : item.baselineVerdict === 'REVIEW'
                                ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                                : 'bg-red-950/40 text-red-400 border-red-800/60'
                            }`}
                          >
                            {item.baselineVerdict} ({item.baselineScore})
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                              item.candidateVerdict === 'ALLOW'
                                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                                : item.candidateVerdict === 'REVIEW'
                                ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                                : 'bg-red-950/40 text-red-400 border-red-800/60'
                            }`}
                          >
                            {item.candidateVerdict} ({item.candidateScore})
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold">
                          <span className={item.scoreDelta > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {item.scoreDelta > 0 ? `+${item.scoreDelta}` : item.scoreDelta} PTS
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.candidateFiredRules.map((ruleName, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-1 py-0.2 rounded bg-slate-900 text-blue-300 text-[10px] border border-slate-800"
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
