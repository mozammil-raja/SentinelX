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
    } catch (err) {
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
      .catch((err) => {
        console.error('Failed to fetch review queue:', err);
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
    } catch (err) {
      console.error('Failed to resolve review item:', err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-5 space-y-4 font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
            <ClipboardList className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                COMPLIANCE_DISPATCH // HUMAN_REVIEW_QUEUE
              </h2>
              <span className="text-[10px] text-slate-400">
                [{items.length} PENDING]
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Human-in-the-loop investigation terminal with GenAI Copilot synthesis for transactions scoring 30–69
            </p>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="p-1 rounded bg-[#090C10] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reload review queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 rounded border border-slate-800 bg-[#090C10] text-slate-500 text-xs">
          <ClipboardList className="w-6 h-6 mx-auto mb-2 text-slate-700" />
          <span>[QUEUE_EMPTY] No transactions currently require human analyst clearance.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const isResolving = resolvingId === item.id;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded bg-[#090C10] border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                      CASE_REF #{item.id}
                    </span>
                    <span className="text-xs text-slate-400">INITIAL_SCORE: <span className="text-slate-200 font-bold">{item.initialScore}/100</span></span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>TRANSACTION_AMOUNT:</span>
                      <span className="font-bold text-slate-100">${item.amount.toFixed(2)} {item.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CUSTOMER_ID:</span>
                      <span className="text-slate-200">{item.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TARGET_MERCHANT:</span>
                      <span className="text-slate-200">{item.merchantId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TRANSACTION_ID:</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[160px]">{item.transactionId}</span>
                    </div>
                  </div>

                  {/* AI Risk Copilot Analysis Block */}
                  {item.aiAnalysis && (
                    <div className="p-2.5 rounded bg-[#0E1219] border border-slate-800 space-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI_COPILOT_SYNTHESIS</span>
                      </div>
                      <p className="text-slate-300 font-sans leading-relaxed text-[11px]">
                        {item.aiAnalysis}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex items-center gap-2">
                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'APPROVED')}
                    className="flex-1 py-1.5 px-2.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>APPROVE &amp; TRUST</span>
                  </button>

                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'REJECTED')}
                    className="flex-1 py-1.5 px-2.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
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
