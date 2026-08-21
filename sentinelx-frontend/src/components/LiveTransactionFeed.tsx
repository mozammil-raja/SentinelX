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
    <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-5 space-y-4 font-mono">
      {/* Header & Connection Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                TELEMETRY_LOG // REAL_TIME_DECISION_STREAM
              </h2>
              <span className="text-[10px] text-slate-400">
                [{decisions.length} EVENTS]
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Live server-sent events (SSE) pipeline with async AI shadow benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-800 bg-[#090C10]">
            {status === 'CONNECTED' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-400 font-semibold">STREAM: CONNECTED</span>
                {lastPing && <span className="text-[10px] text-slate-500 hidden md:inline">({lastPing})</span>}
              </>
            ) : status === 'CONNECTING' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-400 font-semibold">STREAM: CONNECTING...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-red-400 font-semibold">STREAM: DISCONNECTED</span>
              </>
            )}
          </div>

          {decisions.length > 0 && (
            <button
              onClick={onClear}
              className="p-1 rounded bg-[#090C10] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear telemetry feed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Mini-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">ALLOW_VERDICTS</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-emerald-400">{allowCount}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500/70" />
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">REVIEW_FLAGGED</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-amber-400">{reviewCount}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500/70" />
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">BLOCKED_FRAUD</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-red-400">{blockCount}</span>
            <ShieldAlert className="w-4 h-4 text-red-500/70" />
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">AVG_LATENCY</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-blue-400">{avgLatency} ms</span>
            <Clock className="w-4 h-4 text-blue-500/70" />
          </div>
        </div>
      </div>

      {/* Live Stream Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded border border-slate-800 bg-[#090C10]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0E1219] text-slate-400 sticky top-0 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800 z-10">
            <tr>
              <th className="p-2.5">VERDICT</th>
              <th className="p-2.5">SCORE</th>
              <th className="p-2.5">SHADOW_AI</th>
              <th className="p-2.5">ENTITY / TXN</th>
              <th className="p-2.5">SIGNALS</th>
              <th className="p-2.5 text-right">LATENCY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {decisions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                  <div className="flex flex-col items-center gap-1.5">
                    <Activity className="w-6 h-6 text-slate-700" />
                    <span>Awaiting incoming transactions. Trigger an evaluation above to stream telemetry.</span>
                  </div>
                </td>
              </tr>
            ) : (
              decisions.map((d, index) => {
                const rowKey = `${d.decisionId || d.transactionId || 'row'}-${index}`;
                const isExpanded = expandedId === rowKey;

                const verdictBadge =
                  d.decision === 'ALLOW'
                    ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40'
                    : d.decision === 'REVIEW'
                    ? 'text-amber-400 border-amber-800/80 bg-amber-950/40'
                    : 'text-red-400 border-red-800/80 bg-red-950/40';

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-900/60 transition-colors"
                  >
                    <td className="p-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${verdictBadge}`}>
                        [{d.decision}]
                      </span>
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{d.finalScore}</span>
                        <div className="w-8 h-1 rounded bg-slate-800 overflow-hidden">
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
                    <td className="p-2.5 whitespace-nowrap">
                      {d.geminiScore !== undefined ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(rowKey)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-left"
                        >
                          <Bot className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="font-semibold text-slate-200">{d.geminiScore} PTS</span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline truncate max-w-[80px]">
                            ({d.geminiCategory || 'AI'})
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                          SHADOW_SCORING...
                        </span>
                      )}
                    </td>

                    <td className="p-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{d.userId}</div>
                      <div className="text-[10px] text-slate-500">{d.transactionId}</div>
                    </td>

                    <td className="p-2.5 text-slate-300 max-w-xs truncate">
                      {d.firedRules && d.firedRules.length > 0 ? (
                        <span className="text-amber-400 text-[11px]">{d.firedRules.join(' | ')}</span>
                      ) : (
                        <span className="text-slate-600 text-[11px] italic">NONE (CLEAN)</span>
                      )}

                      {/* Expandable Gemini AI Reasoning Drawer */}
                      {isExpanded && d.geminiReasoning && (
                        <div className="mt-2 p-2 rounded bg-[#0E1219] border border-slate-800 text-[11px] font-sans text-slate-300 space-y-1">
                          <div className="font-mono text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                            <Bot className="w-3 h-3 text-blue-400" />
                            <span>GEMINI_AI_REASONING (CONFIDENCE: {((d.geminiConfidence || 0.9) * 100).toFixed(0)}%):</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{d.geminiReasoning}</p>
                        </div>
                      )}
                    </td>

                    <td className="p-2.5 text-right whitespace-nowrap text-blue-400 font-bold">
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
