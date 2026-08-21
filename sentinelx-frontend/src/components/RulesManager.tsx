'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, Rule } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SlidersHorizontal, ToggleLeft, ToggleRight, RefreshCw, Layers } from 'lucide-react';

export function RulesManager() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rules.getAll();
      setRules(data);
    } catch (err) {
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
      .catch((err) => {
        console.error('Failed to load rules:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (ruleId: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setTogglingId(ruleId);
    try {
      const updated = await api.rules.toggle(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-5 space-y-4 font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                RULE_CATALOG // DYNAMIC_STRATEGY_ENGINE
              </h2>
              <span className="text-[10px] text-slate-400">
                [{rules.filter((r) => r.isActive).length}/{rules.length} ACTIVE]
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              PostgreSQL-backed strategy rules reloaded in memory at runtime without deployment downtime
            </p>
          </div>
        </div>

        <button
          onClick={fetchRules}
          className="p-1 rounded bg-[#090C10] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reload rule catalog"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map((rule) => {
          const isToggling = togglingId === rule.id;

          return (
            <div
              key={rule.id}
              className={`p-3.5 rounded border flex flex-col justify-between space-y-3 transition-colors ${
                rule.isActive
                  ? 'bg-[#090C10] border-slate-800 text-slate-200 hover:border-slate-700'
                  : 'bg-[#090C10]/40 border-slate-800/40 opacity-50 text-slate-500'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/60">
                      {rule.id}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">
                      [v{rule.version || 1} // STRATEGY]
                    </span>
                  </div>
                  <button
                    disabled={isToggling}
                    onClick={() => handleToggle(rule.id)}
                    className="flex items-center text-xs transition-colors"
                    title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                  >
                    {isToggling ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : rule.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-400 hover:text-emerald-300" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">{rule.name}</h3>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{rule.description}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-slate-400">
                  <span>PENALTY_WEIGHT:</span>
                  <span className="font-bold text-amber-400">+{rule.weight} PTS</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[130px]" title={rule.conditionJson}>
                  {rule.conditionJson && rule.conditionJson !== '{}' ? rule.conditionJson : 'STATIC_LOGIC'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
