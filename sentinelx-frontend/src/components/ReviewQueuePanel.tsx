'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ReviewQueueItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ClipboardCheck, XCircle, UserCheck, RefreshCw } from 'lucide-react';

export function ReviewQueuePanel() {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.reviews.getPending();
      setItems(data);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await api.reviews.getPending();
        if (!ignore) {
          setItems(data);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load review queue:', err);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleResolve = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setResolvingId(id);
    try {
      await api.reviews.resolve(
        id,
        status,
        user?.email || 'analyst@sentinelx.io',
        status === 'APPROVED' ? 'Verified by fraud analyst — device trusted' : 'Suspicious activity confirmed'
      );
      // Remove resolved item from pending list
      setItems((prev) => prev.filter((item) => item.id !== id));
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
            <p className="text-xs text-slate-400">Human-in-the-loop inspection for transactions scoring 30–69</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const isResolving = resolvingId === item.id;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                      Case #{item.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Score: {item.initialScore}/100</span>
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
                    <span>Reject</span>
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
