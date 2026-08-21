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
    <div className="bg-[#353535] border border-white rounded-lg p-5 space-y-4 font-mono text-white">
      {/* Header & Connection Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                TELEMETRY_LOG // REAL_TIME_DECISION_STREAM
              </h2>
              <span className="text-[10px] text-neutral-300">
                [{decisions.length} EVENTS]
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-sans mt-0.5">
              Live server-sent events (SSE) pipeline with async AI shadow benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-white bg-[#353535]">
            {status === 'CONNECTED' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="text-white font-bold">STREAM: CONNECTED</span>
                {lastPing && <span className="text-[10px] text-neutral-300 hidden md:inline">({lastPing})</span>}
              </>
            ) : status === 'CONNECTING' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" />
                <span className="text-neutral-200 font-bold">STREAM: CONNECTING...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full border border-white" />
                <span className="text-neutral-300 font-bold">STREAM: DISCONNECTED</span>
              </>
            )}
          </div>

          {decisions.length > 0 && (
            <button
              onClick={onClear}
              className="p-1 rounded bg-white text-black hover:bg-neutral-200 border border-white font-bold transition-colors"
              title="Clear telemetry feed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Mini-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded bg-[#353535] border border-white">
          <span className="text-[10px] text-neutral-300 uppercase tracking-wider">ALLOW_VERDICTS</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-white">{allowCount}</span>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#353535] border border-white">
          <span className="text-[10px] text-neutral-300 uppercase tracking-wider">REVIEW_FLAGGED</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-white">{reviewCount}</span>
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#353535] border border-white">
          <span className="text-[10px] text-neutral-300 uppercase tracking-wider">BLOCKED_FRAUD</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-white">{blockCount}</span>
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#353535] border border-white">
          <span className="text-[10px] text-neutral-300 uppercase tracking-wider">AVG_LATENCY</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-bold text-white">{avgLatency} ms</span>
            <Clock className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Live Stream Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded border border-white bg-[#353535]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#353535] text-white sticky top-0 uppercase tracking-wider text-[10px] font-bold border-b border-white z-10">
            <tr>
              <th className="p-2.5">VERDICT</th>
              <th className="p-2.5">SCORE</th>
              <th className="p-2.5">SHADOW_AI</th>
              <th className="p-2.5">ENTITY / TXN</th>
              <th className="p-2.5">SIGNALS</th>
              <th className="p-2.5 text-right">LATENCY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {decisions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-300 font-sans">
                  <div className="flex flex-col items-center gap-1.5">
                    <Activity className="w-6 h-6 text-white" />
                    <span>Awaiting incoming transactions. Trigger an evaluation above to stream telemetry.</span>
                  </div>
                </td>
              </tr>
            ) : (
              decisions.map((d, index) => {
                const rowKey = `${d.decisionId || d.transactionId || 'row'}-${index}`;
                const isExpanded = expandedId === rowKey;

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-white/10 transition-colors"
                  >
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded border border-white text-[10px] font-bold text-white">
                        [{d.decision}]
                      </span>
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{d.finalScore}</span>
                        <div className="w-8 h-1.5 rounded bg-[#2a2a2a] border border-white overflow-hidden">
                          <div
                            className="h-full bg-white"
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
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white text-black font-bold hover:bg-neutral-200 border border-white transition-colors text-left"
                        >
                          <Bot className="w-3 h-3 text-black shrink-0" />
                          <span>{d.geminiScore} PTS</span>
                          <span className="text-[10px] text-neutral-800 hidden sm:inline truncate max-w-[80px]">
                            ({d.geminiCategory || 'AI'})
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-black" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-black" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-300 italic flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          SHADOW_SCORING...
                        </span>
                      )}
                    </td>

                    <td className="p-2.5 whitespace-nowrap">
                      <div className="font-bold text-white">{d.userId}</div>
                      <div className="text-[10px] text-neutral-300">{d.transactionId}</div>
                    </td>

                    <td className="p-2.5 text-neutral-200 max-w-xs truncate">
                      {d.firedRules && d.firedRules.length > 0 ? (
                        <span className="text-white font-bold text-[11px]">{d.firedRules.join(' | ')}</span>
                      ) : (
                        <span className="text-neutral-400 text-[11px] italic">NONE (CLEAN)</span>
                      )}

                      {/* Expandable Gemini AI Reasoning Drawer */}
                      {isExpanded && d.geminiReasoning && (
                        <div className="mt-2 p-2.5 rounded bg-[#353535] border border-white text-[11px] font-sans text-neutral-200 space-y-1">
                          <div className="font-mono text-[10px] text-white font-bold flex items-center gap-1">
                            <Bot className="w-3 h-3 text-white" />
                            <span>GEMINI_AI_REASONING (CONFIDENCE: {((d.geminiConfidence || 0.9) * 100).toFixed(0)}%):</span>
                          </div>
                          <p className="text-white text-[11px]">{d.geminiReasoning}</p>
                        </div>
                      )}
                    </td>

                    <td className="p-2.5 text-right whitespace-nowrap text-white font-bold">
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
