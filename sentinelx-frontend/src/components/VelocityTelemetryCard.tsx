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
          api.velocity.getUserVelocity('usr_sarah', 300).catch(() => null),
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
    <div className="bg-[#353535] border border-white rounded-lg p-5 space-y-4 font-mono text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
            <Gauge className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                VELOCITY_MONITOR // REDIS_SLIDING_WINDOW_LOG
              </h2>
            </div>
            <p className="text-xs text-neutral-300 font-sans mt-0.5">
              High-throughput in-memory rate limiting with atomic Lua scripts and rolling timestamp eviction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {health?.isRedisAvailable ? (
            <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-[#353535] px-2.5 py-1 rounded border border-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>REDIS: ONLINE (&lt;1MS)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-[#353535] px-2.5 py-1 rounded border border-white">
              <AlertCircle className="w-3.5 h-3.5 text-white" />
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
            className="w-full bg-[#353535] border border-white rounded px-3 py-1.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-white font-mono"
          />
        </div>
        <button
          onClick={() => handleLookup()}
          disabled={loading}
          className="px-4 py-1.5 rounded bg-white text-black hover:bg-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-white disabled:opacity-50"
        >
          <Search className="w-3.5 h-3.5" />
          <span>QUERY</span>
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3.5 rounded bg-[#353535] border border-white space-y-1">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">WINDOW_TXN_COUNT</span>
            <div className="text-xl font-bold text-white">
              {metrics.userVelocityCount ?? 0}
            </div>
            <span className="text-[10px] text-neutral-300">LIMIT: 5 TXNS / 300S</span>
          </div>

          <div className="p-3.5 rounded bg-[#353535] border border-white space-y-1">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">CUMULATIVE_VOLUME</span>
            <div className="text-xl font-bold text-white">
              ${Number(metrics.userVolumeAmount ?? 0).toFixed(2)}
            </div>
            <span className="text-[10px] text-neutral-300">AGGREGATION: RAM_SLIDING_SUM</span>
          </div>

          <div className="p-3.5 rounded bg-[#353535] border border-white col-span-2 sm:col-span-1 space-y-1">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">WINDOW_DURATION</span>
            <div className="text-xl font-bold text-white">
              300s (5m)
            </div>
            <span className="text-[10px] text-neutral-300">COMPLEXITY: O(log N + M)</span>
          </div>
        </div>
      )}
    </div>
  );
}
