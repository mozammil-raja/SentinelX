'use client';

import { useState } from 'react';
import { DecisionResponse } from '@/lib/api';
import { StreamStatus } from '@/hooks/useDecisionStream';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldX,
  Clock,
  Trash2,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  decisions: DecisionResponse[];
  status: StreamStatus;
  lastPing: string | null;
  onClear: () => void;
}

export function LiveTransactionFeed({ decisions, status, lastPing, onClear }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allowCount = decisions.filter((d) => d.decision === 'ALLOW').length;
  const reviewCount = decisions.filter((d) => d.decision === 'REVIEW').length;
  const blockCount = decisions.filter((d) => d.decision === 'BLOCK').length;
  const avgLatency =
    decisions.length > 0
      ? Math.round(decisions.reduce((acc, d) => acc + (d.evaluationTimeMs || 0), 0) / decisions.length)
      : 0;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
      {/* Header & Connection Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Real-Time Decision Stream (SSE)
              <span className="text-xs font-normal text-slate-400">({decisions.length} events)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Streaming live deterministic rule verdicts with async Google Gemini AI shadow benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-950">
            {status === 'CONNECTED' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-mono">LIVE STREAM</span>
                {lastPing && <span className="text-[10px] text-slate-500 font-mono hidden md:inline">({lastPing})</span>}
              </>
            ) : status === 'CONNECTING' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-400 font-mono">CONNECTING...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400 font-mono">DISCONNECTED</span>
              </>
            )}
          </div>

          {decisions.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear live feed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Mini-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Approved</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-emerald-400">{allowCount}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500/70" />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Flagged (Review)</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-amber-400">{reviewCount}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500/70" />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Blocked</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-red-400">{blockCount}</span>
            <ShieldX className="w-4 h-4 text-red-500/70" />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avg Latency</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-cyan-400">{avgLatency} ms</span>
            <Clock className="w-4 h-4 text-cyan-500/70" />
          </div>
        </div>
      </div>

      {/* Live Stream Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 sticky top-0 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800 z-10 backdrop-blur-sm">
            <tr>
              <th className="p-3">Verdict</th>
              <th className="p-3">Rule Score</th>
              <th className="p-3">Gemini AI Shadow</th>
              <th className="p-3">User &amp; Txn ID</th>
              <th className="p-3">Triggered Rules</th>
              <th className="p-3 text-right">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {decisions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                    <span>No transactions received yet. Click a preset above to simulate a transaction!</span>
                  </div>
                </td>
              </tr>
            ) : (
              decisions.map((d, index) => {
                const rowKey = d.decisionId || `${d.transactionId}-${index}`;
                const isExpanded = expandedId === rowKey;

                const verdictClass =
                  d.decision === 'ALLOW'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                    : d.decision === 'REVIEW'
                    ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                    : 'bg-red-950/80 text-red-400 border-red-800/60';

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-900/50 transition-colors animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold ${verdictClass}`}>
                        {d.decision}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{d.finalScore}</span>
                        <div className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              d.finalScore >= 70
                                ? 'bg-red-500'
                                : d.finalScore >= 30
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, d.finalScore)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Gemini AI Shadow Column */}
                    <td className="p-3 whitespace-nowrap">
                      {d.geminiScore !== undefined ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(rowKey)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-800/50 hover:border-purple-600 transition-colors text-left"
                        >
                          <Bot className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="font-bold text-purple-300">{d.geminiScore} pts</span>
                          <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[80px]">
                            ({d.geminiCategory || 'AI'})
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-purple-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-purple-400" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-purple-400/60 italic flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                          Benchmarking...
                        </span>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="font-sans font-medium text-slate-200">{d.userId}</div>
                      <div className="text-[10px] text-slate-500">{d.transactionId}</div>
                    </td>

                    <td className="p-3 text-slate-300 font-sans max-w-xs truncate">
                      {d.firedRules && d.firedRules.length > 0 ? (
                        <span className="text-amber-300/90 text-xs">{d.firedRules.join(', ')}</span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">None (Clean)</span>
                      )}

                      {/* Expandable Gemini AI Reasoning Drawer */}
                      {isExpanded && d.geminiReasoning && (
                        <div className="mt-2 p-2 rounded bg-purple-950/60 border border-purple-800/70 text-[11px] font-sans text-slate-200 space-y-1">
                          <div className="font-semibold text-purple-300 flex items-center gap-1">
                            <Bot className="w-3 h-3 text-purple-400" />
                            <span>Gemini AI Anomaly Rationale (Confidence: {((d.geminiConfidence || 0.9) * 100).toFixed(0)}%):</span>
                          </div>
                          <p className="text-slate-300">{d.geminiReasoning}</p>
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap text-cyan-400 font-bold">
                      {d.evaluationTimeMs ?? 0} ms
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
