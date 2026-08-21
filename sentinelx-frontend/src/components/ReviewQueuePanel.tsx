'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ReviewQueueItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ClipboardCheck,
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
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-700/50 text-amber-400">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Analyst Review Queue
              <span className="text-xs font-normal text-slate-400">({items.length} pending)</span>
            </h2>
            <p className="text-xs text-slate-400">Human-in-the-loop inspection with GenAI Risk Copilot for transactions scoring 30–69</p>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reload review queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 rounded-lg border border-slate-800/80 bg-slate-950/40 text-slate-500 text-xs">
          <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-700" />
          <span>Queue is empty. No transactions currently pending manual review.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {items.map((item) => {
            const isResolving = resolvingId === item.id;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                      Case #{item.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Initial Score: {item.initialScore}/100</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-slate-100">${item.amount.toFixed(2)} {item.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Customer ID:</span>
                      <span className="font-mono text-slate-200">{item.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Merchant:</span>
                      <span className="font-mono text-slate-200">{item.merchantId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transaction ID:</span>
                      <span className="font-mono text-slate-400 text-[11px] truncate max-w-[160px]">{item.transactionId}</span>
                    </div>
                  </div>

                  {/* GenAI Risk Copilot Analysis Block */}
                  {item.aiAnalysis && (
                    <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/50 space-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                        <Bot className="w-3.5 h-3.5 text-purple-400" />
                        <span>AI Risk Copilot Reasoning</span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-line leading-relaxed font-sans text-[11px]">
                        {item.aiAnalysis}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'APPROVED')}
                    className="flex-1 py-1.5 px-3 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Approve &amp; Trust Device</span>
                  </button>

                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'REJECTED')}
                    className="flex-1 py-1.5 px-3 rounded-md bg-red-950/80 hover:bg-red-900 border border-red-700/50 text-xs font-semibold text-red-300 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Fraud</span>
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
