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
    <div className="bg-[#353535] border border-white rounded-lg p-5 lg:p-6 space-y-6 text-white">
      {/* Top Banner & Dimension Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-bold text-white tracking-wide uppercase">
                RISK_EVALUATION_WORKBENCH // TRANSACTION_SIMULATOR
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#353535] text-white border border-white">
                LIVE_MODE
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-mono mt-0.5">
              Multi-dimensional evaluation: [DIM_A: BEHAVIOR] • [DIM_B: VELOCITY] • [DIM_C: ENTITY_GRAPH]
            </p>
          </div>
        </div>

        {/* Idempotency & Latency Telemetry */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#353535] border border-white rounded px-2.5 py-1">
            <button
              type="button"
              onClick={() => setEnableIdempotency(!enableIdempotency)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors ${
                enableIdempotency
                  ? 'bg-white text-black font-bold border border-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <KeyRound className="w-3 h-3" />
              <span>IDEMPOTENCY: {enableIdempotency ? 'ON' : 'OFF'}</span>
            </button>

            {enableIdempotency && (
              <div className="flex items-center gap-1.5 text-[11px] pl-1 text-white border-l border-white">
                <span className="text-neutral-300">{idempotencyKey}</span>
                <button
                  type="button"
                  onClick={regenerateIdempotencyKey}
                  className="p-0.5 text-white hover:bg-white/20 rounded transition-colors"
                  title="Generate new token"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
            )}

            {lastResult && (
              <div className="flex items-center gap-1 text-[11px] pl-2 border-l border-white text-white">
                <span>LATENCY:</span>
                <span className="text-white font-bold">{lastResult.evaluationTimeMs}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: Customer Profile Baseline Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
            <UserCheck className="w-3.5 h-3.5 text-white" />
            <span>01 // SELECT CUSTOMER PROFILE (BEHAVIORAL BASELINE)</span>
          </div>
          <span className="text-[11px] text-neutral-300">
            ACTIVE_ACCOUNT: <span className="text-white font-bold">{currentCustomer.name}</span> ({currentCustomer.usualLocation?.split(',')[0]})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
          {customers.map((c) => {
            const isSelected = c.id === selectedCustomerId;
            const sym = c.currency === 'USD' ? '$' : '₹';

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCustomer(c.id)}
                className={`p-2.5 rounded text-left transition-all border flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-white text-black font-semibold border-white ring-2 ring-white'
                    : 'bg-[#353535] border-white text-white hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs truncate">{c.name}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded border ${isSelected ? 'border-black text-black' : 'border-white text-white'}`}>
                      {c.riskSegment}
                    </span>
                  </div>
                  <p className={`text-[10px] truncate ${isSelected ? 'text-neutral-700' : 'text-neutral-300'}`}>{c.occupation || c.email}</p>
                </div>

                <div className={`border-t pt-1.5 space-y-0.5 text-[10px] ${isSelected ? 'border-neutral-300 text-neutral-800' : 'border-white/60 text-neutral-300'}`}>
                  <div className="flex items-center justify-between">
                    <span>SPEND:</span>
                    <span className="font-bold">
                      {sym}{c.typicalSpendMin?.toLocaleString()}–{sym}{c.typicalSpendMax?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between truncate">
                    <span>REGION:</span>
                    <span className="truncate">{c.usualLocation?.split(',')[0]}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Transaction Details & Anomaly Ingestion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-white font-mono">
        {/* Left: Input Form + Anomaly Injections */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
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
              className="text-[10px] text-white px-2 py-0.5 rounded border border-white hover:bg-white hover:text-black flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET_BASELINE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount Input */}
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-200 flex items-center justify-between">
                <span>AMOUNT ({currencySymbol})</span>
                <span className="text-[10px] text-neutral-300">
                  EXP: {currencySymbol}{currentCustomer.typicalSpendMin?.toLocaleString()}–{currencySymbol}{currentCustomer.typicalSpendMax?.toLocaleString()}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-neutral-300">{currencySymbol}</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(Number(e.target.value));
                    setIsUnusualAmount(false);
                  }}
                  className="w-full bg-[#353535] border border-white rounded pl-6 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
                />
              </div>
            </div>

            {/* Merchant Selector */}
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-200">TARGET_MERCHANT</label>
              <select
                value={selectedMerchantId}
                onChange={(e) => {
                  setSelectedMerchantId(e.target.value);
                  setIsBlacklistedMerchant(e.target.value === 'mer_black_1');
                }}
                className="w-full bg-[#353535] border border-white rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
              >
                {MERCHANTS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#353535] text-white">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Anomaly Vector Matrix */}
          <div className="space-y-2 bg-[#353535] border border-white rounded p-3">
            <div className="text-[11px] text-white font-semibold uppercase tracking-wider flex items-center justify-between pb-1 border-b border-white">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
                <span>INJECT ANOMALY SIGNALS:</span>
              </span>
              <span className="text-[10px] text-neutral-300">SELECT TO SIMULATE ATTACK</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Condition 1: Unusual Amount Spike */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isUnusualAmount ? 'bg-white text-black font-bold border-white' : 'bg-[#353535] border-white text-white hover:bg-white/10'
              }`}>
                <input
                  type="checkbox"
                  checked={isUnusualAmount}
                  onChange={(e) => handleToggleUnusualAmount(e.target.checked)}
                  className="mt-0.5 rounded border-white accent-black"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>ANOMALY_SPEND_SPIKE</span>
                    <span className={`text-[10px] font-bold ${isUnusualAmount ? 'text-black' : 'text-white'}`}>+50 PTS</span>
                  </div>
                  <p className={`text-[10px] ${isUnusualAmount ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>Forces spend significantly above historical baseline</p>
                </div>
              </label>

              {/* Condition 2: New / Untrusted Device */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isNewDevice ? 'bg-white text-black font-bold border-white' : 'bg-[#353535] border-white text-white hover:bg-white/10'
              }`}>
                <input
                  type="checkbox"
                  checked={isNewDevice}
                  onChange={(e) => setIsNewDevice(e.target.checked)}
                  className="mt-0.5 rounded border-white accent-black"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>UNTRUSTED_HARDWARE_FP</span>
                    <span className={`text-[10px] font-bold ${isNewDevice ? 'text-black' : 'text-white'}`}>+25 PTS</span>
                  </div>
                  <p className={`text-[10px] ${isNewDevice ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>Unrecognized client SHA-256 hardware hash</p>
                </div>
              </label>

              {/* Condition 3: Geolocation / IP Anomaly */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isLocationHop ? 'bg-white text-black font-bold border-white' : 'bg-[#353535] border-white text-white hover:bg-white/10'
              }`}>
                <input
                  type="checkbox"
                  checked={isLocationHop}
                  onChange={(e) => setIsLocationHop(e.target.checked)}
                  className="mt-0.5 rounded border-white accent-black"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>GEO_IP_SUBNET_HOP</span>
                    <span className={`text-[10px] font-bold ${isLocationHop ? 'text-black' : 'text-white'}`}>+60 PTS</span>
                  </div>
                  <p className={`text-[10px] ${isLocationHop ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>Originates outside customer usual subnet/region</p>
                </div>
              </label>

              {/* Condition 4: Suspicious Merchant */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                isBlacklistedMerchant ? 'bg-white text-black font-bold border-white' : 'bg-[#353535] border-white text-white hover:bg-white/10'
              }`}>
                <input
                  type="checkbox"
                  checked={isBlacklistedMerchant}
                  onChange={(e) => handleToggleMerchant(e.target.checked)}
                  className="mt-0.5 rounded border-white accent-black"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>WATCHLIST_MERCHANT</span>
                    <span className={`text-[10px] font-bold ${isBlacklistedMerchant ? 'text-black' : 'text-white'}`}>+80 PTS</span>
                  </div>
                  <p className={`text-[10px] ${isBlacklistedMerchant ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>Routes to blacklisted / sanctioned entity</p>
                </div>
              </label>

              {/* Condition 5: Rapid Transaction Velocity (Redis) */}
              <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors sm:col-span-2 ${
                isVelocityBurst ? 'bg-white text-black font-bold border-white' : 'bg-[#353535] border-white text-white hover:bg-white/10'
              }`}>
                <input
                  type="checkbox"
                  checked={isVelocityBurst}
                  onChange={(e) => setIsVelocityBurst(e.target.checked)}
                  className="mt-0.5 rounded border-white accent-black"
                />
                <div>
                  <div className="font-semibold text-[11px] flex items-center justify-between">
                    <span>VELOCITY_BURST_ATTACK (REDIS_ZSET)</span>
                    <span className={`text-[10px] font-bold ${isVelocityBurst ? 'text-black' : 'text-white'}`}>+40 PTS</span>
                  </div>
                  <p className={`text-[10px] ${isVelocityBurst ? 'text-neutral-800 font-normal' : 'text-neutral-300'}`}>Fires 6 sequential payments in &lt;1s to trip sliding window rate limit</p>
                </div>
              </label>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={loading || bursting}
            onClick={handleRunSimulation}
            className="w-full py-2.5 px-4 rounded bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-white disabled:opacity-50"
          >
            {loading || bursting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{bursting ? 'EXECUTING_6X_BURST...' : 'SCORING_TRANSACTION_PIPELINE...'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>EXECUTE_PAYMENT_SCORING</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Step 3 & 4 (Decision Verdict & Signal Decomposition) */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-white" />
            <span>03 // DECISION VERDICT &amp; SIGNAL AUDIT</span>
          </div>

          {!lastResult ? (
            <div className="h-[340px] border border-white rounded p-6 flex flex-col items-center justify-center text-center space-y-2 text-neutral-300 bg-[#353535]">
              <HelpCircle className="w-6 h-6 text-white" />
              <p className="text-xs font-semibold text-white uppercase">NO_TRANSACTION_EVALUATED</p>
              <p className="text-[11px] text-neutral-300 max-w-xs font-sans">
                Select a customer profile, configure anomaly vectors, and click EXECUTE_PAYMENT_SCORING to evaluate against active rules.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Verdict Summary Block */}
              <div className="p-3.5 rounded border border-white bg-[#353535] flex items-start justify-between gap-3 text-white">
                <div className="flex items-start gap-3">
                  {lastResult.decision === 'ALLOW' && <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />}
                  {lastResult.decision === 'REVIEW' && <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />}
                  {lastResult.decision === 'BLOCK' && <XCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tracking-wider uppercase">VERDICT: {lastResult.decision}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-black border border-white font-bold">
                        SCORE: {lastResult.finalScore}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-200 mt-1 font-sans">
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
              <div className="bg-[#353535] border border-white rounded p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-300">
                  <span>ALLOW [0-29]</span>
                  <span>REVIEW [30-69]</span>
                  <span>BLOCK [70-100]</span>
                </div>
                <div className="w-full bg-[#2a2a2a] h-2 rounded border border-white overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, lastResult.finalScore)}%` }}
                    className="h-full bg-white transition-all duration-300"
                  />
                </div>
              </div>

              {/* Triggered Signals Audit List */}
              <div className="bg-[#353535] border border-white rounded p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-white pb-1 text-[11px]">
                  <span className="font-semibold text-white uppercase">FIRED_RISK_SIGNALS</span>
                  <span className="text-[10px] text-neutral-300">{lastResult.firedRules.length} DETECTED</span>
                </div>

                {lastResult.firedRules.length === 0 ? (
                  <p className="text-xs text-white py-0.5 font-sans">
                    [CLEAN] All transaction parameters conform to account baseline.
                  </p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {lastResult.firedRules.map((ruleText, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#353535] border border-white flex items-start gap-2 text-white">
                        <span className="font-bold text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                        <span className="text-[11px] leading-tight font-sans text-neutral-200">{ruleText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* What-If Live Sensitivity Matrix */}
              {whatIfCalculated && (
                <div className="bg-[#353535] border border-white rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-white uppercase">WHAT_IF_SENSITIVITY_MATRIX</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded border border-white bg-white text-black font-bold">
                      {whatIfCalculated.verdict} ({whatIfCalculated.score} PTS)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <label className={`flex items-center gap-1.5 p-1 rounded border border-white cursor-pointer ${whatIfAmountHigh ? 'bg-white text-black font-bold' : 'text-white hover:bg-white/10'}`}>
                      <input
                        type="checkbox"
                        checked={whatIfAmountHigh}
                        onChange={(e) => setWhatIfAmountHigh(e.target.checked)}
                        className="rounded border-white accent-black"
                      />
                      <span>AMOUNT_SPEND</span>
                    </label>

                    <label className={`flex items-center gap-1.5 p-1 rounded border border-white cursor-pointer ${whatIfUntrusted ? 'bg-white text-black font-bold' : 'text-white hover:bg-white/10'}`}>
                      <input
                        type="checkbox"
                        checked={whatIfUntrusted}
                        onChange={(e) => setWhatIfUntrusted(e.target.checked)}
                        className="rounded border-white accent-black"
                      />
                      <span>DEVICE_FP</span>
                    </label>

                    <label className={`flex items-center gap-1.5 p-1 rounded border border-white cursor-pointer ${whatIfLocationHop ? 'bg-white text-black font-bold' : 'text-white hover:bg-white/10'}`}>
                      <input
                        type="checkbox"
                        checked={whatIfLocationHop}
                        onChange={(e) => setWhatIfLocationHop(e.target.checked)}
                        className="rounded border-white accent-black"
                      />
                      <span>GEO_SUBNET</span>
                    </label>

                    <label className={`flex items-center gap-1.5 p-1 rounded border border-white cursor-pointer ${whatIfMerchantBlacklisted ? 'bg-white text-black font-bold' : 'text-white hover:bg-white/10'}`}>
                      <input
                        type="checkbox"
                        checked={whatIfMerchantBlacklisted}
                        onChange={(e) => setWhatIfMerchantBlacklisted(e.target.checked)}
                        className="rounded border-white accent-black"
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
