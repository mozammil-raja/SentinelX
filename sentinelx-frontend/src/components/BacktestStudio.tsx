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
    <div className="space-y-5 font-mono text-white">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#353535] border border-white rounded-lg p-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                POLICY_SANDBOX // HISTORICAL_BACKTEST_STUDIO
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded border border-white text-white">
                DRY_RUN
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-sans mt-0.5">
              Simulate rule weight reconfigurations against historical transactions in an isolated zero-risk replay engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleResetSliders}
            className="px-3 py-1.5 rounded bg-transparent hover:bg-white/10 text-white flex items-center gap-1.5 transition-colors border border-white font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
          <button
            onClick={() => handleRunSimulation()}
            disabled={loading}
            className="px-4 py-1.5 rounded bg-white hover:bg-neutral-200 active:bg-neutral-300 font-bold text-black flex items-center gap-1.5 transition-colors border border-white disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-black" />
            )}
            <span>{loading ? 'REPLAYING_BATCH...' : 'EXECUTE_BACKTEST'}</span>
          </button>
        </div>
      </div>

      {/* Dataset & Candidate Rule Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Dataset Selection */}
        <div className="space-y-4">
          <div className="bg-[#353535] border border-white rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-white" />
              <span>01 // SELECT REPLAY DATASET</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDatasetSource('SAMPLE_BENCHMARK')}
                className={`w-full p-2.5 rounded border text-left transition-colors flex items-start gap-2.5 ${
                  datasetSource === 'SAMPLE_BENCHMARK'
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-[#353535] border-white text-white hover:bg-white/10'
                }`}
              >
                <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase">STANDARD_BENCHMARK (250 TXNS)</div>
                  <div className={`text-[11px] font-sans mt-0.5 ${datasetSource === 'SAMPLE_BENCHMARK' ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>
                    Pre-seeded test matrix covering velocity bursts, VPN hops, luxury transfers, and dark merchants.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('DATABASE_RANGE')}
                className={`w-full p-2.5 rounded border text-left transition-colors flex items-start gap-2.5 ${
                  datasetSource === 'DATABASE_RANGE'
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-[#353535] border-white text-white hover:bg-white/10'
                }`}
              >
                <Database className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase">POSTGRESQL_AUDIT_LOG</div>
                  <div className={`text-[11px] font-sans mt-0.5 ${datasetSource === 'DATABASE_RANGE' ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>
                    Replay actual historical transactions recorded in your PostgreSQL database instance.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetSource('CUSTOM_PAYLOAD')}
                className={`w-full p-2.5 rounded border text-left transition-colors flex items-start gap-2.5 ${
                  datasetSource === 'CUSTOM_PAYLOAD'
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-[#353535] border-white text-white hover:bg-white/10'
                }`}
              >
                <FileCode className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase">CUSTOM_JSON_PAYLOAD</div>
                  <div className={`text-[11px] font-sans mt-0.5 ${datasetSource === 'CUSTOM_PAYLOAD' ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>
                    Paste an array of custom transaction request objects to test arbitrary attack vectors.
                  </div>
                </div>
              </button>
            </div>

            {datasetSource === 'CUSTOM_PAYLOAD' && (
              <div className="space-y-1.5 pt-2 border-t border-white">
                <label className="text-[10px] text-neutral-300 uppercase">CUSTOM_TRANSACTION_ARRAY (JSON):</label>
                <textarea
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  placeholder={`[\n  {\n    "userId": "usr_sarah",\n    "amount": 12000.00,\n    "currency": "USD",\n    "merchantId": "mer_luxury"\n  }\n]`}
                  rows={4}
                  className={`w-full bg-[#353535] text-xs p-2 rounded border focus:outline-none ${
                    isCustomValid ? 'border-white text-white focus:ring-1 focus:ring-white' : 'border-white text-white'
                  }`}
                />
                {!isCustomValid && <p className="text-[10px] text-white">[SYNTAX_ERROR] Invalid JSON array format.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Candidate Rule Sliders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#353535] border border-white rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-white">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
                <span>02 // CONFIGURE CANDIDATE POLICY WEIGHTS</span>
              </h3>
              <span className="text-[10px] text-neutral-300">ADJUST WEIGHTS &amp; COMPARE SHIFT</span>
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
                      isEnabled ? 'bg-[#353535] border-white text-white' : 'bg-[#353535]/60 border-white/60 opacity-60 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-black bg-white px-1.5 py-0.2 rounded border border-white">{rule.id}</span>
                        <span className="text-xs font-semibold text-white truncate max-w-[140px] uppercase">{rule.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleChange(rule.id)}
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold transition-colors border ${
                          isEnabled ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white'
                        }`}
                      >
                        {isEnabled ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300">WEIGHT:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-300">{rule.weight} PTS</span>
                          <ArrowRight className="w-3 h-3 text-white" />
                          <span className="text-white font-bold">{currentWeight} PTS</span>
                          {delta !== 0 && (
                            <span className="text-[10px] font-bold text-white">
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
                        className="w-full h-1.5 bg-[#2a2a2a] rounded appearance-none cursor-pointer accent-white"
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
            <div className="bg-[#353535] border border-white rounded-lg p-3">
              <span className="text-[10px] text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-white" />
                BATCH_PROCESSED
              </span>
              <div className="text-xl font-bold text-white mt-0.5">{report.totalTransactions} TXNS</div>
              <div className="text-[10px] text-neutral-300 mt-0.5">REPLAYED IN {report.simulationDurationMs}MS</div>
            </div>

            <div className="bg-[#353535] border border-white rounded-lg p-3">
              <span className="text-[10px] text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ALLOW_VERDICTS
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-xl font-bold text-white">{report.candidate.allowCount}</div>
                <div className="text-[11px] text-neutral-300">({report.candidate.allowPercentage}%)</div>
              </div>
              <div className="text-[10px] text-neutral-300 mt-0.5">
                <span>BASE: {report.baseline.allowCount}</span>
                <span className="text-white font-bold ml-1">
                  ({report.distributionShift.ALLOW >= 0 ? `+${report.distributionShift.ALLOW}` : report.distributionShift.ALLOW})
                </span>
              </div>
            </div>

            <div className="bg-[#353535] border border-white rounded-lg p-3">
              <span className="text-[10px] text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                REVIEW_FLAGGED
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-xl font-bold text-white">{report.candidate.reviewCount}</div>
                <div className="text-[11px] text-neutral-300">({report.candidate.reviewPercentage}%)</div>
              </div>
              <div className="text-[10px] text-neutral-300 mt-0.5">
                <span>BASE: {report.baseline.reviewCount}</span>
                <span className="text-white font-bold ml-1">
                  ({report.distributionShift.REVIEW >= 0 ? `+${report.distributionShift.REVIEW}` : report.distributionShift.REVIEW})
                </span>
              </div>
            </div>

            <div className="bg-[#353535] border border-white rounded-lg p-3">
              <span className="text-[10px] text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-white" />
                BLOCKED_FRAUD
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-xl font-bold text-white">{report.candidate.blockCount}</div>
                <div className="text-[11px] text-neutral-300">({report.candidate.blockPercentage}%)</div>
              </div>
              <div className="text-[10px] text-neutral-300 mt-0.5">
                <span>BASE: {report.baseline.blockCount}</span>
                <span className="text-white font-bold ml-1">
                  ({report.distributionShift.BLOCK >= 0 ? `+${report.distributionShift.BLOCK}` : report.distributionShift.BLOCK})
                </span>
              </div>
            </div>
          </div>

          {/* Distribution Shift Visualizer Bar */}
          <div className="bg-[#353535] border border-white rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <h4 className="font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
                <span>POLICY_DISTRIBUTION_DELTA (BASELINE vs CANDIDATE)</span>
              </h4>
              <div className="text-neutral-200">
                {report.discrepancyCount} TOTAL SHIFTS (
                <span className="text-white font-bold">
                  {report.blockRateShiftPercentage >= 0 ? `+${report.blockRateShiftPercentage}%` : `${report.blockRateShiftPercentage}%`} BLOCK_DELTA
                </span>
                )
              </div>
            </div>

            {/* Visual stacked bars */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex justify-between text-[10px] text-neutral-300 mb-1">
                  <span>BASELINE_POLICY</span>
                  <span>
                    ALLOW {report.baseline.allowCount} | REVIEW {report.baseline.reviewCount} | BLOCK {report.baseline.blockCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded overflow-hidden flex bg-[#2a2a2a] border border-white">
                  <div style={{ width: `${report.baseline.allowPercentage}%` }} className="bg-white" />
                  <div style={{ width: `${report.baseline.reviewPercentage}%` }} className="bg-neutral-400" />
                  <div style={{ width: `${report.baseline.blockPercentage}%` }} className="bg-neutral-600" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-white font-bold mb-1">
                  <span>CANDIDATE_POLICY (PROPOSED)</span>
                  <span>
                    ALLOW {report.candidate.allowCount} | REVIEW {report.candidate.reviewCount} | BLOCK {report.candidate.blockCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded overflow-hidden flex bg-[#2a2a2a] border border-white">
                  <div style={{ width: `${report.candidate.allowPercentage}%` }} className="bg-white" />
                  <div style={{ width: `${report.candidate.reviewPercentage}%` }} className="bg-neutral-400" />
                  <div style={{ width: `${report.candidate.blockPercentage}%` }} className="bg-neutral-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Discrepancy Drilldown Table */}
          <div className="bg-[#353535] border border-white rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <h4 className="font-bold text-white uppercase">TRANSACTION_DISCREPANCY_AUDIT (TOP {report.discrepancies.length})</h4>
              <span className="text-[10px] text-neutral-300">TRANSACTIONS WITH ALTERED VERDICTS</span>
            </div>

            {report.discrepancies.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-300 border border-white rounded bg-[#353535]">
                [ZERO_DISCREPANCIES] Candidate weights produced identical verdicts across all evaluated records.
              </div>
            ) : (
              <div className="overflow-x-auto rounded border border-white bg-[#353535]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white text-white bg-[#353535] text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2 px-3 font-bold">TXN_ID</th>
                      <th className="py-2 px-3 font-bold">USER</th>
                      <th className="py-2 px-3 font-bold">AMOUNT</th>
                      <th className="py-2 px-3 font-bold">BASE_VERDICT</th>
                      <th className="py-2 px-3 font-bold">CANDIDATE_VERDICT</th>
                      <th className="py-2 px-3 font-bold">SCORE_DELTA</th>
                      <th className="py-2 px-3 font-bold">FIRED_SIGNALS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/40">
                    {report.discrepancies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/10 transition-colors">
                        <td className="py-2 px-3 font-semibold text-white">{item.transactionId}</td>
                        <td className="py-2 px-3 text-neutral-200">{item.userId}</td>
                        <td className="py-2 px-3 font-semibold text-white">${item.amount?.toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold border border-white text-white">
                            {item.baselineVerdict} ({item.baselineScore})
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold border border-white text-white">
                            {item.candidateVerdict} ({item.candidateScore})
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-white">
                          {item.scoreDelta > 0 ? `+${item.scoreDelta}` : item.scoreDelta} PTS
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.candidateFiredRules.map((ruleName, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-1 py-0.2 rounded bg-[#353535] text-white text-[10px] border border-white"
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
