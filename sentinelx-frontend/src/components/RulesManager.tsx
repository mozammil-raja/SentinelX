'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, Rule } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Sliders, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

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
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Dynamic Rule Engine</h2>
            <p className="text-xs text-slate-400">PostgreSQL-backed strategy rules reloaded dynamically at runtime</p>
          </div>
        </div>

        <button
          onClick={fetchRules}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reload rules"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map((rule) => {
          const isToggling = togglingId === rule.id;

          return (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                rule.isActive
                  ? 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                  : 'bg-slate-950/30 border-slate-800/40 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50">
                    {rule.id}
                  </span>
                  <button
                    disabled={isToggling}
                    onClick={() => handleToggle(rule.id)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                  >
                    {isToggling ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                    ) : rule.isActive ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400 hover:text-emerald-300" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600 hover:text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-200">{rule.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-400">
                  <span>Weight:</span>
                  <span className="font-bold text-amber-400">+{rule.weight} pts</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[130px]" title={rule.conditionJson}>
                  {rule.conditionJson && rule.conditionJson !== '{}' ? rule.conditionJson : 'Static'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
