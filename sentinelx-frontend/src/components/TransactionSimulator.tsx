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
    <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-5 lg:p-6 space-y-6">
      {/* Top Banner & Dimension Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-bold text-slate-100 tracking-wide uppercase">
                RISK_EVALUATION_WORKBENCH // TRANSACTION_SIMULATOR
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                LIVE_MODE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Multi-dimensional evaluation: [DIM_A: BEHAVIOR] • [DIM_B: VELOCITY] • [DIM_C: ENTITY_GRAPH]
            </p>
          </div>
        </div>

        {/* Idempotency & Latency Telemetry */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#090C10] border border-slate-800 rounded px-2.5 py-1">
            <button
              type="button"
              onClick={() => setEnableIdempotency(!enableIdempotency)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors ${
                enableIdempotency
                  ? 'bg-blue-950 text-blue-300 border border-blue-800/80 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3 h-3" />
              <span>IDEMPOTENCY: {enableIdempotency ? 'ON' : 'OFF'}</span>
            </button>

            {enableIdempotency && (
              <div className="flex items-center gap-1.5 text-[11px] pl-1 text-slate-300 border-l border-slate-800">
                <span className="text-slate-400">{idempotencyKey}</span>
                <button
                  type="button"
                  onClick={regenerateIdempotencyKey}
                  className="p-0.5 text-slate-500 hover:text-slate-200 transition-colors"
                  title="Generate new token"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
            )}

            {lastResult && (
              <div className="flex items-center gap-1 text-[11px] pl-2 border-l border-slate-800 text-slate-400">
                <span>LATENCY:</span>
                <span className="text-emerald-400 font-bold">{lastResult.evaluationTimeMs}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: Customer Profile Baseline Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>01 // SELECT CUSTOMER PROFILE (BEHAVIORAL BASELINE)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            ACTIVE_ACCOUNT: <span className="text-slate-200 font-semibold">{currentCustomer.name}</span> ({currentCustomer.usualLocation?.split(',')[0]})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
          {customers.map((c) => {
            const isSelected = c.id === selectedCustomerId;
            const isLow = c.riskSegment === 'LOW';
            const isMed = c.riskSegment === 'MEDIUM';
            const isHigh = c.riskSegment === 'HIGH';

            const tierBadge = isLow
              ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40'
              : isMed
              ? 'text-amber-400 border-amber-800/80 bg-amber-950/40'
              : isHigh
              ? 'text-orange-400 border-orange-800/80 bg-orange-950/40'
              : 'text-red-400 border-red-800/80 bg-red-950/40';

            const sym = c.currency === 'USD' ? '$' : '₹';

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCustomer(c.id)}
                className={`p-2.5 rounded text-left transition-all border flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500 ring-1 ring-blue-500/80 text-slate-100'
                    : 'bg-[#090C10] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs text-slate-100 truncate">{c.name}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded border ${tierBadge}`}>
                      {c.riskSegment}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{c.occupation || c.email}</p>
                </div>

                <div className="border-t border-slate-800/80 pt-1.5 space-y-0.5 text-[10px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>SPEND_LIMIT:</span>
                    <span className="text-slate-200">
                      {sym}{c.typicalSpendMin?.toLocaleString()}–{sym}{c.typicalSpendMax?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between truncate">
                    <span>REGION:</span>
                    <span className="text-slate-200 truncate">{c.usualLocation?.split(',')[0]}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Transaction Details & Anomaly Ingestion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-800 font-mono">
        {/* Left: Input Form + Anomaly Injections */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>02 // TRANSACTION PARAMETERS &amp; ANOMALY INJECTION</span>
            </div>
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
              <span>RESET_BASELINE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount Input */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>AMOUNT ({currencySymbol})</span>
                <span className="text-[10px] text-slate-500">
                  EXP: {currencySymbol}{currentCustomer.typicalSpendMin?.toLocaleString()}–{currencySymbol}{currentCustomer.typicalSpendMax?.toLocaleString()}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">{currencySymbol}</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(Number(e.target.value));
                    setIsUnusualAmount(false);
                  }}
                  className="w-full bg-[#090C10] border border-slate-800 focus:border-blue-500 rounded pl-6 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Merchant Selector */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">TARGET_MERCHANT</label>
              <select
                value={selectedMerchantId}
                onChange={(e) => {
                  setSelectedMerchantId(e.target.value);
                  setIsBlacklistedMerchant(e.target.value === 'mer_black_1');
                }}
                className="w-full bg-[#090C10] border border-slate-800 focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none transition-colors"
              >
                {MERCHANTS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Anomaly Vector Matrix */}
          <div className="space-y-2 bg-[#090C10] border border-slate-800 rounded p-3">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>INJECT ANOMALY SIGNALS:</span>
              </span>
              <span className="text-[10px] text-slate-500">SELECT TO SIMULATE ATTACK</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Condition 1: Unusual Amount Spike */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isUnusualAmount ? 'bg-amber-950/30 border-amber-700/80 text-amber-200' : 'bg-[#0E1219] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isUnusualAmount}
                  onChange={(e) => handleToggleUnusualAmount(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>ANOMALY_SPEND_SPIKE</span>
                    <span className="text-[10px] text-amber-400 font-bold">+50 PTS</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Forces spend significantly above historical baseline</p>
                </div>
              </label>

              {/* Condition 2: New / Untrusted Device */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isNewDevice ? 'bg-blue-950/30 border-blue-700/80 text-blue-200' : 'bg-[#0E1219] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isNewDevice}
                  onChange={(e) => setIsNewDevice(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>UNTRUSTED_HARDWARE_FP</span>
                    <span className="text-[10px] text-blue-400 font-bold">+25 PTS</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Unrecognized client SHA-256 hardware hash</p>
                </div>
              </label>

              {/* Condition 3: Geolocation / IP Anomaly */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isLocationHop ? 'bg-cyan-950/30 border-cyan-700/80 text-cyan-200' : 'bg-[#0E1219] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isLocationHop}
                  onChange={(e) => setIsLocationHop(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>GEO_IP_SUBNET_HOP</span>
                    <span className="text-[10px] text-cyan-400 font-bold">+60 PTS</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Originates outside customer usual subnet/region</p>
                </div>
              </label>

              {/* Condition 4: Suspicious Merchant */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isBlacklistedMerchant ? 'bg-red-950/30 border-red-700/80 text-red-200' : 'bg-[#0E1219] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isBlacklistedMerchant}
                  onChange={(e) => handleToggleMerchant(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>WATCHLIST_MERCHANT</span>
                    <span className="text-[10px] text-red-400 font-bold">+80 PTS</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Routes to blacklisted / sanctioned entity</p>
                </div>
              </label>

              {/* Condition 5: Rapid Transaction Velocity (Redis) */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors sm:col-span-2 ${
                isVelocityBurst ? 'bg-purple-950/30 border-purple-700/80 text-purple-200' : 'bg-[#0E1219] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={isVelocityBurst}
                  onChange={(e) => setIsVelocityBurst(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>VELOCITY_BURST_ATTACK (REDIS_ZSET)</span>
                    <span className="text-[10px] text-purple-400 font-bold">+40 PTS</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Fires 6 sequential payments in &lt;1s to trip sliding window rate limit</p>
                </div>
              </label>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={loading || bursting}
            onClick={handleRunSimulation}
            className="w-full py-2.5 px-4 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading || bursting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{bursting ? 'EXECUTING_6X_BURST...' : 'SCORING_TRANSACTION_PIPELINE...'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>EXECUTE_PAYMENT_SCORING</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Step 3 & 4 (Decision Verdict & Signal Decomposition) */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>03 // DECISION VERDICT &amp; SIGNAL AUDIT</span>
          </div>

          {!lastResult ? (
            <div className="h-[340px] border border-slate-800 rounded p-6 flex flex-col items-center justify-center text-center space-y-2 text-slate-500 bg-[#090C10]">
              <HelpCircle className="w-6 h-6 text-slate-600" />
              <p className="text-xs font-semibold text-slate-400 uppercase">NO_TRANSACTION_EVALUATED</p>
              <p className="text-[11px] text-slate-500 max-w-xs font-sans">
                Select a customer profile, configure anomaly vectors, and click EXECUTE_PAYMENT_SCORING to evaluate against active rules.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Verdict Summary Block */}
              <div
                className={`p-3.5 rounded border flex items-start justify-between gap-3 ${
                  lastResult.decision === 'ALLOW'
                    ? 'bg-[#0B1A14] border-emerald-800/80 text-emerald-300'
                    : lastResult.decision === 'REVIEW'
                    ? 'bg-[#1A140B] border-amber-800/80 text-amber-300'
                    : 'bg-[#1A0B0B] border-red-800/80 text-red-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastResult.decision === 'ALLOW' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                  {lastResult.decision === 'REVIEW' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                  {lastResult.decision === 'BLOCK' && <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tracking-wider uppercase">VERDICT: {lastResult.decision}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-current font-bold">
                        SCORE: {lastResult.finalScore}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 font-sans">
                      {lastResult.decision === 'ALLOW'
                        ? 'Low risk score (< 30). Transaction attributes conform to customer baseline.'
                        : lastResult.decision === 'REVIEW'
                        ? 'Moderate risk score (30–69). Routed to compliance queue for human analyst resolution.'
                        : 'High risk score (70+). Hard rejection triggered due to critical anomaly penalty aggregation.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Score Meter */}
              <div className="bg-[#090C10] border border-slate-800 rounded p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>ALLOW [0-29]</span>
                  <span>REVIEW [30-69]</span>
                  <span>BLOCK [70-100]</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, lastResult.finalScore)}%` }}
                    className={`h-full transition-all duration-300 ${
                      lastResult.finalScore < 30
                        ? 'bg-emerald-500'
                        : lastResult.finalScore < 70
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>

              {/* Triggered Signals Audit List */}
              <div className="bg-[#090C10] border border-slate-800 rounded p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[11px]">
                  <span className="font-semibold text-slate-300 uppercase">FIRED_RISK_SIGNALS</span>
                  <span className="text-[10px] text-slate-500">{lastResult.firedRules.length} DETECTED</span>
                </div>

                {lastResult.firedRules.length === 0 ? (
                  <p className="text-xs text-emerald-400 py-0.5">
                    [CLEAN] All transaction parameters conform to account baseline.
                  </p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {lastResult.firedRules.map((ruleText, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#0E1219] border border-slate-800 flex items-start gap-2 text-slate-300">
                        <span className="text-blue-400 font-bold text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                        <span className="text-[11px] leading-tight font-sans">{ruleText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* What-If Live Sensitivity Matrix */}
              {whatIfCalculated && (
                <div className="bg-[#090C10] border border-slate-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300 uppercase">WHAT_IF_SENSITIVITY_MATRIX</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold ${
                      whatIfCalculated.verdict === 'ALLOW'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                        : whatIfCalculated.verdict === 'REVIEW'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                        : 'bg-red-950/40 text-red-400 border-red-800/60'
                    }`}>
                      {whatIfCalculated.verdict} ({whatIfCalculated.score} PTS)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <label className="flex items-center gap-1.5 p-1 rounded bg-[#0E1219] border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfAmountHigh}
                        onChange={(e) => setWhatIfAmountHigh(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span>AMOUNT_SPEND</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-1 rounded bg-[#0E1219] border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfUntrusted}
                        onChange={(e) => setWhatIfUntrusted(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span>DEVICE_FP</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-1 rounded bg-[#0E1219] border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfLocationHop}
                        onChange={(e) => setWhatIfLocationHop(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span>GEO_SUBNET</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-1 rounded bg-[#0E1219] border border-slate-800 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatIfMerchantBlacklisted}
                        onChange={(e) => setWhatIfMerchantBlacklisted(e.target.checked)}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span>WATCHLIST</span>
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
