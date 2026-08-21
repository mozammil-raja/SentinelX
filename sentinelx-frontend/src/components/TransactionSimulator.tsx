'use client';

import { useState, useCallback } from 'react';
import { api, TransactionRequest, DecisionResponse } from '@/lib/api';
import { Send, Zap, Sparkles, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface Preset {
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  expectedVerdict: 'ALLOW' | 'REVIEW' | 'BLOCK';
  request: TransactionRequest;
}

const PRESETS: Preset[] = [
  {
    name: 'Safe Everyday Purchase',
    badge: 'Expected: ALLOW',
    badgeColor: 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50',
    description: '$35.00 coffee order from Alice on trusted device',
    expectedVerdict: 'ALLOW',
    request: {
      userId: 'usr_1001',
      email: 'alice@example.com',
      amount: 35.00,
      currency: 'USD',
      merchantId: 'mer_coffee_shop',
      cardBin: '411111',
      ipAddress: '198.51.100.10',
      deviceFingerprint: 'fp_alice_iphone15_sha256',
      os: 'iOS',
      browser: 'Safari',
    },
  },
  {
    name: 'Velocity Burst Attack',
    badge: 'Expected: BLOCK',
    badgeColor: 'bg-red-950/80 text-red-400 border-red-700/50',
    description: 'Rapid-fire payments hitting RULE_01 limit',
    expectedVerdict: 'BLOCK',
    request: {
      userId: 'usr_burst_demo',
      email: 'bot_spammer@attacker.com',
      amount: 15.00,
      currency: 'USD',
      merchantId: 'mer_gift_cards',
      cardBin: '550000',
      ipAddress: '203.0.113.88',
      deviceFingerprint: 'fp_bot_vm_instance_9',
      os: 'Linux',
      browser: 'HeadlessChrome',
    },
  },
  {
    name: 'Untrusted New Device',
    badge: 'Expected: ALLOW (+25 pts)',
    badgeColor: 'bg-indigo-950/80 text-indigo-400 border-indigo-700/50',
    description: 'Recognized user logging in from new unverified browser',
    expectedVerdict: 'ALLOW',
    request: {
      userId: 'usr_1001',
      email: 'alice@example.com',
      amount: 45.00,
      currency: 'USD',
      merchantId: 'mer_safe_store',
      cardBin: '411111',
      ipAddress: '198.51.100.10',
      deviceFingerprint: 'fp_new_unrecognized_device_9011',
      os: 'Windows',
      browser: 'Chrome',
    },
  },
  {
    name: 'High-Value Transfer',
    badge: 'Expected: REVIEW (+50 pts)',
    badgeColor: 'bg-amber-950/80 text-amber-400 border-amber-700/50',
    description: '$14,500 luxury transfer triggering manual inspection',
    expectedVerdict: 'REVIEW',
    request: {
      userId: 'usr_1002',
      email: 'bob@example.com',
      amount: 14500.00,
      currency: 'USD',
      merchantId: 'mer_luxury_watches',
      cardBin: '424242',
      ipAddress: '198.51.100.20',
      deviceFingerprint: 'fp_bob_macbook_pro',
      os: 'macOS',
      browser: 'Chrome',
    },
  },
  {
    name: 'Rapid IP Change (Proxy/VPN Hop)',
    badge: 'Expected: REVIEW (+60 pts)',
    badgeColor: 'bg-amber-950/80 text-amber-400 border-amber-700/50',
    description: 'Transaction from foreign IP (203.0.113.50 vs 198.51.100.10)',
    expectedVerdict: 'REVIEW',
    request: {
      userId: 'usr_1001',
      email: 'alice@example.com',
      amount: 120.00,
      currency: 'USD',
      merchantId: 'mer_safe_store',
      cardBin: '411111',
      ipAddress: '203.0.113.50',
      deviceFingerprint: 'fp_alice_iphone15_sha256',
      os: 'iOS',
      browser: 'Safari',
    },
  },
  {
    name: 'Sanctioned Merchant',
    badge: 'Expected: BLOCK (+80 pts)',
    badgeColor: 'bg-red-950/80 text-red-400 border-red-700/50',
    description: 'Blacklisted merchant (mer_dark_market / high risk)',
    expectedVerdict: 'BLOCK',
    request: {
      userId: 'usr_1003',
      email: 'charlie@example.com',
      amount: 250.00,
      currency: 'USD',
      merchantId: 'mer_dark_market',
      cardBin: '400000',
      ipAddress: '198.51.100.99',
      deviceFingerprint: 'fp_charlie_phone',
      os: 'Android',
      browser: 'Firefox',
    },
  },
  {
    name: 'High Risk User Segment',
    badge: 'Expected: REVIEW (+30 pts)',
    badgeColor: 'bg-amber-950/80 text-amber-400 border-amber-700/50',
    description: 'User in HIGH risk segment (Charlie) triggering RULE_06',
    expectedVerdict: 'REVIEW',
    request: {
      userId: 'usr_1003',
      email: 'charlie@example.com',
      amount: 35.00,
      currency: 'USD',
      merchantId: 'mer_safe_store',
      cardBin: '411111',
      ipAddress: '198.51.100.33',
      deviceFingerprint: 'fp_charlie_phone',
      os: 'Android',
      browser: 'Firefox',
    },
  },
];

let burstCounter = 1000;

export function TransactionSimulator() {
  const [loading, setLoading] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [lastResult, setLastResult] = useState<DecisionResponse | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleSendSingle = useCallback(async (preset: Preset) => {
    setLoading(true);
    setActivePreset(preset.name);
    try {
      const res = await api.transactions.evaluate(preset.request);
      setLastResult(res);
    } catch (err: unknown) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRunBurst = useCallback(async () => {
    setBursting(true);
    setActivePreset('Burst Velocity Attack');
    burstCounter += 1;
    const burstUser = `usr_burst_${burstCounter}`;

    try {
      for (let i = 1; i <= 6; i++) {
        const payload: TransactionRequest = {
          userId: burstUser,
          email: `${burstUser}@attack.io`,
          amount: 20.0 + i,
          currency: 'USD',
          merchantId: 'mer_rapid_drain',
          ipAddress: '198.51.100.77',
          deviceFingerprint: 'fp_burst_bot_sha',
        };
        const res = await api.transactions.evaluate(payload);
        setLastResult(res);
        // Small 150ms delay between burst transactions
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (err) {
      console.error('Burst error:', err);
    } finally {
      setBursting(false);
    }
  }, []);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-700/50 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Live Transaction Simulator</h2>
            <p className="text-xs text-slate-400">One-click fraud scenarios for interview demonstrations</p>
          </div>
        </div>
        {lastResult && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700">
            <span className="text-slate-400">Last Latency:</span>
            <span className="text-cyan-400 font-bold">{lastResult.evaluationTimeMs} ms</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESETS.map((preset) => {
          const isBurst = preset.name === 'Velocity Burst Attack';
          const isCurrentLoading = (loading || bursting) && activePreset === preset.name;

          return (
            <div
              key={preset.name}
              className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between space-y-3 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{preset.name}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${preset.badgeColor}`}>
                    {preset.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>
              </div>

              <button
                disabled={loading || bursting}
                onClick={() => (isBurst ? handleRunBurst() : handleSendSingle(preset))}
                className="w-full py-1.5 px-3 rounded-md bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700/60 text-xs font-medium text-slate-100 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isCurrentLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>{isBurst ? 'Executing Burst...' : 'Evaluating...'}</span>
                  </>
                ) : (
                  <>
                    {isBurst ? <Zap className="w-3.5 h-3.5 text-amber-400" /> : <Send className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{isBurst ? 'Trigger 5x Burst' : 'Simulate Payment'}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {lastResult && (
        <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start gap-3">
          {lastResult.decision === 'ALLOW' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {lastResult.decision === 'REVIEW' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {lastResult.decision === 'BLOCK' && <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}

          <div className="space-y-1 text-xs w-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                Latest Verdict: <span className="font-mono font-bold text-slate-100">{lastResult.decision}</span> (Risk Score: {lastResult.finalScore}/100)
              </span>
              <span className="text-slate-500 font-mono">ID: {lastResult.transactionId}</span>
            </div>
            <div className="text-slate-400">
              {lastResult.firedRules.length > 0 ? (
                <span className="text-amber-300/90">Fired: {lastResult.firedRules.join(' | ')}</span>
              ) : (
                <span className="text-emerald-400/90">Zero risk rules triggered (Clean Transaction)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
