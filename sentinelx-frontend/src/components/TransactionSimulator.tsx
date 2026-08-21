'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, TransactionRequest, DecisionResponse, CustomerProfile } from '@/lib/api';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  KeyRound,
  RotateCw,
  UserCheck,
  SlidersHorizontal,
  HelpCircle,
  Activity,
  ShieldAlert,
  Play,
  RotateCcw,
} from 'lucide-react';

const FALLBACK_CUSTOMERS: CustomerProfile[] = [
  {
    id: 'usr_sarah',
    name: 'Sarah Khan',
    email: 'sarah.khan@example.com',
    riskSegment: 'LOW',
    typicalSpendMin: 500,
    typicalSpendMax: 3000,
    currency: 'INR',
    usualLocation: 'Delhi, India',
    usualIp: '103.21.244.10',
    primaryDevice: 'iPhone 15 Pro',
    primaryDeviceFingerprint: 'fp_sarah_iphone15_sha256',
    dailyTxnCount: 3,
    occupation: 'Graphic Designer',
    trustedDeviceFingerprints: ['fp_sarah_iphone15_sha256'],
  },
  {
    id: 'usr_arjun',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    riskSegment: 'MEDIUM',
    typicalSpendMin: 2000,
    typicalSpendMax: 8000,
    currency: 'INR',
    usualLocation: 'Mumbai, India',
    usualIp: '103.55.120.45',
    primaryDevice: 'Samsung Galaxy S24',
    primaryDeviceFingerprint: 'fp_arjun_galaxy_s24_sha256',
    dailyTxnCount: 8,
    occupation: 'Sales Director',
    trustedDeviceFingerprints: ['fp_arjun_galaxy_s24_sha256'],
  },
  {
    id: 'usr_elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    riskSegment: 'LOW',
    typicalSpendMin: 1000,
    typicalSpendMax: 5000,
    currency: 'INR',
    usualLocation: 'Bengaluru, India',
    usualIp: '103.88.90.12',
    primaryDevice: 'MacBook Pro M3',
    primaryDeviceFingerprint: 'fp_elena_macbook_sha256',
    dailyTxnCount: 4,
    occupation: 'Software Engineer',
    trustedDeviceFingerprints: ['fp_elena_macbook_sha256'],
  },
  {
    id: 'usr_david',
    name: 'David Chen',
    email: 'david.chen@example.com',
    riskSegment: 'HIGH',
    typicalSpendMin: 500,
    typicalSpendMax: 2500,
    currency: 'INR',
    usualLocation: 'Hyderabad, India',
    usualIp: '103.44.70.80',
    primaryDevice: 'Windows 11 PC',
    primaryDeviceFingerprint: 'fp_david_windows_pc',
    dailyTxnCount: 12,
    occupation: 'Freelancer (Prior Disputes)',
    trustedDeviceFingerprints: ['fp_david_windows_pc'],
  },
  {
    id: 'usr_1001',
    name: 'Alice Smith',
    email: 'alice@example.com',
    riskSegment: 'LOW',
    typicalSpendMin: 10,
    typicalSpendMax: 100,
    currency: 'USD',
    usualLocation: 'New York, USA',
    usualIp: '198.51.100.10',
    primaryDevice: 'iPhone 15',
    primaryDeviceFingerprint: 'fp_alice_iphone15_sha256',
    dailyTxnCount: 3,
    occupation: 'Product Manager',
    trustedDeviceFingerprints: ['fp_alice_iphone15_sha256'],
  },
  {
    id: 'usr_burst_demo',
    name: 'Automated Script Client',
    email: 'script_client@testnet.io',
    riskSegment: 'MEDIUM',
    typicalSpendMin: 5,
    typicalSpendMax: 20,
    currency: 'USD',
    usualLocation: 'Proxy / Anonymous',
    usualIp: '203.0.113.88',
    primaryDevice: 'Headless Linux VM',
    primaryDeviceFingerprint: 'fp_bot_vm_instance_9',
    dailyTxnCount: 50,
    occupation: 'Card-Testing Scenario',
    trustedDeviceFingerprints: [],
  },
];

const MERCHANTS = [
  { id: 'mer_grocery_fresh', name: 'Fresh Mart Grocery (Safe / Retail)', category: 'Grocery', isBlacklisted: false },
  { id: 'mer_electronics_store', name: 'Metro Electronics (Consumer Tech)', category: 'Electronics', isBlacklisted: false },
  { id: 'mer_luxury_watches', name: 'Apex Luxury Timepieces (High-Ticket)', category: 'Luxury', isBlacklisted: false },
  { id: 'mer_black_1', name: 'CryptoDrain Express (Suspicious Watchlist)', category: 'Sanctioned', isBlacklisted: true },
];

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

  // What-If Toggles (overrides applied dynamically to last result)
  const [whatIfUntrusted, setWhatIfUntrusted] = useState<boolean>(true);
  const [whatIfAmountHigh, setWhatIfAmountHigh] = useState<boolean>(true);
  const [whatIfLocationHop, setWhatIfLocationHop] = useState<boolean>(true);
  const [whatIfMerchantBlacklisted, setWhatIfMerchantBlacklisted] = useState<boolean>(true);

  // Fetch live customer profiles on mount
  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await api.customers.getAll();
        if (data && data.length > 0) {
          setCustomers(data);
        }
      } catch {
        // Fallback static profiles
      }
    }
    loadCustomers();
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
      setAmount(baselineMax * 6.5); // e.g. ₹19,500
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

        // Sync What-If states
        setWhatIfUntrusted(isNewDevice);
        setWhatIfAmountHigh(isUnusualAmount);
        setWhatIfLocationHop(isLocationHop);
        setWhatIfMerchantBlacklisted(isBlacklistedMerchant);
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
    isUnusualAmount,
    isNewDevice,
    isLocationHop,
    isBlacklistedMerchant,
    isVelocityBurst,
    enableIdempotency,
    idempotencyKey,
  ]);

  // What-If live score recalculation
  const whatIfCalculated = useMemo(() => {
    if (!lastResult) return null;

    let score = 0;
    const activeSignals: { rule: string; name: string; points: number; note: string }[] = [];

    if (currentCustomer.riskSegment === 'HIGH') {
      score += 30;
      activeSignals.push({ rule: 'RULE_06', name: 'User Risk Tier', points: 30, note: 'Account risk segment is HIGH' });
    } else if (currentCustomer.riskSegment === 'CRITICAL') {
      score += 60;
      activeSignals.push({ rule: 'RULE_06', name: 'User Risk Tier', points: 60, note: 'Account risk segment is CRITICAL' });
    }

    if (whatIfAmountHigh) {
      score += 50;
      activeSignals.push({ rule: 'RULE_03', name: 'Unusual Amount', points: 50, note: 'Spend deviates significantly from baseline profile' });
    }

    if (whatIfUntrusted) {
      score += 25;
      activeSignals.push({ rule: 'RULE_02', name: 'Untrusted Device', points: 25, note: 'Unrecognized hardware fingerprint' });
    }

    if (whatIfLocationHop) {
      score += 60;
      activeSignals.push({ rule: 'RULE_04', name: 'Location / IP Anomaly', points: 60, note: 'Payment outside normal geographical baseline' });
    }

    if (whatIfMerchantBlacklisted) {
      score += 80;
      activeSignals.push({ rule: 'RULE_05', name: 'Suspicious Merchant', points: 80, note: 'Merchant is listed on watchlist' });
    }

    if (isVelocityBurst) {
      score += 40;
      activeSignals.push({ rule: 'RULE_01', name: 'Rapid Velocity Burst', points: 40, note: 'Exceeded Redis sliding window threshold' });
    }

    let verdict: 'ALLOW' | 'REVIEW' | 'BLOCK' = 'ALLOW';
    if (score >= 70) verdict = 'BLOCK';
    else if (score >= 30) verdict = 'REVIEW';

    return { score, verdict, activeSignals };
  }, [
    lastResult,
    currentCustomer,
    whatIfAmountHigh,
    whatIfUntrusted,
    whatIfLocationHop,
    whatIfMerchantBlacklisted,
    isVelocityBurst,
  ]);

  const currencySymbol = currentCustomer.currency === 'USD' ? '$' : '₹';

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 lg:p-6 space-y-6 backdrop-blur-md shadow-2xl">
      {/* Top Banner & Dimension Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold shadow-lg shadow-indigo-950/50">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Explainable Transaction Risk Simulator
              </h2>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                Risk Laboratory
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates individual payment transactions across <strong>Behavioral</strong>, <strong>Velocity</strong>, and <strong>Relationship</strong> dimensions.
            </p>
          </div>
        </div>

        {/* Dimension Indicators & Idempotency */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400">
            <span className="text-indigo-400 font-semibold">Dim A: Behavior</span>
            <span className="text-slate-600">•</span>
            <span className="text-purple-400 font-semibold">Dim B: Velocity</span>
            <span className="text-slate-600">•</span>
            <span className="text-pink-400 font-semibold">Dim C: Network</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 text-xs">
            <button
              type="button"
              onClick={() => setEnableIdempotency(!enableIdempotency)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                enableIdempotency
                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
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
              <div className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 ml-1">
                <span className="text-slate-400">Latency:</span>
                <span className="text-emerald-400 font-bold">{lastResult.evaluationTimeMs}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STEP 1: Who is Making the Payment? */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <UserCheck className="w-4 h-4" />
            <span>1. Who is making the payment? (Customer Behavioral Baseline)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Selected: <strong className="text-slate-200">{currentCustomer.name}</strong> ({currentCustomer.usualLocation?.split(',')[0]})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {customers.map((c) => {
            const isSelected = c.id === selectedCustomerId;
            const isLow = c.riskSegment === 'LOW';
            const isMed = c.riskSegment === 'MEDIUM';
            const isHigh = c.riskSegment === 'HIGH';

            const badgeBg = isLow
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
              : isMed
              ? 'bg-amber-950/80 text-amber-400 border-amber-800/50'
              : 'bg-rose-950/80 text-rose-400 border-rose-800/50';

            const sym = c.currency === 'USD' ? '$' : '₹';

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCustomer(c.id)}
                className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs text-slate-100 truncate">{c.name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${badgeBg}`}>
                      {c.riskSegment}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{c.occupation || c.email}</p>
                </div>

                <div className="border-t border-slate-800/80 pt-1.5 space-y-0.5 text-[10px] font-mono text-slate-300">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Baseline Spend:</span>
                    <span className="text-slate-200">
                      {sym}{c.typicalSpendMin?.toLocaleString()}–{sym}{c.typicalSpendMax?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 truncate">
                    <span>Location:</span>
                    <span className="text-slate-200 truncate">{c.usualLocation?.split(',')[0]}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Transaction Details & Suspicious Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-800/80">
        {/* Left: Input Form + Suspicious Condition Toggles */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <SlidersHorizontal className="w-4 h-4" />
            <span>2. What are they buying &amp; What looks suspicious?</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                <span>Transaction Amount ({currencySymbol})</span>
                <span className="text-[10px] text-slate-400">
                  Expected: {currencySymbol}{currentCustomer.typicalSpendMin?.toLocaleString()}–{currencySymbol}{currentCustomer.typicalSpendMax?.toLocaleString()}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">{currencySymbol}</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(Number(e.target.value));
                    setIsUnusualAmount(false);
                  }}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Merchant Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">Target Merchant</label>
              <select
                value={selectedMerchantId}
                onChange={(e) => {
                  setSelectedMerchantId(e.target.value);
                  setIsBlacklistedMerchant(e.target.value === 'mer_black_1');
                }}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none transition-colors"
              >
                {MERCHANTS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Simulate Suspicious Conditions */}
          <div className="space-y-2 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Suspicious Conditions:</span>
              </span>
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
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Clean</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Condition 1: Unusual Amount Spike */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                isUnusualAmount ? 'bg-amber-950/40 border-amber-700/60 text-amber-200' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isUnusualAmount}
                  onChange={(e) => handleToggleUnusualAmount(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>Unusual Amount</span>
                    <span className="text-[10px] font-mono text-amber-400">+50 pts</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Sets amount significantly above normal spend baseline</p>
                </div>
              </label>

              {/* Condition 2: New / Untrusted Device */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                isNewDevice ? 'bg-indigo-950/40 border-indigo-700/60 text-indigo-200' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isNewDevice}
                  onChange={(e) => setIsNewDevice(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>New / Untrusted Device</span>
                    <span className="text-[10px] font-mono text-indigo-400">+25 pts</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Unrecognized browser / SHA-256 fingerprint</p>
                </div>
              </label>

              {/* Condition 3: Geolocation / IP Anomaly */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                isLocationHop ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-200' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isLocationHop}
                  onChange={(e) => setIsLocationHop(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>Geolocation / IP Anomaly</span>
                    <span className="text-[10px] font-mono text-cyan-400">+60 pts</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Payment from unfamiliar geography or VPN proxy</p>
                </div>
              </label>

              {/* Condition 4: Suspicious Merchant */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                isBlacklistedMerchant ? 'bg-rose-950/40 border-rose-700/60 text-rose-200' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isBlacklistedMerchant}
                  onChange={(e) => handleToggleMerchant(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>Suspicious Merchant</span>
                    <span className="text-[10px] font-mono text-rose-400">+80 pts</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Routes to merchant on high-risk watchlist</p>
                </div>
              </label>

              {/* Condition 5: Rapid Transaction Velocity (Redis) */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all sm:col-span-2 ${
                isVelocityBurst ? 'bg-purple-950/40 border-purple-700/60 text-purple-200' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isVelocityBurst}
                  onChange={(e) => setIsVelocityBurst(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>Rapid Transaction Velocity (Redis ZSET Sliding Window)</span>
                    <span className="text-[10px] font-mono text-purple-400">+40 pts</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Simulates card-testing burst (6 transactions in &lt; 1s) to exceed velocity limits</p>
                </div>
              </label>
            </div>
          </div>

          {/* Simulate Action Button */}
          <button
            type="button"
            disabled={loading || bursting}
            onClick={handleRunSimulation}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading || bursting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{bursting ? 'Simulating 6x Velocity Burst...' : 'Evaluating Risk Pipeline (< 15ms)...'}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Simulate Payment &amp; Evaluate Risk</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Step 3 (What Does SentinelX Think?) & Step 4 (Why? + What-If) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Activity className="w-4 h-4" />
            <span>3 &amp; 4. What does SentinelX think &amp; Why?</span>
          </div>

          {!lastResult ? (
            <div className="h-full min-h-[300px] border border-dashed border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 text-slate-500 bg-slate-950/30">
              <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
              <p className="text-xs font-medium text-slate-400">No Transaction Evaluated Yet</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Select a customer profile, adjust conditions, and click <strong>Simulate Payment &amp; Evaluate Risk</strong> to see the real-time verdict.
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  lastResult.decision === 'ALLOW'
                    ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                    : lastResult.decision === 'REVIEW'
                    ? 'bg-amber-950/70 border-amber-700/60 text-amber-300'
                    : 'bg-rose-950/70 border-rose-700/60 text-rose-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastResult.decision === 'ALLOW' && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />}
                  {lastResult.decision === 'REVIEW' && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />}
                  {lastResult.decision === 'BLOCK' && <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold tracking-tight">DECISION: {lastResult.decision}</span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800">
                        Score: {lastResult.finalScore} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-300/90 mt-0.5">
                      {lastResult.decision === 'ALLOW'
                        ? 'Low risk score (< 30). Transaction is consistent with profile.'
                        : lastResult.decision === 'REVIEW'
                        ? 'Moderate risk score (30–69). Routed to compliance queue for verification.'
                        : 'High risk score (70+). Transaction blocked due to multiple suspicious anomalies.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Risk Gauge Meter */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>ALLOW (0–29)</span>
                  <span>REVIEW (30–69)</span>
                  <span>BLOCK (70–100)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, lastResult.finalScore)}%` }}
                    className={`h-full transition-all duration-500 rounded-full ${
                      lastResult.finalScore < 30
                        ? 'bg-emerald-400'
                        : lastResult.finalScore < 70
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>
              </div>

              {/* Explainability Signal Breakdown */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-xs font-bold text-slate-200">Why? (Triggered Risk Signals)</span>
                  <span className="text-[10px] font-mono text-slate-400">{lastResult.firedRules.length} Signals Detected</span>
                </div>

                {lastResult.firedRules.length === 0 ? (
                  <p className="text-xs text-emerald-400/90 py-1">
                    ✓ Clean transaction. Transaction parameters match {currentCustomer.name}&apos;s behavioral baseline.
                  </p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {lastResult.firedRules.map((ruleText, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-start gap-2 text-slate-300">
                        <span className="text-amber-400 font-mono font-bold text-[11px] shrink-0 mt-0.5">#{idx + 1}</span>
                        <span className="text-[11px] leading-relaxed">{ruleText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* What-If Sensitivity Studio */}
              {whatIfCalculated && (
                <div className="bg-slate-950/90 border border-indigo-900/40 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Interactive &quot;What-If&quot; Sensitivity Studio</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      whatIfCalculated.verdict === 'ALLOW'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                        : whatIfCalculated.verdict === 'REVIEW'
                        ? 'bg-amber-950/80 text-amber-400 border-amber-800/40'
                        : 'bg-rose-950/80 text-rose-400 border-rose-800/40'
                    }`}>
                      Recalculated: {whatIfCalculated.verdict} ({whatIfCalculated.score} pts)
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Demonstrate signal sensitivity live in interviews by toggling individual conditions:
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfAmountHigh}
                        onChange={(e) => setWhatIfAmountHigh(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600"
                      />
                      <span>Amount Anomaly</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfUntrusted}
                        onChange={(e) => setWhatIfUntrusted(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600"
                      />
                      <span>Untrusted Device</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfLocationHop}
                        onChange={(e) => setWhatIfLocationHop(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600"
                      />
                      <span>Location Anomaly</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfMerchantBlacklisted}
                        onChange={(e) => setWhatIfMerchantBlacklisted(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600"
                      />
                      <span>Suspicious Merchant</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
