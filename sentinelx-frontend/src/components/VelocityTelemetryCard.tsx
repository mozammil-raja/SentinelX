'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, VelocityMetrics } from '@/lib/api';
import { Gauge, Search, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';

export function VelocityTelemetryCard() {
  const [lookupUser, setLookupUser] = useState('usr_alice');
  const [metrics, setMetrics] = useState<VelocityMetrics | null>(null);
  const [health, setHealth] = useState<{ status: string; engine: string; isRedisAvailable: boolean } | null>(null);
  const [ruleLimit, setRuleLimit] = useState<{ limit: number; window: number }>({ limit: 5, window: 300 });
  const [loading, setLoading] = useState(false);

  const handleLookup = useCallback(async (userIdToLookup?: string) => {
    const targetUser = (userIdToLookup ?? lookupUser).trim();
    if (!targetUser) return;
    setLoading(true);
    try {
      const [healthData, velocityData] = await Promise.all([
        api.velocity.getHealth().catch(() => null),
        api.velocity.getUserVelocity(targetUser, 300).catch(() => null),
      ]);
      if (healthData) setHealth(healthData);
      if (velocityData) setMetrics(velocityData);
    } catch (err: unknown) {
      console.error('Velocity lookup failed:', err);
    } finally {
      setLoading(false);
    }
  }, [lookupUser]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [healthRes, metricsRes, rulesRes] = await Promise.all([
          api.velocity.getHealth().catch(() => null),
          api.velocity.getUserVelocity('usr_alice', 300).catch(() => null),
          api.rules.getAll().catch(() => null),
        ]);
        if (!ignore) {
          if (healthRes) setHealth(healthRes);
          if (metricsRes) setMetrics(metricsRes);
          const r1 = rulesRes?.find((r) => r.id === 'RULE_01');
          if (r1?.conditionJson) {
            try {
              const parsed = JSON.parse(r1.conditionJson);
              setRuleLimit({ limit: parsed.limit ?? 5, window: parsed.window ?? 300 });
            } catch { /* ignore */ }
          }
        }
      } catch (err: unknown) {
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
    <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-5 space-y-4 font-mono text-white shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/20">
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                VELOCITY_MONITOR // REDIS_SLIDING_WINDOW_LOG
              </h2>
            </div>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              High-throughput in-memory rate limiting with atomic Lua scripts and rolling timestamp eviction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {health?.isRedisAvailable ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>REDIS: ONLINE (&lt;1MS)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/40">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>DATABASE_FALLBACK: ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={lookupUser}
            onChange={(e) => setLookupUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="Search Account ID (e.g. usr_sarah)..."
            className="w-full bg-[#151922] border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono transition-colors"
          />
        </div>
        <button
          onClick={() => handleLookup()}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-900/40 disabled:opacity-50"
        >
          {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>QUERY</span>
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 rounded-xl bg-[#151922] border border-slate-800/80 space-y-1.5 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">WINDOW_TXN_COUNT</span>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {metrics.userVelocityCount ?? 0}
            </div>
            <span className="text-[10px] text-neutral-400 block">LIMIT: {ruleLimit.limit} TXNS / {ruleLimit.window}S</span>
          </div>

          <div className="p-4 rounded-xl bg-[#151922] border border-slate-800/80 space-y-1.5 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">CUMULATIVE_VOLUME</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {Number(metrics.userVolumeAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-neutral-400 block">AGGREGATION: RAM_SLIDING_SUM</span>
          </div>

          <div className="p-4 rounded-xl bg-[#151922] border border-slate-800/80 col-span-2 sm:col-span-1 space-y-1.5 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">WINDOW_DURATION</span>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              300s (5m)
            </div>
            <span className="text-[10px] text-neutral-400 block">COMPLEXITY: O(log N + M)</span>
          </div>
        </div>
      )}
    </div>
  );
}
