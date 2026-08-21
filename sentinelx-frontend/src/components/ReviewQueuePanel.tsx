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
    <div className="bg-[#353535] border border-white rounded-lg p-5 space-y-4 font-mono text-white">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                COMPLIANCE_DISPATCH // HUMAN_REVIEW_QUEUE
              </h2>
              <span className="text-[10px] text-neutral-300">
                [{items.length} PENDING]
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-sans mt-0.5">
              Human-in-the-loop investigation terminal with GenAI Copilot synthesis for transactions scoring 30–69
            </p>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="p-1.5 rounded bg-white text-black hover:bg-neutral-200 border border-white font-bold transition-colors"
          title="Reload review queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 rounded border border-white bg-[#353535] text-neutral-300 text-xs">
          <ClipboardList className="w-6 h-6 mx-auto mb-2 text-white" />
          <span>[QUEUE_EMPTY] No transactions currently require human analyst clearance.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const isResolving = resolvingId === item.id;

            return (
              <div
                key={item.id}
                className="p-4 rounded bg-[#353535] border border-white flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-white pb-2">
                    <span className="text-xs font-bold text-black bg-white px-2 py-0.5 rounded border border-white">
                      CASE_REF #{item.id}
                    </span>
                    <span className="text-xs text-white">INITIAL_SCORE: <span className="text-white font-bold">{item.initialScore}/100</span></span>
                  </div>

                  <div className="space-y-1 text-xs text-neutral-300">
                    <div className="flex justify-between">
                      <span>TRANSACTION_AMOUNT:</span>
                      <span className="font-bold text-white">${item.amount.toFixed(2)} {item.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CUSTOMER_ID:</span>
                      <span className="text-white">{item.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TARGET_MERCHANT:</span>
                      <span className="text-white">{item.merchantId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TRANSACTION_ID:</span>
                      <span className="text-neutral-300 text-[11px] truncate max-w-[160px]">{item.transactionId}</span>
                    </div>
                  </div>

                  {/* AI Risk Copilot Analysis Block */}
                  {item.aiAnalysis && (
                    <div className="p-2.5 rounded bg-[#353535] border border-white space-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-white font-bold">
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI_COPILOT_SYNTHESIS</span>
                      </div>
                      <p className="text-neutral-200 font-sans leading-relaxed text-[11px]">
                        {item.aiAnalysis}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-white flex items-center gap-2">
                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'APPROVED')}
                    className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 border border-white text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>APPROVE &amp; TRUST</span>
                  </button>

                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(item.id, 'REJECTED')}
                    className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 border border-white text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
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
