'use client';

import { useState, useEffect } from 'react';
import { api, Rule } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Shield,
  RefreshCw,
  Plus,
} from 'lucide-react';

export function RulesManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { openAuthModal } = useAuth();

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await api.rules.getAll();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (ruleId: string) => {
    try {
      setTogglingId(ruleId);
      const updated = await api.rules.toggle(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    } catch (err: any) {
      console.error('Toggle failed:', err);
      if (err.message && err.message.includes('401')) {
        openAuthModal();
      }
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="bg-[#353535] border border-white rounded-lg p-5 space-y-4 font-mono text-white">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
            <SlidersHorizontal className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                POLICY_ORCHESTRATION // STRATEGY_RULE_CATALOG
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded border border-white text-white">
                RUNTIME_SYNC
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-sans mt-0.5">
              Live PostgreSQL rule state. Weight modifiers take effect instantaneously on the real-time scoring path.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRules}
            className="p-1.5 rounded border border-white bg-white text-black hover:bg-neutral-200 transition-colors"
            title="Refresh rules"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-32 rounded bg-[#353535] border border-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rules.map((rule) => {
            const isToggling = togglingId === rule.id;

            return (
              <div
                key={rule.id}
                className={`p-3.5 rounded border flex flex-col justify-between space-y-3 transition-colors ${
                  rule.isActive
                    ? 'bg-[#353535] border-white text-white'
                    : 'bg-[#353535] border-white/60 opacity-60 text-neutral-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-black bg-white px-1.5 py-0.5 rounded border border-white">
                        {rule.id}
                      </span>
                      <span className="text-[10px] text-neutral-300 uppercase">
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
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : rule.isActive ? (
                        <ToggleRight className="w-5 h-5 text-white" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-neutral-400" />
                      )}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">{rule.name}</h4>
                    <p className="text-[11px] text-neutral-200 font-sans mt-0.5 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-300 uppercase">SCORE_WEIGHT:</span>
                    <span className="font-bold text-white">
                      +{rule.weight} PTS
                    </span>
                  </div>

                  <span className="text-[10px] px-1.5 py-0.2 rounded border border-white font-bold text-white">
                    {rule.isActive ? 'STATE: ACTIVE' : 'STATE: DISABLED'}
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
