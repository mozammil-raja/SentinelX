'use client';

import { useState, useCallback } from 'react';
import { api, TransactionRequest, DecisionResponse } from '@/lib/api';
import {
  Send,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  KeyRound,
  RotateCw,
} from 'lucide-react';

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
      amount: 60.00,
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
    name: 'Blacklisted Merchant',
    badge: 'Expected: BLOCK (+80 pts)',
    badgeColor: 'bg-red-950/80 text-red-400 border-red-700/50',
    description: 'Routing payment to flagged merchant "mer_black_1"',
    expectedVerdict: 'BLOCK',
    request: {
      userId: 'usr_1001',
      email: 'alice@example.com',
      amount: 80.00,
      currency: 'USD',
      merchantId: 'mer_black_1',
      cardBin: '411111',
      ipAddress: '198.51.100.10',
      deviceFingerprint: 'fp_alice_iphone15_sha256',
      os: 'iOS',
      browser: 'Safari',
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
      deviceFingerprint: 'fp_charlie_phone_unique',
      os: 'Android',
      browser: 'Firefox',
    },
  },
  {
    name: 'Syndicate Fraud Ring Attack',
    badge: 'Expected: BLOCK (+75 pts)',
    badgeColor: 'bg-pink-950/80 text-pink-400 border-pink-700/50',
    description: 'Account transacting on hardware device shared with banned fraudster (RULE_07)',
    expectedVerdict: 'BLOCK',
    request: {
      userId: 'usr_syndicate_member_01',
      email: 'syndicate_bot@fraudnet.org',
      amount: 120.00,
      currency: 'USD',
      merchantId: 'mer_electronics',
      cardBin: '550000',
      ipAddress: '203.0.113.88',
      deviceFingerprint: 'fp_charlie_phone', // Shared with banned fraudster
      os: 'Android',
      browser: 'Chrome',
    },
  },
];

let burstCounter = 1000;

export function TransactionSimulator() {
  const [loading, setLoading] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [lastResult, setLastResult] = useState<DecisionResponse | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Idempotency Controls
  const [enableIdempotency, setEnableIdempotency] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('idemp_demo_001');

  const regenerateIdempotencyKey = () => {
    setIdempotencyKey(`idemp_${Math.random().toString(36).substring(2, 8)}`);
  };

  const handleSendSingle = useCallback(
    async (preset: Preset) => {
      setLoading(true);
      setActivePreset(preset.name);
      try {
        const res = await api.transactions.evaluate(
          preset.request,
          enableIdempotency ? idempotencyKey : undefined
        );
        setLastResult(res);
      } catch (err: unknown) {
        console.error('Simulation error:', err);
      } finally {
        setLoading(false);
      }
    },
    [enableIdempotency, idempotencyKey]
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-700/50 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Live Transaction Simulator</h2>
            <p className="text-xs text-slate-400">One-click fraud scenarios and idempotency replay</p>
          </div>
        </div>

        {/* Idempotency Key Bar */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg p-1.5 text-xs">
          <button
            type="button"
            onClick={() => setEnableIdempotency(!enableIdempotency)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold text-[11px] transition-colors ${
              enableIdempotency
                ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Idempotency {enableIdempotency ? 'ON' : 'OFF'}</span>
          </button>

          {enableIdempotency && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] pl-1 text-slate-300">
              <span className="text-slate-400">{idempotencyKey}</span>
              <button
                type="button"
                onClick={regenerateIdempotencyKey}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Generate new idempotency key"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>
          )}

          {lastResult && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 ml-1">
              <span className="text-slate-400">Latency:</span>
              <span className="text-cyan-400 font-bold">{lastResult.evaluationTimeMs}ms</span>
            </div>
          )}
        </div>
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
