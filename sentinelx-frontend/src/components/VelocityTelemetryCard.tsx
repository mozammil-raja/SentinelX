'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, VelocityMetrics } from '@/lib/api';
import { Gauge, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export function VelocityTelemetryCard() {
  const [lookupUser, setLookupUser] = useState('usr_sarah');
  const [metrics, setMetrics] = useState<VelocityMetrics | null>(null);
  const [health, setHealth] = useState<{ status: string; engine: string; isRedisAvailable: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.velocity.getHealth();
      setHealth(res);
    } catch (err) {
      console.error('Failed to get velocity health:', err);
    }
  }, []);

  const handleLookup = useCallback(async (userIdToLookup?: string) => {
    const targetUser = (userIdToLookup ?? lookupUser).trim();
    if (!targetUser) return;
    setLoading(true);
    try {
      fetchHealth();
      const data = await api.velocity.getUserVelocity(targetUser, 300);
      setMetrics(data);
    } catch (err) {
      console.error('Velocity lookup failed:', err);
    } finally {
      setLoading(false);
    }
  }, [lookupUser, fetchHealth]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [healthRes, metricsRes] = await Promise.all([
          api.velocity.getHealth().catch(() => null),
          api.velocity.getUserVelocity('usr_sarah', 300).catch(() => null)
        ]);
        if (!ignore) {
          if (healthRes) setHealth(healthRes);
          if (metricsRes) setMetrics(metricsRes);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Velocity init error:', err);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-5 space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
            <Gauge className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                VELOCITY_MONITOR // REDIS_SLIDING_WINDOW_LOG
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              High-throughput in-memory rate limiting with atomic Lua scripts and rolling timestamp eviction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {health?.isRedisAvailable ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>REDIS: ONLINE (&lt;1MS)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-950/40 px-2.5 py-1 rounded border border-amber-800/60">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>DATABASE_FALLBACK: ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={lookupUser}
            onChange={(e) => setLookupUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="Search Account ID (e.g. usr_sarah)..."
            className="w-full bg-[#090C10] border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <button
          onClick={() => handleLookup()}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700 disabled:opacity-50"
        >
          <Search className="w-3.5 h-3.5" />
          <span>QUERY</span>
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded bg-[#090C10] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">WINDOW_TXN_COUNT</span>
            <div className="text-xl font-bold text-blue-400">
              {metrics.userVelocityCount ?? 0}
            </div>
            <span className="text-[10px] text-slate-500">LIMIT: 5 TXNS / 300S</span>
          </div>

          <div className="p-3 rounded bg-[#090C10] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">CUMULATIVE_VOLUME</span>
            <div className="text-xl font-bold text-slate-200">
              ${Number(metrics.userVolumeAmount ?? 0).toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500">AGGREGATION: RAM_SLIDING_SUM</span>
          </div>

          <div className="p-3 rounded bg-[#090C10] border border-slate-800 col-span-2 sm:col-span-1 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">WINDOW_DURATION</span>
            <div className="text-xl font-bold text-slate-200">
              300s (5m)
            </div>
            <span className="text-[10px] text-slate-500">COMPLEXITY: O(log N + M)</span>
          </div>
        </div>
      )}
    </div>
  );
}
