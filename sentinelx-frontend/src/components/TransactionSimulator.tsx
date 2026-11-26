'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, TransactionRequest, DecisionResponse, CustomerProfile, TransactionResponse } from '@/lib/api';
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
  ChevronDown,
  ChevronUp,
  Network,
  Clock,
  Laptop,
  Smartphone,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

let burstCounter = 1000;

export function TransactionSimulator() {
  const [customers, setCustomers] = useState<CustomerProfile[]>(FALLBACK_CUSTOMERS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('usr_alice');
  const [loading, setLoading] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [burstProgress, setBurstProgress] = useState<{ current: number; total: number; fired: boolean } | null>(null);
  const [lastResult, setLastResult] = useState<DecisionResponse | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionResponse[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  // Simulation Controls & Engine Mode
  const [activeScenario, setActiveScenario] = useState<'CLEAN' | 'ATO' | 'VELOCITY' | 'WATCHLIST' | 'COLLUSION' | 'CUSTOM'>('CLEAN');
  const [inspectorMode, setInspectorMode] = useState<boolean>(false);
  const [inspectorStep, setInspectorStep] = useState<number>(0);
  const [enableIdempotency, setEnableIdempotency] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('idemp_demo_001');

  // Form State
  const [amount, setAmount] = useState<number>(18.50);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('mer_coffee_beans');
  const [isVelocityBurst, setIsVelocityBurst] = useState<boolean>(false);
  const [isNewDevice, setIsNewDevice] = useState<boolean>(false);
  const [isLocationHop, setIsLocationHop] = useState<boolean>(false);
  const [isBlacklistedMerchant, setIsBlacklistedMerchant] = useState<boolean>(false);
  const [isCollusionDevice, setIsCollusionDevice] = useState<boolean>(false);

  // Interactive Sensitivity Playground State
  const [sensitivityAmount, setSensitivityAmount] = useState<number>(18.50);

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
        // Use fallback profiles
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

  // Fetch recent legitimate transactions for selected persona
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      try {
        const data = await api.transactions.getRecent(0, 3, selectedCustomerId);
        if (isMounted && data) {
          setRecentTransactions(data);
        }
      } catch {
        if (isMounted) setRecentTransactions([]);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedCustomerId]);

  const currencySymbol = useMemo(() => {
    if (currentCustomer.currency === 'USD') return '$';
    if (currentCustomer.currency === 'INR') return '₹';
    if (currentCustomer.currency === 'GBP') return '£';
    if (currentCustomer.currency === 'EUR') return '€';
    return '$';
  }, [currentCustomer.currency]);

  // Initialize defaults when selecting customer
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const target = customers.find((c) => c.id === customerId) || FALLBACK_CUSTOMERS[0];
    const defaultAmount = target.typicalSpendMin
      ? Number(((target.typicalSpendMin + (target.typicalSpendMax || 50)) / 2).toFixed(2))
      : 25.00;

    setAmount(defaultAmount);
    setSensitivityAmount(defaultAmount);
    setActiveScenario('CLEAN');
    setIsVelocityBurst(false);
    setIsNewDevice(false);
    setIsLocationHop(false);
    setIsBlacklistedMerchant(false);
    setIsCollusionDevice(false);
    setSelectedMerchantId(target.currency === 'INR' ? 'mer_indigo_airlines' : 'mer_coffee_beans');
    setLastResult(null);
    setBurstProgress(null);
  };

  // Scenario Presets Trigger
  const handleApplyScenario = (preset: 'CLEAN' | 'ATO' | 'VELOCITY' | 'WATCHLIST' | 'COLLUSION') => {
    setActiveScenario(preset);
    setLastResult(null);
    setBurstProgress(null);

    const minSpend = currentCustomer.typicalSpendMin || 10;
    const maxSpend = currentCustomer.typicalSpendMax || 50;
    const baselineMid = Number(((minSpend + maxSpend) / 2).toFixed(2));

    if (preset === 'CLEAN') {
      setAmount(baselineMid);
      setSensitivityAmount(baselineMid);
      setIsVelocityBurst(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(false);
      setSelectedMerchantId(currentCustomer.currency === 'INR' ? 'mer_indigo_airlines' : 'mer_coffee_beans');
    } else if (preset === 'ATO') {
      // 8.5x baseline spend + new untrusted hardware + foreign proxy IP
      const elevatedAmount = Number((maxSpend * 8.5).toFixed(2));
      setAmount(elevatedAmount);
      setSensitivityAmount(elevatedAmount);
      setIsVelocityBurst(false);
      setIsNewDevice(true);
      setIsLocationHop(true);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(false);
      setSelectedMerchantId('mer_luxury_watches');
    } else if (preset === 'VELOCITY') {
      // Rapid automated burst
      setAmount(baselineMid);
      setSensitivityAmount(baselineMid);
      setIsVelocityBurst(true);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(false);
      setSelectedMerchantId('mer_electronics_store');
    } else if (preset === 'WATCHLIST') {
      // Sanctioned vendor
      setAmount(Number((maxSpend * 1.5).toFixed(2)));
      setSensitivityAmount(Number((maxSpend * 1.5).toFixed(2)));
      setIsVelocityBurst(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(true);
      setIsCollusionDevice(false);
      setSelectedMerchantId('mer_black_1');
    } else if (preset === 'COLLUSION') {
      // Shared hardware linked to banned fraud ring
      setAmount(baselineMid);
      setSensitivityAmount(baselineMid);
      setIsVelocityBurst(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(true);
      setSelectedMerchantId('mer_grocery_fresh');
    }
  };

  const regenerateIdempotencyKey = () => {
    setIdempotencyKey(`idemp_${Math.random().toString(36).substring(2, 8)}`);
  };

  // Run Simulation Pipeline
  const handleRunSimulation = useCallback(async () => {
    setLoading(true);
    setInspectorStep(0);

    const currency = currentCustomer.currency || 'USD';
    let deviceFp = currentCustomer.primaryDeviceFingerprint || `${currentCustomer.id}_trusted_device`;
    if (isCollusionDevice) {
      deviceFp = 'fp_shared_syndicate_ipad';
    } else if (isNewDevice) {
      deviceFp = 'fp_untrusted_linux_vm_99';
    }

    const ip = isLocationHop ? '185.220.101.5' : (currentCustomer.usualIp || '198.51.100.15');
    const merchant = isBlacklistedMerchant ? 'mer_black_1' : selectedMerchantId;

    try {
      if (inspectorMode) {
        // Step-by-Step educational slow-motion animation
        setInspectorStep(1); // Lock & Idempotency
        await new Promise((r) => setTimeout(r, 220));
        setInspectorStep(2); // Velocity Check
        await new Promise((r) => setTimeout(r, 220));
        setInspectorStep(3); // Device & IP Trust
        await new Promise((r) => setTimeout(r, 220));
        setInspectorStep(4); // 2-Hop BFS Graph Traversal
        await new Promise((r) => setTimeout(r, 220));
        setInspectorStep(5); // Score Aggregation
      }

      if (isVelocityBurst) {
        setBursting(true);
        burstCounter += 1;
        const burstUser = `${currentCustomer.id}_burst_${burstCounter}`;
        const burstEmail = `burst_${burstCounter}_${currentCustomer.email}`;

        let latest: DecisionResponse | null = null;
        const totalCalls = 6;
        for (let i = 1; i <= totalCalls; i++) {
          setBurstProgress({ current: i, total: totalCalls, fired: i >= 6 });
          const payload: TransactionRequest = {
            userId: burstUser,
            email: burstEmail,
            amount: Number((amount / 10 + i * 2.5).toFixed(2)),
            currency,
            merchantId: merchant,
            ipAddress: ip,
            deviceFingerprint: deviceFp,
          };
          latest = await api.transactions.evaluate(payload);
          await new Promise((r) => setTimeout(r, 120));
        }
        if (latest) {
          setLastResult(latest);
          setSensitivityAmount(amount);
        }
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
        setSensitivityAmount(amount);
      }
    } catch (err: unknown) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
      setBursting(false);
      if (inspectorMode) {
        setTimeout(() => setInspectorStep(0), 1200);
      }
    }
  }, [
    currentCustomer,
    amount,
    selectedMerchantId,
    isNewDevice,
    isLocationHop,
    isBlacklistedMerchant,
    isCollusionDevice,
    isVelocityBurst,
    inspectorMode,
    enableIdempotency,
    idempotencyKey,
  ]);

  // Global Keyboard Shortcut: Ctrl+Enter or Cmd+Enter
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

  // Animated score rollup effect
  const [displayedScore, setDisplayedScore] = useState(0);
  const [copiedDocket, setCopiedDocket] = useState(false);

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

  // Check which of the 7 rules triggered
  const ruleEvaluationMatrix = useMemo(() => {
    if (!lastResult) return [];

    const fired = lastResult.firedRules || [];
    const hasRule = (id: string) => fired.some((r) => r.toUpperCase().includes(id));
    const findReason = (id: string) => fired.find((r) => r.toUpperCase().includes(id)) || '';

    const maxSpend = currentCustomer.typicalSpendMax || 50;
    const spendMultiplier = (amount / maxSpend).toFixed(1);

    return [
      {
        id: 'RULE_01',
        name: 'High Velocity (5m)',
        defaultWeight: 40,
        triggered: hasRule('RULE_01'),
        reason: hasRule('RULE_01')
          ? findReason('RULE_01')
          : 'Sliding window count clean (within 5 txns / 300s threshold)',
        metric: isVelocityBurst ? '6 txns / 300s (BREACH)' : '1 txn / 300s (OK)',
      },
      {
        id: 'RULE_02',
        name: 'New Device Fingerprint',
        defaultWeight: 25,
        triggered: hasRule('RULE_02'),
        reason: hasRule('RULE_02')
          ? findReason('RULE_02')
          : `Recognized trusted hardware fingerprint (${currentCustomer.primaryDevice || 'Registered Device'})`,
        metric: isNewDevice ? 'Unrecognized SHA-256' : 'Trusted Registry Verified',
      },
      {
        id: 'RULE_03',
        name: 'High-Value Spend Deviation',
        defaultWeight: 50,
        triggered: hasRule('RULE_03'),
        reason: hasRule('RULE_03')
          ? findReason('RULE_03')
          : `Spend ${currencySymbol}${amount} conforms to customer typical baseline (${currencySymbol}${currentCustomer.typicalSpendMin}–${currencySymbol}${maxSpend})`,
        metric: hasRule('RULE_03') ? `${spendMultiplier}× typical limit` : 'Within limits',
      },
      {
        id: 'RULE_04',
        name: 'Rapid IP Change (Geo Hop)',
        defaultWeight: 60,
        triggered: hasRule('RULE_04'),
        reason: hasRule('RULE_04')
          ? findReason('RULE_04')
          : `Originating IP conforms to historical home subnet (${currentCustomer.usualLocation?.split(',')[0] || 'Local'})`,
        metric: isLocationHop ? 'Foreign Proxy (185.220.101.5)' : 'Home Subnet Verified',
      },
      {
        id: 'RULE_05',
        name: 'Blacklisted Merchant Watchlist',
        defaultWeight: 80,
        triggered: hasRule('RULE_05'),
        reason: hasRule('RULE_05')
          ? findReason('RULE_05')
          : 'Merchant verified in good standing on global directory',
        metric: isBlacklistedMerchant ? 'DarkMixer Escrow (FLAGGED)' : 'Clean Merchant',
      },
      {
        id: 'RULE_06',
        name: 'Customer Risk Tiering',
        defaultWeight: 30,
        triggered: hasRule('RULE_06'),
        reason: hasRule('RULE_06')
          ? findReason('RULE_06')
          : `Customer profile is in ${currentCustomer.riskSegment} risk tier (no baseline penalty applied)`,
        metric: `${currentCustomer.riskSegment} Tier`,
      },
      {
        id: 'RULE_07',
        name: 'Syndicate Fraud Ring (2-Hop BFS)',
        defaultWeight: 75,
        triggered: hasRule('RULE_07'),
        reason: hasRule('RULE_07')
          ? findReason('RULE_07')
          : '2-hop BFS graph traversal found zero links to banned fraud rings',
        metric: isCollusionDevice ? 'Shared Device -> Banned Kingpin' : 'Isolated Clean Node',
      },
    ];
  }, [lastResult, currentCustomer, amount, currencySymbol, isVelocityBurst, isNewDevice, isLocationHop, isBlacklistedMerchant, isCollusionDevice]);

  // Export formatted compliance audit report
  const handleExportDocket = () => {
    if (!lastResult) return;
    const docket = {
      docketType: 'SENTINELX_FINANCIAL_CRIME_AUDIT_DOCKET',
      generatedAt: new Date().toISOString(),
      transactionId: lastResult.transactionId,
      customerProfile: {
        userId: currentCustomer.id,
        name: currentCustomer.name,
        occupation: currentCustomer.occupation,
        riskTier: currentCustomer.riskSegment,
        historicalTransactionsInDatabase: currentCustomer.historicalTxnCount || 200,
        establishedTypicalSpend: `${currencySymbol}${currentCustomer.typicalSpendMin} – ${currencySymbol}${currentCustomer.typicalSpendMax}`,
      },
      decisionSummary: {
        verdict: lastResult.decision,
        finalScore: lastResult.finalScore,
        engineLatencyMs: lastResult.evaluationTimeMs,
        slaTargetMet: lastResult.evaluationTimeMs < 50,
      },
      ruleMatrix: ruleEvaluationMatrix.map((r) => ({
        ruleId: r.id,
        name: r.name,
        triggered: r.triggered,
        points: r.triggered ? r.defaultWeight : 0,
        details: r.reason,
      })),
      aiCopilotReasoning: lastResult.geminiReasoning || 'Automated score normalized from real-time dynamic rule matrix.',
    };

    navigator.clipboard.writeText(JSON.stringify(docket, null, 2));
    setCopiedDocket(true);
    setTimeout(() => setCopiedDocket(false), 2500);
  };

  const customerInitials = currentCustomer.name.split(' ').map((n) => n[0]).join('').substring(0, 2);

  return (
    <div className="bg-[#151922] border border-slate-800/80 rounded-xl p-5 lg:p-6 space-y-6 text-white font-sans shadow-xl">
      {/* TOP HEADER: TITLE & ENGINE SWITCHES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-mono font-bold text-white tracking-wide uppercase">
                FRAUD DECISIONING WORKBENCH
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SPRING BOOT + REDIS LUA
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              5 Verified Personas • 1,000 Historical Database Context Records • &lt;15ms Latency SLA
            </p>
          </div>
        </div>

        {/* TOP TOGGLES: INSPECTOR MODE & IDEMPOTENCY */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setInspectorMode(!inspectorMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              inspectorMode
                ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                : 'bg-[#1c222e] border-slate-700 text-neutral-400 hover:text-white'
            }`}
            title="Step through each stage in slow motion for educational explainability"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>INSPECTOR: {inspectorMode ? 'SLOW-MO ON' : 'FAST'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEnableIdempotency(!enableIdempotency)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              enableIdempotency
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-[#1c222e] border-slate-700 text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>IDEMPOTENCY: {enableIdempotency ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* STEP 1: CHOOSE PERSONA (5 DISTINCT USER PROFILES) */}
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs pb-1">
          <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
            <span>SELECT CUSTOMER PERSONA (ESTABLISHED HISTORICAL CONTEXT):</span>
          </div>
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
          >
            <span>{showHistoryDrawer ? 'Hide Profile Baseline' : 'Inspect Profile & Stored Txns'}</span>
            {showHistoryDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 5 Persona Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {customers.slice(0, 5).map((c) => {
            const isSelected = c.id === selectedCustomerId;
            const cInitials = c.name.split(' ').map((n) => n[0]).join('').substring(0, 2);
            const symbol = c.currency === 'USD' ? '$' : c.currency === 'INR' ? '₹' : c.currency === 'GBP' ? '£' : '$';

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCustomer(c.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950/60 ring-1 ring-blue-500'
                    : 'bg-[#1c222e] border-slate-800 hover:border-slate-600 text-neutral-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      c.riskSegment === 'LOW' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' :
                      c.riskSegment === 'MEDIUM' ? 'bg-amber-950 text-amber-400 border border-amber-500/50' :
                      'bg-rose-950 text-rose-400 border border-rose-500/50'
                    }`}>
                      {cInitials}
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      c.riskSegment === 'LOW' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' :
                      c.riskSegment === 'MEDIUM' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40' :
                      'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                    }`}>
                      {c.riskSegment} RISK
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white truncate">{c.name}</div>
                  <div className="text-[10px] text-neutral-400 font-sans truncate">{c.occupation}</div>
                  <div className="text-[10px] text-neutral-500 font-sans mt-0.5 truncate">{c.usualLocation?.split(',')[0]}</div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[10px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Typical:</span>
                    <span className="text-white font-bold">{symbol}{c.typicalSpendMin}–{symbol}{c.typicalSpendMax}</span>
                  </div>
                  <div className="flex justify-between text-cyan-400 font-bold">
                    <span>Database:</span>
                    <span>{c.historicalTxnCount || 200} Txns</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* EXPANDABLE PROFILE & RECENT HISTORICAL ACTIVITY DRAWER */}
        {showHistoryDrawer && (
          <div className="bg-[#1c222e] border border-cyan-900/60 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>CUSTOMER PROFILE BASELINE: {currentCustomer.name} ({currentCustomer.id})</span>
              </div>
              <span className="text-[10px] text-neutral-400">Verified Identity Registry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#151922] p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase">Trusted Device &amp; OS:</span>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>{currentCustomer.primaryDevice || 'iPhone'}</span>
                </div>
                <div className="text-[9px] text-neutral-500 font-mono truncate">
                  SHA-256: {currentCustomer.primaryDeviceFingerprint}
                </div>
              </div>

              <div className="bg-[#151922] p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase">Home Subnet &amp; City:</span>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentCustomer.usualLocation}</span>
                </div>
                <div className="text-[9px] text-neutral-500 font-mono">
                  Subnet: {currentCustomer.usualIp || '198.51.100.15'}
                </div>
              </div>

              <div className="bg-[#151922] p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase">Established Normalcy:</span>
                <div className="font-bold text-white">
                  {currencySymbol}{currentCustomer.typicalSpendMin} – {currencySymbol}{currentCustomer.typicalSpendMax} {currentCustomer.currency}
                </div>
                <div className="text-[9px] text-emerald-400 font-bold">
                  {currentCustomer.historicalTxnCount || 200} Pre-Stored Baseline Txns in PostgreSQL
                </div>
              </div>
            </div>

            {/* PREVIEW OF LAST 3 LEGITIMATE TRANSACTIONS IN DATABASE */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-neutral-400 uppercase block mb-1.5">
                SAMPLE PRE-STORED TRANSACTIONS FROM DATABASE:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <div key={tx.id} className="bg-[#151922] p-2 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <div className="font-bold text-white">{currencySymbol}{tx.amount} {tx.currency}</div>
                        <div className="text-[9px] text-neutral-400 truncate max-w-[120px]">{tx.merchantId}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/40">
                        {tx.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 text-[11px] italic col-span-3">
                    200+ historical baseline records loaded in database for {currentCustomer.name}.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: CHOOSE SITUATION (SCENARIO OR VELOCITY OPTION) */}
      <div className="space-y-3 font-mono bg-[#1c222e]/60 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs pb-1">
          <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">2</span>
            <span>CHOOSE TRANSACTION SITUATION TO SIMULATE:</span>
          </div>
          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-CLICK NARRATIVE STORIES</span>
          </span>
        </div>

        {/* 5 Narrative Preset Story Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* 1. Everyday Clean Purchase */}
          <button
            type="button"
            onClick={() => handleApplyScenario('CLEAN')}
            className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
              activeScenario === 'CLEAN'
                ? 'bg-[#151922] border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-[#151922] border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white">01 Normal Purchase</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-400">
              Clean typical purchase on trusted device at local merchant.
            </p>
            <span className="text-[9px] mt-2 text-emerald-400 font-bold uppercase">Expected: ALLOW</span>
          </button>

          {/* 2. Midnight Account Takeover */}
          <button
            type="button"
            onClick={() => handleApplyScenario('ATO')}
            className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
              activeScenario === 'ATO'
                ? 'bg-[#151922] border-amber-500 ring-1 ring-amber-500'
                : 'bg-[#151922] border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-white">02 Account Takeover</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-400">
              8.5× spend spike on an unrecognized device from Moscow IP.
            </p>
            <span className="text-[9px] mt-2 text-rose-400 font-bold uppercase">Expected: BLOCK</span>
          </button>

          {/* 3. Velocity Attack (The Velocity Option) */}
          <button
            type="button"
            onClick={() => handleApplyScenario('VELOCITY')}
            className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
              activeScenario === 'VELOCITY'
                ? 'bg-[#151922] border-purple-500 ring-1 ring-purple-500'
                : 'bg-[#151922] border-slate-800 hover:border-purple-500/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <RotateCw className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-bold text-white">03 Velocity Burst</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-400">
              Bot storm: 6 rapid micro-charges in under 1 second.
            </p>
            <span className="text-[9px] mt-2 text-purple-400 font-bold uppercase">Redis ZSET Rate Limit</span>
          </button>

          {/* 4. Watchlist Merchant */}
          <button
            type="button"
            onClick={() => handleApplyScenario('WATCHLIST')}
            className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
              activeScenario === 'WATCHLIST'
                ? 'bg-[#151922] border-rose-500 ring-1 ring-rose-500'
                : 'bg-[#151922] border-slate-800 hover:border-rose-500/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold text-white">04 Watchlist Vendor</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-400">
              Checkout routed to sanctioned DarkMixer Escrow endpoint.
            </p>
            <span className="text-[9px] mt-2 text-rose-400 font-bold uppercase">Expected: BLOCK</span>
          </button>

          {/* 5. Syndicate Collusion Ring */}
          <button
            type="button"
            onClick={() => handleApplyScenario('COLLUSION')}
            className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
              activeScenario === 'COLLUSION'
                ? 'bg-[#151922] border-cyan-500 ring-1 ring-cyan-500'
                : 'bg-[#151922] border-slate-800 hover:border-cyan-500/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Network className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-white">05 Fraud Ring</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-400">
              Shares physical burner hardware with a banned fraudster.
            </p>
            <span className="text-[9px] mt-2 text-cyan-400 font-bold uppercase">2-Hop BFS Graph</span>
          </button>
        </div>

        {/* SIDE-BY-SIDE: "BASELINE NORMALCY VS. SIMULATED ATTEMPT" VISUAL DIFF */}
        <div className="mt-3 bg-[#151922] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-neutral-300 font-bold uppercase flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>SIDE-BY-SIDE ANOMALY DIFF (BASELINE VS. INCOMING ATTEMPT):</span>
            </span>
            <span className="text-[10px] text-neutral-400">Visual Deviation Inspection</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1">
            {/* Amount Diff */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-neutral-400 uppercase block">Transaction Amount</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-neutral-400 font-sans text-[11px]">Normal: {currencySymbol}{currentCustomer.typicalSpendMax} max</span>
                <span className={`font-mono font-bold ${amount > (currentCustomer.typicalSpendMax || 50) * 2.5 ? 'text-rose-400' : 'text-white'}`}>
                  {currencySymbol}{amount}
                </span>
              </div>
              {amount > (currentCustomer.typicalSpendMax || 50) * 2.5 ? (
                <span className="text-[9px] text-rose-400 font-bold uppercase block mt-1">🔴 Significant Spend Spike</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-bold uppercase block mt-1">🟢 Within Normal Range</span>
              )}
            </div>

            {/* Device Diff */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-neutral-400 uppercase block">Device Fingerprint</span>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-neutral-400 font-sans truncate max-w-[90px]">{currentCustomer.primaryDevice}</span>
                <span className={`font-bold ${isNewDevice ? 'text-amber-400' : isCollusionDevice ? 'text-cyan-400' : 'text-emerald-400'}`}>
                  {isCollusionDevice ? 'Shared Tablet' : isNewDevice ? 'Unknown Linux' : 'Registered Device'}
                </span>
              </div>
              {isCollusionDevice ? (
                <span className="text-[9px] text-cyan-400 font-bold uppercase block mt-1">🕸️ Syndicate Shared HW</span>
              ) : isNewDevice ? (
                <span className="text-[9px] text-amber-400 font-bold uppercase block mt-1">⚠️ New Untrusted Device</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-bold uppercase block mt-1">🟢 Trusted Hardware</span>
              )}
            </div>

            {/* Geolocation / IP Diff */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-neutral-400 uppercase block">Geolocation / IP</span>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-neutral-400 font-sans truncate max-w-[90px]">{currentCustomer.usualLocation?.split(',')[0]}</span>
                <span className={`font-bold ${isLocationHop ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isLocationHop ? 'Moscow (Proxy)' : 'Home Subnet'}
                </span>
              </div>
              {isLocationHop ? (
                <span className="text-[9px] text-rose-400 font-bold uppercase block mt-1">🔴 Impossible Geo Hop</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-bold uppercase block mt-1">🟢 Home IP Verified</span>
              )}
            </div>

            {/* Merchant Diff */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-neutral-400 uppercase block">Receiving Merchant</span>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-neutral-400 font-sans">Verified Retail</span>
                <span className={`font-bold truncate max-w-[100px] ${isBlacklistedMerchant ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {MERCHANTS.find((m) => m.id === selectedMerchantId)?.name.split(' ')[0] || selectedMerchantId}
                </span>
              </div>
              {isBlacklistedMerchant ? (
                <span className="text-[9px] text-rose-400 font-bold uppercase block mt-1">⛔ Sanctioned Watchlist</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-bold uppercase block mt-1">🟢 Merchant Cleared</span>
              )}
            </div>
          </div>
        </div>

        {/* VELOCITY BURST PROGRESS INDICATOR */}
        {bursting && burstProgress && (
          <div className="bg-[#151922] border border-purple-500/50 rounded-xl p-3 space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300 font-bold flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>EXECUTING REDIS SLIDING WINDOW BURST [{burstProgress.current}/{burstProgress.total}]</span>
              </span>
              <span className={`text-[10px] font-bold ${burstProgress.fired ? 'text-rose-400' : 'text-emerald-400'}`}>
                {burstProgress.fired ? '⚠️ THRESHOLD LIMIT BREACHED (RULE_01 FIRED)' : 'UNDER RATE LIMIT (PASS)'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${(burstProgress.current / burstProgress.total) * 100}%` }}
                className={`h-full transition-all duration-150 ${burstProgress.fired ? 'bg-rose-500' : 'bg-purple-500'}`}
              />
            </div>
          </div>
        )}

        {/* SLOW-MOTION PIPELINE INSPECTOR ANIMATION */}
        {inspectorMode && inspectorStep > 0 && (
          <div className="bg-[#151922] border border-purple-500/60 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-purple-300 font-bold">
              <span>PIPELINE EXECUTION INSPECTOR:</span>
              <span>STAGE {inspectorStep} OF 5</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-[10px] text-center">
              <div className={`p-1.5 rounded ${inspectorStep >= 1 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-neutral-500'}`}>
                1. Mutex Lock
              </div>
              <div className={`p-1.5 rounded ${inspectorStep >= 2 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-neutral-500'}`}>
                2. Redis Velocity
              </div>
              <div className={`p-1.5 rounded ${inspectorStep >= 3 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-neutral-500'}`}>
                3. Device / IP
              </div>
              <div className={`p-1.5 rounded ${inspectorStep >= 4 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-neutral-500'}`}>
                4. Graph BFS
              </div>
              <div className={`p-1.5 rounded ${inspectorStep >= 5 ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-neutral-500'}`}>
                5. Decision Emit
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: EXPLAINABILITY SCORECARD & DECISION RESULTS */}
      <div className="space-y-4 font-mono">
        <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">3</span>
            <span>REAL-TIME DECISION &amp; RULE-BY-RULE EXPLAINABILITY SCORECARD:</span>
          </div>
          {lastResult && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/40">
                ⚡ {lastResult.evaluationTimeMs}ms Engine Latency
              </span>
              <span className="text-[10px] text-neutral-400">SLA &lt;50ms Met</span>
            </div>
          )}
        </div>

        {/* DECISION SUMMARY BANNER & SCORE GAUGE */}
        {lastResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Large Verdict Box (8 Cols) */}
            <div className={`lg:col-span-8 p-5 rounded-xl border flex flex-col justify-between ${
              lastResult.decision === 'ALLOW'
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                : lastResult.decision === 'REVIEW'
                ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/40'
                : 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">VERDICT ISSUED:</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-black uppercase tracking-wider ${
                      lastResult.decision === 'ALLOW' ? 'text-emerald-400' :
                      lastResult.decision === 'REVIEW' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {lastResult.decision}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                      lastResult.decision === 'ALLOW' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500' :
                      lastResult.decision === 'REVIEW' ? 'bg-amber-900/60 text-amber-300 border border-amber-500' :
                      'bg-rose-900/60 text-rose-300 border border-rose-500'
                    }`}>
                      {lastResult.decision === 'ALLOW' ? 'Clean Checkout Approved' : lastResult.decision === 'REVIEW' ? 'Held for Manual Analyst Review' : 'Fraud Intercepted'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 uppercase">Transaction ID:</span>
                  <div className="text-xs font-bold text-cyan-300">{lastResult.transactionId}</div>
                  <div className="text-[10px] text-neutral-400">{lastResult.timestamp?.split('T')[0] || 'Today'}</div>
                </div>
              </div>

              {/* AI COPILOT REASONING PARAGRAPH */}
              <div className="mt-4 p-3 rounded-lg bg-[#151922]/80 border border-slate-800 text-xs text-neutral-300 leading-relaxed font-sans">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[10px] uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Risk Copilot Reasoning:</span>
                </div>
                {lastResult.geminiReasoning ||
                  (lastResult.decision === 'ALLOW'
                    ? `Transaction of ${currencySymbol}${amount} for ${currentCustomer.name} conforms to customer's historical baseline profile. Device fingerprint, geolocation, and velocity are verified clean.`
                    : lastResult.decision === 'REVIEW'
                    ? `Transaction exhibits moderate risk signals (${lastResult.finalScore} pts). Routed to analyst queue for human inspection before settlement.`
                    : `Transaction intercepted with an aggregate penalty of ${lastResult.finalScore} pts. High-confidence fraud detected due to severe deviation from account history.`)}
              </div>
            </div>

            {/* Radial Score Gauge (4 Cols) */}
            <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] text-neutral-400 uppercase mb-1">AGGREGATE RISK SCORE</span>
              <div className="relative w-44 h-24 flex items-end justify-center">
                <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
                  <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="#11141a" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 15 80 A 65 65 0 0 1 60 28" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
                  <path d="M 60 28 A 65 65 0 0 1 100 28" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
                  <path d="M 100 28 A 65 65 0 0 1 145 80" fill="none" stroke="#f43f5e" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
                </svg>
                <div className="absolute bottom-0 flex flex-col items-center">
                  <span className={`text-3xl font-black font-mono ${
                    displayedScore < 30 ? 'text-emerald-400' : displayedScore < 70 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {displayedScore}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">/ 100 PTS</span>
                </div>
              </div>
              <div className="text-[10px] text-neutral-400 mt-2 text-center font-sans">
                &lt;30 ALLOW • 30–69 REVIEW • &ge;70 BLOCK
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[#1c222e] border border-slate-800 text-center space-y-2">
            <Activity className="w-8 h-8 text-neutral-500 mx-auto animate-pulse" />
            <div className="text-white font-bold text-sm">DECISION PIPELINE STANDBY</div>
            <p className="text-xs text-neutral-400 font-sans max-w-md mx-auto">
              Select a customer persona above and choose a situation, then click &apos;SIMULATE TRANSACTION&apos; to run the real-time scoring engine.
            </p>
          </div>
        )}

        {/* THE COMPLETE RULE-BY-RULE EXPLAINABILITY MATRIX (ALL 7 RULES) */}
        {lastResult && (
          <div className="bg-[#1c222e] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>PRODUCTION RULE MATRIX BREAKDOWN (7 STRATEGIES EVALUATED):</span>
              </span>
              <span className="text-[10px] text-neutral-400">
                {ruleEvaluationMatrix.filter((r) => r.triggered).length} of 7 Rules Triggered
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {ruleEvaluationMatrix.map((rule) => (
                <div key={rule.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                      rule.triggered ? 'bg-rose-950 text-rose-400 border border-rose-500/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                    }`}>
                      {rule.triggered ? `+${rule.defaultWeight} PTS` : '+0 PTS'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{rule.id}: {rule.name}</span>
                        <span className="text-[10px] text-neutral-400 font-sans">({rule.metric})</span>
                      </div>
                      <p className="text-[11px] text-neutral-300 font-sans mt-0.5">{rule.reason}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase shrink-0 self-start sm:self-auto px-2 py-0.5 rounded ${
                    rule.triggered ? 'text-rose-400 bg-rose-950/60' : 'text-emerald-400 bg-emerald-950/60'
                  }`}>
                    {rule.triggered ? '🔴 TRIGGERED' : '🟢 CLEARED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-HOP GRAPH COLLUSION POPUP (WHEN RULE_07 OR PERSONA 5 IS ACTIVE) */}
        {lastResult && (isCollusionDevice || selectedCustomerId === 'usr_viktor') && (
          <div className="bg-[#1c222e] border border-cyan-500/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>2-HOP BFS GRAPH TRAVERSAL SYNDICATE MAP:</span>
              </span>
              <span className="text-[10px] text-rose-400 font-bold uppercase">COLLUSION DETECTED (RULE_07)</span>
            </div>
            <div className="p-3 bg-[#151922] rounded-lg border border-slate-800 flex items-center justify-center gap-3 text-xs flex-wrap">
              <span className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-bold">
                User: {currentCustomer.name}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                Hardware: fp_shared_syndicate_ipad
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-bold">
                Banned Kingpin: usr_syndicate_banned_99 (BLOCKED)
              </span>
            </div>
          </div>
        )}

        {/* INTERACTIVE SENSITIVITY PLAYGROUND ("WHAT IF?" SPEND SLIDER) */}
        {lastResult && (
          <div className="bg-[#1c222e] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300 font-bold uppercase flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>SENSITIVITY PLAYGROUND: &quot;WHAT IF SPEND WAS DIFFERENT?&quot;</span>
              </span>
              <span className="text-white font-bold">{currencySymbol}{sensitivityAmount.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={Math.max(5, (currentCustomer.typicalSpendMin || 10) / 2)}
              max={(currentCustomer.typicalSpendMax || 100) * 8}
              step={5}
              value={sensitivityAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSensitivityAmount(val);
                setAmount(val);
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-sans">
              <span>Typical Min: {currencySymbol}{currentCustomer.typicalSpendMin}</span>
              <span>Typical Max: {currencySymbol}{currentCustomer.typicalSpendMax}</span>
              <span>8× Deviation: {currencySymbol}{(currentCustomer.typicalSpendMax || 50) * 8}</span>
            </div>
          </div>
        )}
      </div>

      {/* GLOBAL ACTIONS: SIMULATE & EXPORT */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <button
          type="button"
          onClick={() => handleSelectCustomer(selectedCustomerId)}
          className="px-4 py-2.5 rounded-lg bg-[#1c222e] hover:bg-slate-700 text-neutral-300 border border-slate-700/80 text-xs font-bold transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET SITUATION</span>
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
              <span>{bursting ? 'EXECUTING VELOCITY BURST...' : 'RUNNING ENGINE EVALUATION...'}</span>
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
          disabled={!lastResult}
          className="px-4 py-2.5 rounded-lg bg-[#1c222e] hover:bg-slate-700 text-neutral-300 border border-slate-700/80 text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>{copiedDocket ? 'COPIED TO CLIPBOARD' : 'EXPORT AUDIT DOCKET'}</span>
        </button>
      </div>
    </div>
  );
}
