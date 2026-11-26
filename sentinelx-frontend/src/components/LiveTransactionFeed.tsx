'use client';

import { useState } from 'react';
import { DecisionResponse } from '@/lib/api';
import { StreamStatus } from '@/hooks/useDecisionStream';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
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
    <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-5 space-y-4 font-mono text-white shadow-sm">
      {/* Header & Connection Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-500/20">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                TELEMETRY_LOG // REAL_TIME_DECISION_STREAM
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#151922] text-cyan-400 border border-slate-700 font-bold">
                {decisions.length} EVENTS
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Live server-sent events (SSE) pipeline with async AI shadow benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-[#151922]">
            {status === 'CONNECTED' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">STREAM: CONNECTED</span>
                {lastPing && <span className="text-[10px] text-neutral-400 hidden md:inline">({lastPing})</span>}
              </>
            ) : status === 'CONNECTING' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-300 font-bold">STREAM: CONNECTING...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-400 font-bold">STREAM: DISCONNECTED</span>
              </>
            )}
          </div>

          {decisions.length > 0 && (
            <button
              onClick={onClear}
              className="p-2 rounded-lg bg-[#151922] hover:bg-slate-700 text-neutral-300 hover:text-white border border-slate-700/80 transition-colors shadow-sm"
              title="Clear telemetry feed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Mini-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">ALLOW_VERDICTS</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-emerald-400">{allowCount}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">REVIEW_FLAGGED</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-amber-400">{reviewCount}</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] text-rose-400 uppercase tracking-wider font-bold">BLOCKED_FRAUD</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-rose-400">{blockCount}</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
          <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">AVG_LATENCY</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-bold text-cyan-400">{avgLatency} ms</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Live Stream Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-slate-800/80 bg-[#151922]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#11141a] text-neutral-400 sticky top-0 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800 z-10">
            <tr>
              <th className="p-3">VERDICT</th>
              <th className="p-3">SCORE</th>
              <th className="p-3">SHADOW_AI</th>
              <th className="p-3">ENTITY / TXN</th>
              <th className="p-3">SIGNALS</th>
              <th className="p-3 text-right">LATENCY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {decisions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-400 font-sans">
                  <div className="flex flex-col items-center gap-1.5">
                    <Activity className="w-6 h-6 text-neutral-500 animate-pulse" />
                    <span>Awaiting incoming transactions. Trigger an evaluation above to stream telemetry.</span>
                  </div>
                </td>
              </tr>
            ) : (
              decisions.map((d, index) => {
                const rowKey = `${d.decisionId || d.transactionId || 'row'}-${index}`;
                const isExpanded = expandedId === rowKey;
                const isAllow = d.decision === 'ALLOW';
                const isReview = d.decision === 'REVIEW';

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isAllow ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' :
                        isReview ? 'bg-amber-950/80 border-amber-500/40 text-amber-400' :
                        'bg-rose-950/80 border-rose-500/40 text-rose-400'
                      }`}>
                        [{d.decision}]
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{d.finalScore}</span>
                        <div className="w-12 h-1.5 rounded-full bg-[#11141a] overflow-hidden">
                          <div
                            className={`h-full ${
                              d.finalScore < 30 ? 'bg-emerald-400' :
                              d.finalScore < 70 ? 'bg-amber-400' : 'bg-rose-400'
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
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 font-bold border border-cyan-500/40 transition-colors text-left"
                        >
                          <Bot className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{d.geminiScore} PTS</span>
                          <span className="text-[10px] text-cyan-200 hidden sm:inline truncate max-w-[80px]">
                            ({d.geminiCategory || 'AI'})
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-cyan-400" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          ASYNC_QUEUED
                        </span>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap font-mono">
                      <div className="font-bold text-white">{d.userId}</div>
                      <div className="text-[10px] text-neutral-400 truncate max-w-[140px]">{d.transactionId}</div>
                    </td>

                    <td className="p-3 text-neutral-300 max-w-xs truncate font-mono">
                      {d.firedRules && d.firedRules.length > 0 ? (
                        <span className="text-white font-semibold text-[11px]">{d.firedRules.join(' | ')}</span>
                      ) : (
                        <span className="text-emerald-400 text-[11px] font-semibold">NONE (CLEAN)</span>
                      )}

                      {/* Expandable Gemini AI Reasoning Drawer */}
                      {isExpanded && d.geminiReasoning && (
                        <div className="mt-2 p-3 rounded-lg bg-[#1c222e] border border-cyan-500/40 text-[11px] font-sans text-neutral-200 space-y-1 shadow-lg">
                          <div className="font-mono text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-cyan-400" />
                            <span>GEMINI_AI_REASONING (CONFIDENCE: {((d.geminiConfidence ?? 0) * 100).toFixed(0)}%):</span>
                          </div>
                          <p className="text-neutral-200 text-[11px] leading-relaxed">{d.geminiReasoning}</p>
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap text-white font-bold font-mono">
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
