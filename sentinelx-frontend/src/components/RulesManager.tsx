'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, Rule } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';

export function RulesManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { openAuthModal } = useAuth();

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rules.getAll();
      setRules(data);
    } catch (err: unknown) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.rules.getAll()
      .then((data) => {
        if (isMounted) {
          setRules(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error('Failed to load rules:', err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (ruleId: string) => {
    try {
      setTogglingId(ruleId);
      const updated = await api.rules.toggle(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    } catch (err: unknown) {
      console.error('Toggle failed:', err);
      if (err instanceof Error && err.message.includes('401')) {
        openAuthModal();
      }
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-5 space-y-4 font-mono text-white shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/20">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                POLICY_ORCHESTRATION // STRATEGY_RULE_CATALOG
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold">
                RUNTIME_SYNC
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Live PostgreSQL rule catalog. Rule state &amp; weight multipliers execute in real time on the scoring path.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRules}
            className="p-2 rounded-lg bg-[#151922] hover:bg-slate-700 border border-slate-700/80 text-neutral-200 transition-colors shadow-sm"
            title="Refresh rules"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-36 rounded-xl bg-[#151922] border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {rules.map((rule) => {
            const isToggling = togglingId === rule.id;

            return (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                  rule.isActive
                    ? 'bg-[#151922] border-slate-800/80 hover:border-slate-700 shadow-sm'
                    : 'bg-[#151922]/50 border-slate-800/40 opacity-50 text-neutral-400'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#1c222e] border border-slate-700 text-cyan-400">
                        {rule.id}
                      </span>
                      <span className="text-[10px] text-neutral-400 uppercase">
                        [v{rule.version || 1}{' // '}STRATEGY]
                      </span>
                    </div>
                    <button
                      disabled={isToggling}
                      onClick={() => handleToggle(rule.id)}
                      className="flex items-center text-xs transition-colors"
                      title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                    >
                      {isToggling ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : rule.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400 hover:text-emerald-300" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-neutral-500 hover:text-neutral-400" />
                      )}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide">{rule.name}</h4>
                    <p className="text-[11px] text-neutral-400 font-sans mt-1 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 uppercase">SCORE_WEIGHT:</span>
                    <span className="font-bold text-amber-400">
                      +{rule.weight} PTS
                    </span>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                    rule.isActive
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-900 border-slate-700 text-neutral-500'
                  }`}>
                    {rule.isActive ? '● ACTIVE' : 'DISABLED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
