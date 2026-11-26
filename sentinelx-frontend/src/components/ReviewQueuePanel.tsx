'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ReviewQueueItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ClipboardList,
  UserCheck,
  XCircle,
  RefreshCw,
  Bot,
} from 'lucide-react';

export function ReviewQueuePanel() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.reviews.getPending();
      setItems(data);
    } catch (err: unknown) {
      console.error('Failed to fetch review queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.reviews.getPending()
      .then((data) => {
        if (isMounted) setItems(data);
      })
      .catch((err: unknown) => {
        if (isMounted) console.error('Failed to fetch review queue:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleResolve = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setResolvingId(id);
    try {
      const reviewerId = user?.email || 'analyst@sentinelx.io';
      const notes = status === 'APPROVED' ? 'Cleared manual review by analyst.' : 'Confirmed fraudulent pattern.';
      await api.reviews.resolve(id, status, reviewerId, notes);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      console.error('Failed to resolve review item:', err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-5 space-y-4 font-mono text-white shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/20">
            <ClipboardList className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                COMPLIANCE_DISPATCH // HUMAN_REVIEW_QUEUE
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                items.length > 0
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                  : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
              }`}>
                [{items.length} PENDING]
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Human-in-the-loop triage terminal with AI copilot synthesis for transactions scoring in the review band (30–69).
            </p>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="p-2 rounded-lg bg-[#151922] hover:bg-slate-700 border border-slate-700/80 text-neutral-200 transition-colors shadow-sm"
          title="Reload review queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-slate-800 bg-[#151922] text-neutral-400 text-xs space-y-2">
          <ClipboardList className="w-8 h-8 mx-auto text-emerald-400/80" />
          <div className="text-white font-bold uppercase font-mono">[QUEUE_EMPTY] NO TRANSACTIONS REQUIRE TRIAGE</div>
          <p className="text-[11px] text-neutral-400 font-sans max-w-sm mx-auto">
            All evaluated payments are automatically cleared or blocked. Amber-tier transactions will be queued here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isResolving = resolvingId === item.id;
            const currencySymbol = item.currency === 'USD' ? '$' : '₹';

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#151922] border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between space-y-3.5 shadow-sm transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-cyan-400 bg-[#1c222e] px-2.5 py-1 rounded-lg border border-slate-700">
                      CASE_REF #{item.id}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      INITIAL_SCORE:{' '}
                      <span className="text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                        {item.initialScore}/100
                      </span>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-400 font-mono">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">TRANSACTION_AMOUNT:</span>
                      <span className="font-bold text-white">
                        {currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({item.currency})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">CUSTOMER_ID:</span>
                      <span className="text-cyan-400 font-mono">{item.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">TARGET_MERCHANT:</span>
                      <span className="text-white">{item.merchantId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">TRANSACTION_ID:</span>
                      <span className="text-neutral-300 text-[11px] truncate max-w-[170px]">{item.transactionId}</span>
                    </div>
                  </div>

                  {/* AI Risk Copilot Analysis Block */}
                  {item.aiAnalysis && (
                    <div className="p-3 rounded-lg bg-[#1c222e] border border-cyan-500/30 space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                        <span>AI_COPILOT_SYNTHESIS</span>
                      </div>
                      <p className="text-neutral-200 font-sans leading-relaxed text-[11px]">
                        {item.aiAnalysis}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center gap-2.5">
                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'APPROVED')}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-emerald-900/40 disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>APPROVE &amp; TRUST</span>
                  </button>

                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'REJECTED')}
                    className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-rose-900/40 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>CONFIRM_BLOCK</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
