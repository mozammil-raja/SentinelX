'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, TransactionRequest, DecisionResponse, CustomerProfile } from '@/lib/api';
import { FALLBACK_CUSTOMERS, MERCHANTS } from '@/lib/mockData';
import {
  Sparkles,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  RotateCw,
  UserCheck,
  SlidersHorizontal,
  Activity,
  ShieldAlert,
  Play,
  RotateCcw,
  Zap,
  FileText,
  Globe,
} from 'lucide-react';

let burstCounter = 1000;

export function TransactionSimulator() {
  const [customers, setCustomers] = useState<CustomerProfile[]>(FALLBACK_CUSTOMERS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('usr_sarah');
  const [loading, setLoading] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [lastResult, setLastResult] = useState<DecisionResponse | null>(null);

  // Idempotency Controls
  const [enableIdempotency, setEnableIdempotency] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('idemp_demo_001');

  // Form State
  const [amount, setAmount] = useState<number>(1200);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('mer_grocery_fresh');

  // Suspicious Condition Toggles
  const [isUnusualAmount, setIsUnusualAmount] = useState<boolean>(false);
  const [isNewDevice, setIsNewDevice] = useState<boolean>(false);
  const [isLocationHop, setIsLocationHop] = useState<boolean>(false);
  const [isBlacklistedMerchant, setIsBlacklistedMerchant] = useState<boolean>(false);
  const [isVelocityBurst, setIsVelocityBurst] = useState<boolean>(false);

  // Fetch live customer profiles on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCustomers() {
      try {
        const data = await api.customers.getAll();
        if (isMounted && data && data.length > 0) {
          setCustomers(data);
        }
      } catch {
        // Fallback static profiles
      }
    }
    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0] || FALLBACK_CUSTOMERS[0];
  }, [customers, selectedCustomerId]);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const target = customers.find((c) => c.id === customerId) || FALLBACK_CUSTOMERS[0];
    const defaultAmount = target.typicalSpendMin
      ? Math.round((target.typicalSpendMin + (target.typicalSpendMax || 3000)) / 2)
      : (target.currency === 'USD' ? 45 : 1200);
    
    setAmount(defaultAmount);
    setIsUnusualAmount(false);
    setIsNewDevice(false);
    setIsLocationHop(false);
    setIsBlacklistedMerchant(false);
    setIsVelocityBurst(false);
    setLastResult(null);
  };

  const handleToggleUnusualAmount = (checked: boolean) => {
    setIsUnusualAmount(checked);
    if (checked) {
      const baselineMax = currentCustomer.typicalSpendMax || 3000;
      setAmount(baselineMax * 6.5);
    } else {
      const defaultAmount = currentCustomer.typicalSpendMin
        ? Math.round((currentCustomer.typicalSpendMin + (currentCustomer.typicalSpendMax || 3000)) / 2)
        : (currentCustomer.currency === 'USD' ? 45 : 1200);
      setAmount(defaultAmount);
    }
  };

  const handleToggleMerchant = (checked: boolean) => {
    setIsBlacklistedMerchant(checked);
    if (checked) {
      setSelectedMerchantId('mer_black_1');
    } else {
      setSelectedMerchantId('mer_grocery_fresh');
    }
  };

  const regenerateIdempotencyKey = () => {
    setIdempotencyKey(`idemp_${Math.random().toString(36).substring(2, 8)}`);
  };

  // Run Simulation
  const handleRunSimulation = useCallback(async () => {
    setLoading(true);

    const isUsd = currentCustomer.currency === 'USD';
    const currency = currentCustomer.currency || (isUsd ? 'USD' : 'INR');

    const deviceFp = isNewDevice
      ? 'fp_new_untrusted_device_999'
      : (currentCustomer.primaryDeviceFingerprint || `${currentCustomer.id}_trusted_device`);

    const ip = isLocationHop
      ? '203.0.113.50'
      : (currentCustomer.usualIp || '103.21.244.10');

    const merchant = isBlacklistedMerchant ? 'mer_black_1' : selectedMerchantId;

    try {
      if (isVelocityBurst) {
        setBursting(true);
        burstCounter += 1;
        const burstUser = `${currentCustomer.id}_burst_${burstCounter}`;
        const burstEmail = `burst_${burstCounter}_${currentCustomer.email}`;

        let latest: DecisionResponse | null = null;
        for (let i = 1; i <= 6; i++) {
          const payload: TransactionRequest = {
            userId: burstUser,
            email: burstEmail,
            amount: Number((amount / 10 + i * 2).toFixed(2)),
            currency,
            merchantId: merchant,
            ipAddress: ip,
            deviceFingerprint: deviceFp,
          };
          latest = await api.transactions.evaluate(payload);
          await new Promise((r) => setTimeout(r, 120));
        }
        if (latest) setLastResult(latest);
      } else {
        const payload: TransactionRequest = {
          userId: currentCustomer.id,
          email: currentCustomer.email,
          amount: Number(amount),
          currency,
          merchantId: merchant,
          ipAddress: ip,
          deviceFingerprint: deviceFp,
        };

        const res = await api.transactions.evaluate(
          payload,
          enableIdempotency ? idempotencyKey : undefined
        );
        setLastResult(res);
      }
    } catch (err: unknown) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
      setBursting(false);
    }
  }, [
    currentCustomer,
    amount,
    selectedMerchantId,
    isNewDevice,
    isLocationHop,
    isBlacklistedMerchant,
    isVelocityBurst,
    enableIdempotency,
    idempotencyKey,
  ]);

  // Global Shortcut: Ctrl+Enter or Meta+Enter to simulate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunSimulation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunSimulation]);

  // Dynamic Dimensional Sub-scores computed from fired rules
  const behaviorScore = useMemo(() => {
    if (!lastResult) return 0;
    let score = 0;
    lastResult.firedRules.forEach((r) => {
      const lower = r.toLowerCase();
      if (lower.includes('amount') || lower.includes('spend') || lower.includes('value')) score += 50;
      if (lower.includes('tier') || lower.includes('user')) score += 30;
    });
    return Math.min(100, score);
  }, [lastResult]);

  const velocityScore = useMemo(() => {
    if (!lastResult) return 0;
    let score = 0;
    lastResult.firedRules.forEach((r) => {
      const lower = r.toLowerCase();
      if (lower.includes('velocity') || lower.includes('burst') || lower.includes('redis') || lower.includes('rate')) score += 40;
    });
    return Math.min(100, score);
  }, [lastResult]);

  const entityScore = useMemo(() => {
    if (!lastResult) return 0;
    let score = 0;
    lastResult.firedRules.forEach((r) => {
      const lower = r.toLowerCase();
      if (lower.includes('watchlist') || lower.includes('merchant') || lower.includes('blacklisted')) score += 80;
      if (lower.includes('syndicate') || lower.includes('ring') || lower.includes('graph')) score += 75;
    });
    return Math.min(100, score);
  }, [lastResult]);

  const contextScore = useMemo(() => {
    if (!lastResult) return 0;
    let score = 0;
    lastResult.firedRules.forEach((r) => {
      const lower = r.toLowerCase();
      if (lower.includes('device') || lower.includes('hardware')) score += 25;
      if (lower.includes('location') || lower.includes('ip') || lower.includes('geo')) score += 60;
    });
    return Math.min(100, score);
  }, [lastResult]);

  const [displayedScore, setDisplayedScore] = useState(0);
  const [copiedDocket, setCopiedDocket] = useState(false);

  // Smooth animated score rollup effect
  useEffect(() => {
    if (!lastResult) return;
    const target = lastResult.finalScore;
    const start = 0;
    const duration = 400;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * easeOut);
      setDisplayedScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [lastResult]);

  // Scenario Presets Trigger
  const handleApplyPreset = (presetType: 'CLEAN' | 'ATO' | 'VELOCITY' | 'WATCHLIST') => {
    if (presetType === 'CLEAN') {
      setSelectedCustomerId('usr_sarah');
      setAmount(1200);
      setSelectedMerchantId('mer_grocery_fresh');
      setIsUnusualAmount(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsVelocityBurst(false);
    } else if (presetType === 'ATO') {
      setSelectedCustomerId('usr_sarah');
      setAmount(14500);
      setSelectedMerchantId('mer_luxury_watches');
      setIsUnusualAmount(true);
      setIsNewDevice(true);
      setIsLocationHop(true);
      setIsBlacklistedMerchant(false);
      setIsVelocityBurst(false);
    } else if (presetType === 'VELOCITY') {
      setSelectedCustomerId('usr_arjun');
      setAmount(3500);
      setSelectedMerchantId('mer_electronics_store');
      setIsUnusualAmount(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsVelocityBurst(true);
    } else if (presetType === 'WATCHLIST') {
      setSelectedCustomerId('usr_david');
      setAmount(8900);
      setSelectedMerchantId('mer_black_1');
      setIsUnusualAmount(true);
      setIsNewDevice(true);
      setIsLocationHop(true);
      setIsBlacklistedMerchant(true);
      setIsVelocityBurst(false);
    }
  };

  const handleExportDocket = () => {
    if (!lastResult) return;
    const docket = {
      docketType: 'SENTINELX_COMPLIANCE_AUDIT_DOCKET',
      generatedAt: new Date().toISOString(),
      transactionId: lastResult.transactionId,
      account: {
        userId: currentCustomer.id,
        name: currentCustomer.name,
        riskTier: currentCustomer.riskSegment,
        usualLocation: currentCustomer.usualLocation,
      },
      evaluation: {
        decision: lastResult.decision,
        finalScore: lastResult.finalScore,
        latencyMs: lastResult.evaluationTimeMs,
        firedSignals: lastResult.firedRules,
      },
      telemetry: {
        idempotencyKey: enableIdempotency ? idempotencyKey : 'DISABLED',
        amount,
        currency: currentCustomer.currency,
        merchantId: selectedMerchantId,
        anomalySpike: isUnusualAmount,
        newDeviceFingerprint: isNewDevice,
        geolocationHop: isLocationHop,
        velocityBurst: isVelocityBurst,
      },
      geminiCopilot: {
        shadowVerdict: lastResult.geminiVerdict || 'N/A',
        category: lastResult.geminiCategory || 'N/A',
        reasoning: lastResult.geminiReasoning || 'N/A',
      },
    };

    navigator.clipboard.writeText(JSON.stringify(docket, null, 2));
    setCopiedDocket(true);
    setTimeout(() => setCopiedDocket(false), 2500);
  };

  const currencySymbol = currentCustomer.currency === 'USD' ? '$' : '₹';
  const customerInitials = currentCustomer.name.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <div className="bg-[#151922] border border-slate-800/80 rounded-xl p-5 lg:p-6 space-y-6 text-white font-sans shadow-xl">
      {/* Top Banner & Dimension Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-mono font-bold text-white tracking-wide uppercase">
                RISK EVALUATION WORKBENCH
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE MODE
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Multi-dimensional evaluation across Behavior • Velocity • Entity Graph
            </p>
          </div>
        </div>

        {/* Idempotency & Latency Telemetry */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#1c222e] border border-slate-700/80 rounded-lg px-3 py-1.5">
            <button
              type="button"
              onClick={() => setEnableIdempotency(!enableIdempotency)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors ${
                enableIdempotency
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3 h-3" />
              <span>IDEMPOTENCY: {enableIdempotency ? 'ON' : 'OFF'}</span>
            </button>

            {enableIdempotency && (
              <div className="flex items-center gap-1.5 text-[11px] pl-2 text-white border-l border-slate-700">
                <span className="text-neutral-300">{idempotencyKey}</span>
                <button
                  type="button"
                  onClick={regenerateIdempotencyKey}
                  className="p-0.5 text-neutral-400 hover:text-white rounded transition-colors"
                  title="Generate new token"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {lastResult && (
              <div className="flex items-center gap-1 text-[11px] pl-2 border-l border-slate-700 text-white">
                <span className="text-neutral-400">LATENCY:</span>
                <span className="text-emerald-400 font-bold">{lastResult.evaluationTimeMs}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ONE-CLICK SIMULATION SCENARIOS (Top Bar) */}
      <div className="space-y-2 font-mono bg-[#1c222e]/60 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
          <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-neutral-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>SIMULATION SCENARIOS (1-CLICK LOAD):</span>
          </span>
          <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>INSTANT VECTOR LOAD</span>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
          {/* 01 Normal Purchase (Green) */}
          <button
            type="button"
            onClick={() => handleApplyPreset('CLEAN')}
            className="p-3 rounded-lg bg-[#151922] hover:bg-[#1f2635] border border-emerald-500/30 hover:border-emerald-400 text-left transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm shadow-emerald-900/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase group-hover:text-emerald-300 transition-colors">01 Normal Purchase</div>
                <div className="text-[10px] font-sans text-neutral-400">Clean baseline transaction</div>
              </div>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-emerald-400 transition-colors font-mono">→</span>
          </button>

          {/* 02 Account Takeover (Amber) */}
          <button
            type="button"
            onClick={() => handleApplyPreset('ATO')}
            className="p-3 rounded-lg bg-[#151922] hover:bg-[#1f2635] border border-amber-500/30 hover:border-amber-400 text-left transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-sm shadow-amber-900/30">
                <KeyRound className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase group-hover:text-amber-300 transition-colors">02 Account Takeover</div>
                <div className="text-[10px] font-sans text-neutral-400">New device + location + velocity</div>
              </div>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-amber-400 transition-colors font-mono">→</span>
          </button>

          {/* 03 Velocity Attack (Purple) */}
          <button
            type="button"
            onClick={() => handleApplyPreset('VELOCITY')}
            className="p-3 rounded-lg bg-[#151922] hover:bg-[#1f2635] border border-purple-500/30 hover:border-purple-400 text-left transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400 shrink-0 shadow-sm shadow-purple-900/30">
                <RotateCw className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase group-hover:text-purple-300 transition-colors">03 Velocity Attack</div>
                <div className="text-[10px] font-sans text-neutral-400">Multiple rapid transactions</div>
              </div>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-purple-400 transition-colors font-mono">→</span>
          </button>

          {/* 04 Watchlist Merchant (Red/Rose) */}
          <button
            type="button"
            onClick={() => handleApplyPreset('WATCHLIST')}
            className="p-3 rounded-lg bg-[#151922] hover:bg-[#1f2635] border border-rose-500/30 hover:border-rose-400 text-left transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 shadow-sm shadow-rose-900/30">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase group-hover:text-rose-300 transition-colors">04 Watchlist Merchant</div>
                <div className="text-[10px] font-sans text-neutral-400">High risk merchant interaction</div>
              </div>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-rose-400 transition-colors font-mono">→</span>
          </button>
        </div>
      </div>

      {/* MIDDLE TIER: 3 COLUMN BENCHMARK GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: CUSTOMER PROFILE (4 Cols) */}
        <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-white uppercase">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>CUSTOMER PROFILE</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                currentCustomer.riskSegment === 'LOW' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' :
                currentCustomer.riskSegment === 'MEDIUM' ? 'bg-amber-950/80 border-amber-500/50 text-amber-400' :
                'bg-rose-950/80 border-rose-500/50 text-rose-400'
              }`}>
                ● {currentCustomer.riskSegment} RISK
              </span>
            </div>

            {/* Avatar & Profile Hero */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className={`w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center text-black font-black text-sm shadow-md ${
                currentCustomer.riskSegment === 'LOW' ? 'bg-gradient-to-tr from-emerald-500 to-teal-300' :
                currentCustomer.riskSegment === 'MEDIUM' ? 'bg-gradient-to-tr from-amber-500 to-yellow-300' :
                'bg-gradient-to-tr from-rose-500 to-red-400'
              }`}>
                {customerInitials}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{currentCustomer.name}</h3>
                <p className="text-xs text-neutral-400">{currentCustomer.occupation || currentCustomer.email}</p>
                <p className="text-[10px] text-cyan-400 font-mono mt-0.5">ID: {currentCustomer.id}</p>
              </div>
            </div>

            {/* Profile Metrics */}
            <div className="bg-[#151922] rounded-lg p-3 space-y-2 text-xs font-mono border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Typical Spend:</span>
                <span className="text-white font-bold">{currencySymbol}{currentCustomer.typicalSpendMin?.toLocaleString()} – {currencySymbol}{currentCustomer.typicalSpendMax?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Primary Region:</span>
                <span className="text-white font-bold">{currentCustomer.usualLocation?.split(',')[0]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Customer Since:</span>
                <span className="text-neutral-300">Aug 2022</span>
              </div>
            </div>
          </div>

          {/* Customer Profile Picker Row (All Available Profiles) */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase">
                SWITCH ACCOUNT ({customers.length} PROFILES):
              </label>
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-h-24 overflow-y-auto pr-0.5">
              {customers.map((c) => {
                const isSelected = c.id === selectedCustomerId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c.id)}
                    className={`p-1.5 rounded-lg text-left text-[11px] font-mono border transition-all flex items-center justify-between gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                        : 'bg-[#151922] text-neutral-300 border-slate-800 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{c.name.split(' ')[0]}</span>
                    <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                      isSelected ? 'bg-black/30 text-white' :
                      c.riskSegment === 'LOW' ? 'text-emerald-400 bg-emerald-950/60' :
                      c.riskSegment === 'MEDIUM' ? 'text-amber-400 bg-amber-950/60' :
                      'text-rose-400 bg-rose-950/60'
                    }`}>
                      {c.riskSegment === 'LOW' ? 'LOW' : c.riskSegment === 'MEDIUM' ? 'MED' : 'HIGH'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 2: TRANSACTION CONTEXT (4 Cols) */}
        <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-white uppercase">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span>TRANSACTION CONTEXT</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">PAYLOAD v1</span>
            </div>

            {/* Large Amount Display */}
            <div className="bg-[#151922] rounded-lg p-3 border border-slate-800/80 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase">AMOUNT:</span>
                <div className="text-2xl font-black font-mono text-white">
                  {currencySymbol}{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-[10px] font-mono text-right text-neutral-400">
                <span>EXP: {currencySymbol}{currentCustomer.typicalSpendMin}–{currencySymbol}{currentCustomer.typicalSpendMax}</span>
              </div>
            </div>

            {/* Merchant, Channel & Method Details */}
            <div className="bg-[#151922] rounded-lg p-3 space-y-2 text-xs font-mono border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Merchant:</span>
                <span className={`font-bold truncate max-w-[170px] ${isBlacklistedMerchant ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {MERCHANTS.find(m => m.id === selectedMerchantId)?.name || selectedMerchantId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Channel:</span>
                <span className="text-white font-bold">API / REST Gateway</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Protocol:</span>
                <span className="text-cyan-400 font-bold">{enableIdempotency ? 'Idempotent (Keyed)' : 'Standard HTTPS'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Evaluated At:</span>
                <span className="text-neutral-300">{lastResult ? 'Evaluated' : 'Ready'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-neutral-400 flex items-center justify-between">
            <span>ENGINE: SPRING BOOT 3.4</span>
            <span className="text-emerald-400 font-bold">REDIS 7 LUA ENGINE</span>
          </div>
        </div>

        {/* CARD 3: RISK SCORE & GAUGE (4 Cols) */}
        <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-white uppercase">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>RISK SCORE</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">0 - 100 SCALE</span>
          </div>

          {/* Radial SVG Gauge + Score */}
          <div className="flex items-center justify-center pt-1">
            <div className="relative w-44 h-24 flex items-end justify-center">
              <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
                {/* Arc Track */}
                <path
                  d="M 15 80 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#11141a"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Colored Segments */}
                <path
                  d="M 15 80 A 65 65 0 0 1 60 28"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M 60 28 A 65 65 0 0 1 100 28"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M 100 28 A 65 65 0 0 1 145 80"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </svg>
              <div className="absolute bottom-0 flex flex-col items-center">
                <span className="text-3xl font-black font-mono text-white">
                  {lastResult ? displayedScore : 0}
                </span>
                <span className="text-[10px] font-mono text-neutral-400 font-normal">/ 100</span>
              </div>
            </div>
          </div>

          {/* 4 Dimension Score Progress Bars (Calculated from Real Decision Response) */}
          <div className="space-y-1.5 text-[11px] font-mono pt-1">
            <div className="space-y-0.5">
              <div className="flex justify-between text-neutral-300">
                <span className="text-amber-400 font-bold flex items-center gap-1">⚡ Behavior Score</span>
                <span className="text-white font-bold">{behaviorScore}/100</span>
              </div>
              <div className="w-full bg-[#11141a] h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${behaviorScore}%` }}
                  className="h-full bg-amber-400 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between text-neutral-300">
                <span className="text-purple-400 font-bold flex items-center gap-1">⏱ Velocity Score</span>
                <span className="text-white font-bold">{velocityScore}/100</span>
              </div>
              <div className="w-full bg-[#11141a] h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${velocityScore}%` }}
                  className="h-full bg-purple-400 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between text-neutral-300">
                <span className="text-cyan-400 font-bold flex items-center gap-1">🕸 Entity Score</span>
                <span className="text-white font-bold">{entityScore}/100</span>
              </div>
              <div className="w-full bg-[#11141a] h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${entityScore}%` }}
                  className="h-full bg-cyan-400 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between text-neutral-300">
                <span className="text-emerald-400 font-bold flex items-center gap-1">🏷 Context Score</span>
                <span className="text-white font-bold">{contextScore}/100</span>
              </div>
              <div className="w-full bg-[#11141a] h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${contextScore}%` }}
                  className="h-full bg-emerald-400 transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Decision Box */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between font-mono ${
            !lastResult ? 'bg-[#151922] border-slate-800 text-neutral-400' :
            lastResult.decision === 'ALLOW' ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400' :
            lastResult.decision === 'REVIEW' ? 'bg-amber-950/80 border-amber-500/60 text-amber-400' :
            'bg-rose-950/80 border-rose-500/60 text-rose-400'
          }`}>
            <span className="text-xs font-bold uppercase">
              {!lastResult ? 'STATUS: READY' : `🔒 DECISION: ${lastResult.decision}`}
            </span>
            <span className="text-[10px] font-bold">
              {!lastResult ? 'STANDBY' : lastResult.decision === 'ALLOW' ? 'CLEARED' : lastResult.decision === 'REVIEW' ? 'MANUAL REVIEW' : 'HARD REJECT'}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM TIER: 3 COLUMN INTERACTION & EXPLAINABILITY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 4: ATTACK VECTOR BUILDER (4 Cols) */}
        <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between shadow-sm">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-white uppercase">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>ATTACK VECTOR BUILDER</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">THREAT INJECTION</span>
            </div>

            {/* 4 Interactive Attack Cards */}
            <div className="space-y-2">
              {/* Spend Spike */}
              <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                isUnusualAmount ? 'bg-[#151922] border-emerald-400 ring-1 ring-emerald-400/50' : 'bg-[#151922] border-slate-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-white">SPEND SPIKE</div>
                    <div className="text-[10px] text-emerald-400 font-mono font-bold">+50 Risk</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleUnusualAmount(!isUnusualAmount)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                    isUnusualAmount ? 'bg-emerald-400 text-black border-emerald-400' : 'bg-slate-800/60 text-neutral-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {isUnusualAmount ? '✓ INJECTED' : 'INJECT'}
                </button>
              </div>

              {/* Geo Anomaly */}
              <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                isLocationHop ? 'bg-[#151922] border-amber-400 ring-1 ring-amber-400/50' : 'bg-[#151922] border-slate-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-white">GEO ANOMALY</div>
                    <div className="text-[10px] text-amber-400 font-mono font-bold">+60 Risk</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationHop(!isLocationHop)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                    isLocationHop ? 'bg-amber-400 text-black border-amber-400' : 'bg-slate-800/60 text-neutral-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {isLocationHop ? '✓ INJECTED' : 'INJECT'}
                </button>
              </div>

              {/* Velocity Burst */}
              <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                isVelocityBurst ? 'bg-[#151922] border-purple-400 ring-1 ring-purple-400/50' : 'bg-[#151922] border-slate-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                    <RotateCw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-white">VELOCITY BURST</div>
                    <div className="text-[10px] text-purple-400 font-mono font-bold">+40 Risk</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVelocityBurst(!isVelocityBurst)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                    isVelocityBurst ? 'bg-purple-400 text-black border-purple-400' : 'bg-slate-800/60 text-neutral-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {isVelocityBurst ? '✓ INJECTED' : 'INJECT'}
                </button>
              </div>

              {/* Watchlist Merchant */}
              <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                isBlacklistedMerchant ? 'bg-[#151922] border-rose-400 ring-1 ring-rose-400/50' : 'bg-[#151922] border-slate-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-white">WATCHLIST MERCHANT</div>
                    <div className="text-[10px] text-rose-400 font-mono font-bold">+80 Risk</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMerchant(!isBlacklistedMerchant)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                    isBlacklistedMerchant ? 'bg-rose-400 text-black border-rose-400' : 'bg-slate-800/60 text-neutral-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {isBlacklistedMerchant ? '✓ INJECTED' : 'INJECT'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer stats */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
            <span className="text-neutral-400">ACTIVE SIGNALS: [{[isUnusualAmount, isNewDevice, isLocationHop, isBlacklistedMerchant, isVelocityBurst].filter(Boolean).length}]</span>
            <button
              type="button"
              onClick={() => {
                setIsUnusualAmount(false);
                setIsNewDevice(false);
                setIsLocationHop(false);
                setIsBlacklistedMerchant(false);
                setIsVelocityBurst(false);
              }}
              className="text-rose-400 hover:text-rose-300 transition-colors"
            >
              CLEAR ALL
            </button>
          </div>
        </div>

        {/* CARD 5: TRANSACTION TIMELINE (Real Evaluation Execution Log) */}
        <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between shadow-sm">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-white uppercase">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>TRANSACTION TIMELINE</span>
              </div>
              <span className={`text-[10px] font-mono ${lastResult ? 'text-emerald-400' : 'text-neutral-400'}`}>
                {lastResult ? 'EVALUATION COMPLETED' : 'AWAITING SIMULATION'}
              </span>
            </div>

            {/* Genuine Timeline Log */}
            {!lastResult ? (
              <div className="p-4 rounded-lg bg-[#151922] border border-slate-800 text-center space-y-2 text-xs font-mono">
                <Activity className="w-6 h-6 text-neutral-400 mx-auto animate-pulse" />
                <div className="text-white font-bold">PIPELINE STANDBY</div>
                <p className="text-[10px] text-neutral-400 font-sans">
                  Click &apos;SIMULATE TRANSACTION&apos; to trigger the evaluation pipeline.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs font-mono pl-1 pt-1">
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-white font-bold">Account Profile Verified</div>
                    <div className="text-[10px] text-neutral-400 font-sans">{currentCustomer.name} ({currentCustomer.riskSegment} Risk)</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-white font-bold">Payment Ingested</div>
                    <div className="text-[10px] text-neutral-400 font-sans">{currencySymbol}{amount} • Merchant: {selectedMerchantId}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-cyan-300 font-bold">Rules &amp; Graph Evaluated</div>
                    <div className="text-[10px] text-neutral-400 font-sans">Server Latency: {lastResult.evaluationTimeMs}ms</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    lastResult.decision === 'ALLOW' ? 'bg-emerald-400' :
                    lastResult.decision === 'REVIEW' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  <div>
                    <div className={`font-bold ${
                      lastResult.decision === 'ALLOW' ? 'text-emerald-400' :
                      lastResult.decision === 'REVIEW' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      Decision: {lastResult.decision} ({lastResult.finalScore} Pts)
                    </div>
                    <div className="text-[10px] text-neutral-400 font-sans">Txn ID: {lastResult.transactionId}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-neutral-400 flex items-center justify-between">
            <span>TXN ID:</span>
            <span className="text-cyan-400 truncate max-w-[160px]">{lastResult?.transactionId || 'Standby'}</span>
          </div>
        </div>

        {/* CARD 6: WHY WAS THIS BLOCKED? (4 Cols) */}
        <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between shadow-sm">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-white uppercase">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>EXPLAINABILITY AUDIT</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {lastResult ? `${lastResult.firedRules.length} SIGNALS` : 'STANDBY'}
              </span>
            </div>

            {!lastResult || lastResult.firedRules.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#151922] border border-slate-800 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-white font-mono">NO THREATS DETECTED</div>
                <p className="text-[10px] text-neutral-400 font-sans">
                  Transaction parameters conform to customer baseline historical profile.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {lastResult.firedRules.map((ruleText, idx) => {
                  const isHigh = ruleText.includes('50') || ruleText.includes('80') || ruleText.includes('75');
                  const isMed = ruleText.includes('40') || ruleText.includes('60');

                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#151922] border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isHigh ? 'bg-rose-950 text-rose-400 border border-rose-600/40' :
                          isMed ? 'bg-amber-950 text-amber-400 border border-amber-600/40' :
                          'bg-blue-950 text-cyan-400 border border-cyan-600/40'
                        }`}>
                          #{idx + 1}
                        </div>
                        <span className="text-[11px] text-neutral-200 truncate font-sans">{ruleText}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] text-amber-400 font-mono tracking-tighter">|||</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isHigh ? 'bg-rose-950 text-rose-300 border border-rose-600/50' :
                          isMed ? 'bg-amber-950 text-amber-300 border border-amber-600/50' :
                          'bg-slate-800 text-neutral-300 border border-slate-700'
                        }`}>
                          {isHigh ? 'HIGH' : isMed ? 'MED' : 'LOW'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
            <span className="text-neutral-400">EXPLAINABILITY: XAI-SHAP</span>
            {lastResult && (
              <button
                type="button"
                onClick={handleExportDocket}
                className="text-cyan-400 hover:text-cyan-300 font-bold"
              >
                {copiedDocket ? 'COPIED!' : 'EXPORT DOCKET →'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM GLOBAL ACTION BAR */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <button
          type="button"
          onClick={() => {
            setIsUnusualAmount(false);
            setIsNewDevice(false);
            setIsLocationHop(false);
            setIsBlacklistedMerchant(false);
            setIsVelocityBurst(false);
            setSelectedMerchantId('mer_grocery_fresh');
            const def = currentCustomer.typicalSpendMin
              ? Math.round((currentCustomer.typicalSpendMin + (currentCustomer.typicalSpendMax || 3000)) / 2)
              : 1200;
            setAmount(def);
          }}
          className="px-4 py-2.5 rounded-lg bg-[#1c222e] hover:bg-slate-700 text-neutral-300 border border-slate-700/80 text-xs font-bold transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET BASELINE</span>
        </button>

        {/* Big Cobalt Blue Primary Simulate Button */}
        <button
          type="button"
          disabled={loading || bursting}
          onClick={handleRunSimulation}
          className="flex-1 max-w-md py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-blue-900/50 disabled:opacity-50"
        >
          {loading || bursting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{bursting ? 'EXECUTING 6X BURST...' : 'SCORING TRANSACTION PIPELINE...'}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>SIMULATE TRANSACTION (CTRL+ENTER)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleExportDocket}
          className="px-4 py-2.5 rounded-lg bg-[#1c222e] hover:bg-slate-700 text-neutral-300 border border-slate-700/80 text-xs font-bold transition-colors flex items-center gap-2"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>{copiedDocket ? 'COPIED TO CLIPBOARD' : 'EXPORT REPORT'}</span>
        </button>
      </div>
    </div>
  );
}
