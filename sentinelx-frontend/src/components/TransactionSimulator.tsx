'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  api,
  TransactionRequest,
  DecisionResponse,
  CustomerProfile,
  TransactionResponse,
  Rule,
  GraphNetworkResponse,
} from '@/lib/api';
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
  Smartphone,
  AlertTriangle,
  ArrowRight,
  Trash2,
} from 'lucide-react';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  return `${symbol} ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function TransactionSimulator() {
  const [customers, setCustomers] = useState<CustomerProfile[]>(FALLBACK_CUSTOMERS);
  const [rulesCatalog, setRulesCatalog] = useState<Rule[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('usr_alice');
  const [loading, setLoading] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [burstProgress, setBurstProgress] = useState<{ current: number; total: number; fired: boolean } | null>(null);
  const [lastResult, setLastResult] = useState<DecisionResponse | null>(null);
  const [syndicateGraph, setSyndicateGraph] = useState<GraphNetworkResponse | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionResponse[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [resetToast, setResetToast] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Simulation Controls & Engine Mode
  const [activeScenario, setActiveScenario] = useState<
    'CLEAN' | 'ATO' | 'VELOCITY' | 'WATCHLIST' | 'COLLUSION' | 'CUSTOM'
  >('CLEAN');
  const [enableIdempotency, setEnableIdempotency] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('idemp_demo_001');

  // Transaction Payload State (Editable via Presets or Custom Controls)
  const [amount, setAmount] = useState<number>(25.0);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('mer_coffee_beans');
  const [isVelocityBurst, setIsVelocityBurst] = useState<boolean>(false);
  const [isNewDevice, setIsNewDevice] = useState<boolean>(false);
  const [isLocationHop, setIsLocationHop] = useState<boolean>(false);
  const [isBlacklistedMerchant, setIsBlacklistedMerchant] = useState<boolean>(false);
  const [isCollusionDevice, setIsCollusionDevice] = useState<boolean>(false);

  const [displayedScore, setDisplayedScore] = useState(0);
  const displayedScoreRef = useRef(0);
  const [copiedDocket, setCopiedDocket] = useState(false);

  // Fetch live customer profiles and active rules catalog on mount
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [customerData, rulesData] = await Promise.all([
          api.customers.getAll().catch(() => null),
          api.rules.getAll().catch(() => null),
        ]);
        if (isMounted && customerData && customerData.length > 0) {
          setCustomers(customerData);
        }
        if (isMounted && rulesData) {
          setRulesCatalog(rulesData);
        }
      } catch {
        // Keep fallback customers if offline
      }
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0] || FALLBACK_CUSTOMERS[0];
  }, [customers, selectedCustomerId]);

  const loadCustomerHistory = useCallback(async (userId: string) => {
    try {
      const data = await api.transactions.getRecent(0, 3, userId);
      setRecentTransactions(data || []);
    } catch {
      setRecentTransactions([]);
    }
  }, []);

  useEffect(() => {
    loadCustomerHistory(selectedCustomerId);
  }, [selectedCustomerId, loadCustomerHistory]);

  // Reset persona simulation state (Redis velocity, Graph links, non-seeded simulated DB records)
  const resetPersonaState = useCallback(
    async (userId: string, showToast = true) => {
      try {
        await api.customers.resetSimulation(userId);
        await loadCustomerHistory(userId);
        if (showToast) {
          setResetToast('Persona Baseline Reset');
          setTimeout(() => setResetToast(null), 2000);
        }
      } catch {
        try {
          await api.velocity.resetUserVelocity(userId);
          if (showToast) {
            setResetToast('Redis Velocity Flushed');
            setTimeout(() => setResetToast(null), 2000);
          }
        } catch {
          // Ignore if backend offline
        }
      }
    },
    [loadCustomerHistory]
  );

  // Select persona and reset to clean baseline
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const target = customers.find((c) => c.id === customerId) || FALLBACK_CUSTOMERS[0];
    const defaultAmount = target.typicalSpendMin
      ? Number(((target.typicalSpendMin + (target.typicalSpendMax || 50)) / 2).toFixed(2))
      : 25.0;

    setAmount(defaultAmount);
    setActiveScenario('CLEAN');
    setIsVelocityBurst(false);
    setIsNewDevice(false);
    setIsLocationHop(false);
    setIsBlacklistedMerchant(false);
    setIsCollusionDevice(false);
    setSelectedMerchantId(target.currency === 'INR' ? 'mer_indigo_airlines' : 'mer_coffee_beans');
    setLastResult(null);
    setSyndicateGraph(null);
    setBurstProgress(null);
    setSimError(null);

    // Flush Redis sliding window on persona switch while preserving stored DB transactions for the Ledger
    api.velocity.resetUserVelocity(customerId).catch(() => {});
  };

  // Apply 1-click narrative scenario preset
  const handleApplyScenario = async (preset: 'CLEAN' | 'ATO' | 'VELOCITY' | 'WATCHLIST' | 'COLLUSION') => {
    setActiveScenario(preset);
    setLastResult(null);
    setSyndicateGraph(null);
    setBurstProgress(null);
    setSimError(null);

    const minSpend = currentCustomer.typicalSpendMin || 10;
    const maxSpend = currentCustomer.typicalSpendMax || 50;
    const baselineMid = Number(((minSpend + maxSpend) / 2).toFixed(2));

    // Flush Redis sliding window on non-velocity presets while preserving stored DB transactions for the Ledger
    if (preset !== 'VELOCITY') {
      await api.velocity.resetUserVelocity(currentCustomer.id).catch(() => {});
    }

    if (preset === 'CLEAN') {
      setAmount(baselineMid);
      setIsVelocityBurst(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(false);
      setSelectedMerchantId(currentCustomer.currency === 'INR' ? 'mer_indigo_airlines' : 'mer_coffee_beans');
    } else if (preset === 'ATO') {
      setAmount(Number((maxSpend * 7.0).toFixed(2)));
      setIsVelocityBurst(false);
      setIsNewDevice(true);
      setIsLocationHop(true);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(false);
      setSelectedMerchantId('mer_luxury_watches');
    } else if (preset === 'VELOCITY') {
      setAmount(baselineMid);
      setIsVelocityBurst(true);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(false);
      setSelectedMerchantId('mer_electronics_store');
    } else if (preset === 'WATCHLIST') {
      setAmount(baselineMid);
      setIsVelocityBurst(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(true);
      setIsCollusionDevice(false);
      setSelectedMerchantId('mer_black_1');
    } else if (preset === 'COLLUSION') {
      setAmount(baselineMid);
      setIsVelocityBurst(false);
      setIsNewDevice(false);
      setIsLocationHop(false);
      setIsBlacklistedMerchant(false);
      setIsCollusionDevice(true);
      setSelectedMerchantId('mer_grocery_fresh');
    }
  };

  // Execute real backend transaction evaluation
  const handleRunSimulation = useCallback(async () => {
    setLoading(true);
    setSimError(null);
    setSyndicateGraph(null);

    const currency = currentCustomer.currency || 'USD';
    let deviceFp = currentCustomer.primaryDeviceFingerprint || `${currentCustomer.id}_trusted_device`;
    if (isCollusionDevice) {
      deviceFp = 'fp_shared_syndicate_ipad';
    } else if (isNewDevice) {
      deviceFp = 'fp_untrusted_linux_vm_99';
    }

    const ip = isLocationHop ? '185.220.101.5' : currentCustomer.usualIp || '198.51.100.15';
    const merchant = isBlacklistedMerchant ? 'mer_black_1' : selectedMerchantId;

    try {
      // Refresh live rules catalog so UI stays synced with Tab 2 (Rules Manager)
      api.rules.getAll().then((r) => r && setRulesCatalog(r)).catch(() => {});

      let latest: DecisionResponse | null = null;

      if (isVelocityBurst) {
        setBursting(true);
        // Flush user's Redis window first so the 6-request burst tests the exact selected persona cleanly
        await api.velocity.resetUserVelocity(currentCustomer.id).catch(() => {});

        const totalCalls = 6;
        let burstFired = false;
        for (let i = 1; i <= totalCalls; i++) {
          setBurstProgress({ current: i, total: totalCalls, fired: burstFired });
          const payload: TransactionRequest = {
            userId: currentCustomer.id,
            email: currentCustomer.email,
            amount: Number(amount),
            currency,
            merchantId: merchant,
            ipAddress: ip,
            deviceFingerprint: deviceFp,
          };
          latest = await api.transactions.evaluate(payload);
          if (
            latest?.ruleResults?.some((r) => r.ruleId === 'RULE_01' && r.triggered) ||
            latest?.firedRules?.some((r) => r.toUpperCase().includes('RULE_01'))
          ) {
            burstFired = true;
          }
          setBurstProgress({ current: i, total: totalCalls, fired: burstFired });
          await new Promise((r) => setTimeout(r, 80));
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

        latest = await api.transactions.evaluate(payload, enableIdempotency ? idempotencyKey : undefined);
      }

      if (latest) {
        setLastResult(latest);
        loadCustomerHistory(currentCustomer.id);
        api.customers.getAll().then((c) => c && c.length > 0 && setCustomers(c)).catch(() => {});

        // If RULE_07 actually triggered, fetch real 2-hop BFS graph evidence from GraphSyndicateService
        const rule07Fired =
          latest.ruleResults?.some((r) => r.ruleId === 'RULE_07' && r.triggered) ||
          latest.firedRules?.some((r) => r.toUpperCase().includes('RULE_07'));
        if (rule07Fired) {
          api.graph
            .getNetwork(currentCustomer.id)
            .then((graph) => setSyndicateGraph(graph))
            .catch(() => {});
        }
      }
    } catch (err: unknown) {
      console.error('Simulation error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown simulation error';
      setSimError(`Simulation failed: ${msg}`);
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
    isCollusionDevice,
    isVelocityBurst,
    enableIdempotency,
    idempotencyKey,
    loadCustomerHistory,
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

  // Build rule breakdown strictly from backend response (no hardcoded weights or guessed triggers)
  const ruleEvaluationMatrix = useMemo(() => {
    if (!lastResult) return [];

    if (lastResult.ruleResults && lastResult.ruleResults.length > 0) {
      return [...lastResult.ruleResults].sort((a, b) => a.ruleId.localeCompare(b.ruleId));
    }

    // Backwards-compatible fallback if ruleResults is omitted
    const fired = lastResult.firedRules || [];
    return rulesCatalog
      .filter((r) => r.isActive)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => {
        const match = fired.find((f) => f.toUpperCase().includes(r.id));
        return {
          ruleId: r.id,
          ruleName: r.name,
          triggered: Boolean(match),
          scoreContribution: match ? r.weight : 0,
          reason: match || 'Condition not met',
        };
      });
  }, [lastResult, rulesCatalog]);

  // Raw score sum & authoritative backend verdict
  const rawScoreSum = useMemo(() => {
    return ruleEvaluationMatrix.reduce((acc, r) => acc + (r.triggered ? r.scoreContribution : 0), 0);
  }, [ruleEvaluationMatrix]);

  const engineScore = lastResult?.finalScore ?? 0;
  const engineVerdict = lastResult?.decision ?? 'STANDBY';
  const maxSpend = currentCustomer.typicalSpendMax || 50;

  // Animated gauge rollup without stale closures
  useEffect(() => {
    if (!lastResult) {
      displayedScoreRef.current = 0;
      setDisplayedScore(0);
      return;
    }

    const target = engineScore;
    const start = displayedScoreRef.current;
    const duration = 250;
    const startTime = performance.now();
    let rafId = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * easeOut);
      displayedScoreRef.current = current;
      setDisplayedScore(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [engineScore, lastResult]);

  // Export real audit report
  const handleExportDocket = () => {
    if (!lastResult) return;
    const docket = {
      docketType: 'SENTINELX_FINANCIAL_CRIME_AUDIT_DOCKET',
      generatedAt: new Date().toISOString(),
      transactionId: lastResult.transactionId,
      decisionId: lastResult.decisionId,
      customerProfile: {
        userId: currentCustomer.id,
        name: currentCustomer.name,
        occupation: currentCustomer.occupation,
        riskTier: currentCustomer.riskSegment,
        historicalTransactionsInDatabase: currentCustomer.historicalTxnCount ?? 0,
        establishedTypicalSpend: `${formatCurrency(currentCustomer.typicalSpendMin || 0, currentCustomer.currency)} – ${formatCurrency(maxSpend, currentCustomer.currency)}`,
      },
      decisionSummary: {
        verdict: engineVerdict,
        finalScore: engineScore,
        rawPointsSum: rawScoreSum,
        wasScoreCappedAt100: rawScoreSum > 100,
        engineLatencyMs: lastResult.evaluationTimeMs,
      },
      ruleMatrix: ruleEvaluationMatrix,
      geminiReasoning: lastResult.geminiReasoning || null,
    };

    navigator.clipboard.writeText(JSON.stringify(docket, null, 2));
    setCopiedDocket(true);
    setTimeout(() => setCopiedDocket(false), 2500);
  };

  return (
    <div className="bg-[#151922] border border-slate-800/80 rounded-xl p-5 lg:p-6 space-y-6 text-white font-sans shadow-xl">
      {/* TOP HEADER */}
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
                LIVE BACKEND ENGINE
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              {customers.slice(0, 5).length} Customer Personas • {rulesCatalog.filter((r) => r.isActive).length || 7} Active Rules • Real-Time Scoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          {resetToast && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold animate-in fade-in">
              ✓ {resetToast}
            </span>
          )}

          <button
            type="button"
            onClick={() => resetPersonaState(currentCustomer.id, true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-[#1c222e] text-neutral-300 hover:text-white hover:border-slate-500 text-[11px] font-bold transition-all"
            title="Clear simulated transactions, untrusted devices, Redis counters, and temporary graph links for this persona"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            <span>RESET PERSONA STATE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !enableIdempotency;
              setEnableIdempotency(next);
              if (next) {
                setIdempotencyKey(`idemp_${crypto.randomUUID().slice(0, 8)}`);
              }
            }}
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

      {simError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-xs text-rose-200 font-mono flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-300 uppercase text-[10px]">Simulation Error</div>
            <div className="text-neutral-300 break-words">{simError}</div>
            <div className="text-neutral-400 mt-0.5">
              Ensure Spring Boot is running on http://localhost:8080 and Docker (Postgres :5433, Redis :6379) is up.
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: SELECT PERSONA */}
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs pb-1">
          <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
            <span>SELECT CUSTOMER PERSONA (ESTABLISHED HISTORICAL CONTEXT):</span>
          </div>
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="px-3 py-1.5 rounded-lg bg-[#1c222e] border border-slate-700 hover:border-cyan-400 text-[11px] text-cyan-300 font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>{showHistoryDrawer ? 'Hide Profile Baseline' : 'Inspect Profile & Stored Txns'}</span>
            {showHistoryDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {customers.slice(0, 5).map((c) => {
            const isSelected = c.id === selectedCustomerId;
            const cInitials = c.name.split(' ').map((n) => n[0]).join('').substring(0, 2);

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
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        c.riskSegment === 'LOW'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                          : c.riskSegment === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/50'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      {cInitials}
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        c.riskSegment === 'LOW'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : c.riskSegment === 'MEDIUM'
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {c.riskSegment} RISK
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white truncate">{c.name}</div>
                  <div className="text-[10px] text-neutral-300 font-sans truncate">{c.occupation}</div>
                  <div className="text-[10px] text-neutral-400 font-sans mt-0.5 truncate">{c.usualLocation?.split(',')[0]}</div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[10px]">
                  <div className="flex justify-between text-neutral-300">
                    <span className="text-neutral-400">Typical:</span>
                    <span className="text-white font-bold">
                      {formatCurrency(c.typicalSpendMin || 5, c.currency)} – {formatCurrency(c.typicalSpendMax || 50, c.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-cyan-300 font-bold">
                    <span className="text-neutral-400">Database:</span>
                    <span>{c.historicalTxnCount ?? 0} Stored Txns</span>
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
                <span>
                  CUSTOMER PROFILE BASELINE: {currentCustomer.name} ({currentCustomer.id})
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">PostgreSQL Profile Registry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#151922] p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase">Trusted Device &amp; OS:</span>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>{currentCustomer.primaryDevice || 'Registered Device'}</span>
                </div>
                <div className="text-[9px] text-neutral-500 font-mono truncate">
                  FP: {currentCustomer.primaryDeviceFingerprint}
                </div>
              </div>

              <div className="bg-[#151922] p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase">Home Subnet &amp; City:</span>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentCustomer.usualLocation}</span>
                </div>
                <div className="text-[9px] text-neutral-500 font-mono">
                  IP: {currentCustomer.usualIp || '198.51.100.15'}
                </div>
              </div>

              <div className="bg-[#151922] p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase">Established Normalcy:</span>
                <div className="font-bold text-white">
                  {formatCurrency(currentCustomer.typicalSpendMin || 5, currentCustomer.currency)} –{' '}
                  {formatCurrency(currentCustomer.typicalSpendMax || 50, currentCustomer.currency)}
                </div>
                <div className="text-[9px] text-emerald-400 font-bold">
                  {currentCustomer.historicalTxnCount ?? 0} Stored Records in PostgreSQL
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-neutral-400 uppercase block mb-1.5">
                LAST 3 TRANSACTIONS IN DATABASE:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-[#151922] p-2 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="font-bold text-white">{formatCurrency(tx.amount, tx.currency)}</div>
                        <div className="text-[9px] text-neutral-400 truncate max-w-[120px]">{tx.merchantId}</div>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                          tx.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                            : tx.status === 'REVIEW'
                            ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                            : 'bg-rose-950 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 text-[11px] italic col-span-3">
                    No transactions loaded from backend for {currentCustomer.name}.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: CHOOSE SITUATION OR CUSTOMIZE PARAMETERS */}
      <div className="space-y-3 font-mono bg-[#1c222e]/60 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs pb-1">
          <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">2</span>
            <span>CHOOSE OR CUSTOMIZE TRANSACTION SITUATION:</span>
          </div>
          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activeScenario === 'CUSTOM' ? 'CUSTOM PARAMETERS' : '1-CLICK SCENARIO PRESETS'}</span>
          </span>
        </div>

        {/* 5 Narrative Preset Story Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
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
              Typical spend on registered device from home IP at retail merchant.
            </p>
            <span className="text-[9px] mt-2 text-emerald-400 font-bold uppercase">Tests: Baseline Normalcy</span>
          </button>

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
              7× spend spike on an unrecognized device from foreign proxy IP.
            </p>
            <span className="text-[9px] mt-2 text-rose-400 font-bold uppercase">Tests: RULE_02 + 03 + 04</span>
          </button>

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
              Sends 6 rapid transactions for this persona to trigger Redis rate limit.
            </p>
            <span className="text-[9px] mt-2 text-purple-400 font-bold uppercase">Tests: RULE_01 (Redis ZSET)</span>
          </button>

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
              Normal spend routed to sanctioned DarkMixer Escrow (mer_black_1).
            </p>
            <span className="text-[9px] mt-2 text-rose-400 font-bold uppercase">Tests: RULE_05 Blacklist</span>
          </button>

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
              Uses shared burner hardware linked to a banned syndicate account.
            </p>
            <span className="text-[9px] mt-2 text-cyan-400 font-bold uppercase">Tests: RULE_07 (2-Hop BFS)</span>
          </button>
        </div>

        {/* EDITABLE TRANSACTION PARAMETERS & SIDE-BY-SIDE DIFF */}
        <div className="mt-3 bg-[#151922] border border-slate-800 rounded-xl p-3.5 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-neutral-300 font-bold uppercase flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>INCOMING TRANSACTION PAYLOAD (BASELINE VS. ATTEMPT):</span>
            </span>
            <span className="text-[10px] text-neutral-400">Edit any field to test custom behavior</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
            {/* Amount Input & Diff */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="sim-amount-input" className="text-[10px] text-neutral-400 uppercase">
                  Amount ({currentCustomer.currency})
                </label>
                <span className="text-[10px] text-neutral-400 font-sans">Max: {formatCurrency(maxSpend, currentCustomer.currency)}</span>
              </div>
              <input
                id="sim-amount-input"
                type="number"
                min={0.01}
                step="any"
                value={amount}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  setAmount(val);
                  setActiveScenario('CUSTOM');
                }}
                className="w-full bg-[#151922] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
              />
              {amount > maxSpend * 2.5 ? (
                <span className="text-[9px] text-rose-400 font-bold uppercase block">🔴 Extreme Spike (&gt;2.5× max)</span>
              ) : amount > maxSpend ? (
                <span className="text-[9px] text-amber-400 font-bold uppercase block">🟡 Elevated (&gt;typical max)</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-bold uppercase block">🟢 Within Normal Limit</span>
              )}
            </div>

            {/* Merchant Selector */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800 space-y-1.5">
              <label htmlFor="sim-merchant-select" className="text-[10px] text-neutral-400 uppercase block">
                Receiving Merchant
              </label>
              <select
                id="sim-merchant-select"
                value={isBlacklistedMerchant ? 'mer_black_1' : selectedMerchantId}
                onChange={(e) => {
                  const mId = e.target.value;
                  setSelectedMerchantId(mId);
                  setIsBlacklistedMerchant(mId === 'mer_black_1');
                  setActiveScenario('CUSTOM');
                }}
                className="w-full bg-[#151922] border border-slate-700 rounded px-2 py-1 text-xs font-sans text-white focus:outline-none focus:border-blue-500"
              >
                {MERCHANTS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {isBlacklistedMerchant ? (
                <span className="text-[9px] text-rose-400 font-bold uppercase block">⛔ Sanctioned Watchlist</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-bold uppercase block">🟢 Verified Merchant</span>
              )}
            </div>

            {/* Device Selector */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800 space-y-1.5">
              <label htmlFor="sim-device-select" className="text-[10px] text-neutral-400 uppercase block">
                Device Fingerprint
              </label>
              <select
                id="sim-device-select"
                value={isCollusionDevice ? 'COLLUSION' : isNewDevice ? 'NEW' : 'TRUSTED'}
                onChange={(e) => {
                  const mode = e.target.value;
                  setIsNewDevice(mode === 'NEW');
                  setIsCollusionDevice(mode === 'COLLUSION');
                  setActiveScenario('CUSTOM');
                }}
                className="w-full bg-[#151922] border border-slate-700 rounded px-2 py-1 text-xs font-sans text-white focus:outline-none focus:border-blue-500"
              >
                <option value="TRUSTED">{currentCustomer.primaryDevice || 'Registered Device'} (Trusted)</option>
                <option value="NEW">Unknown Linux VM (Untrusted)</option>
                <option value="COLLUSION">Shared Syndicate Tablet (Fraud Ring)</option>
              </select>
              {isCollusionDevice ? (
                <span className="text-[9px] text-cyan-400 font-bold uppercase block">🕸️ Syndicate Shared HW</span>
              ) : isNewDevice ? (
                <span className="text-[9px] text-amber-400 font-bold uppercase block">⚠️ New Untrusted Device</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-bold uppercase block">🟢 Trusted Hardware</span>
              )}
            </div>

            {/* IP & Velocity Toggles */}
            <div className="bg-[#1c222e] p-2.5 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-neutral-400 uppercase block">Network &amp; Velocity</span>
              <div className="flex flex-col gap-1.5 pt-0.5">
                <label className="flex items-center gap-2 text-[11px] text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLocationHop}
                    onChange={(e) => {
                      setIsLocationHop(e.target.checked);
                      setActiveScenario('CUSTOM');
                    }}
                    className="accent-rose-500"
                  />
                  <span>Foreign Proxy IP (185.220.101.5)</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVelocityBurst}
                    onChange={(e) => {
                      setIsVelocityBurst(e.target.checked);
                      setActiveScenario('CUSTOM');
                    }}
                    className="accent-purple-500"
                  />
                  <span>6× Rapid Velocity Burst</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* VELOCITY BURST PROGRESS INDICATOR */}
        {bursting && burstProgress && (
          <div className="bg-[#151922] border border-purple-500/50 rounded-xl p-3 space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300 font-bold flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  EXECUTING REDIS SLIDING WINDOW BURST [{burstProgress.current}/{burstProgress.total}]
                </span>
              </span>
              <span className={`text-[10px] font-bold ${burstProgress.fired ? 'text-rose-400' : 'text-emerald-400'}`}>
                {burstProgress.fired ? '⚠️ THRESHOLD BREACHED (RULE_01 FIRED)' : 'UNDER RATE LIMIT'}
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
              {lastResult.evaluationTimeMs < 50 ? (
                <span className="text-[10px] text-emerald-400 font-bold">SLA &lt;50ms MET ✓</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-500/50">
                  SLA &gt;50ms MISSED
                </span>
              )}
            </div>
          )}
        </div>

        {/* DECISION SUMMARY BANNER & SCORE GAUGE */}
        {lastResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Large Verdict Box */}
            <div
              className={`lg:col-span-8 p-5 rounded-xl border flex flex-col justify-between ${
                engineVerdict === 'ALLOW'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                  : engineVerdict === 'REVIEW'
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/40'
                  : 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                    BACKEND ENGINE VERDICT:
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-3xl font-black uppercase tracking-wider ${
                        engineVerdict === 'ALLOW'
                          ? 'text-emerald-400'
                          : engineVerdict === 'REVIEW'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {engineVerdict}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                        engineVerdict === 'ALLOW'
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500'
                          : engineVerdict === 'REVIEW'
                          ? 'bg-amber-900/60 text-amber-300 border border-amber-500'
                          : 'bg-rose-900/60 text-rose-300 border border-rose-500'
                      }`}
                    >
                      {engineVerdict === 'ALLOW'
                        ? 'Clean Checkout Approved'
                        : engineVerdict === 'REVIEW'
                        ? 'Held for Manual Analyst Review'
                        : 'Fraud Intercepted'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 uppercase">Transaction ID:</span>
                  <div className="text-xs font-bold text-cyan-300 font-mono">{lastResult.transactionId}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Evaluated in {lastResult.evaluationTimeMs}ms</div>
                </div>
              </div>

              {/* POINTS BREAKDOWN PILL */}
              <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-neutral-400">Score Composition:</span>
                {ruleEvaluationMatrix.filter((r) => r.triggered).length === 0 ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40">
                    0 Rules Triggered (+0 pts)
                  </span>
                ) : (
                  ruleEvaluationMatrix
                    .filter((r) => r.triggered)
                    .map((r) => (
                      <span
                        key={r.ruleId}
                        className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold border border-slate-700"
                      >
                        {r.ruleId}: +{r.scoreContribution} pts
                      </span>
                    ))
                )}
                {rawScoreSum > 100 && (
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500 font-bold">
                    Capped at 100 (Raw: {rawScoreSum} pts)
                  </span>
                )}
              </div>

              {/* REAL ENGINE SUMMARY / GEMINI REASONING */}
              <div className="mt-3 p-3 rounded-lg bg-[#151922]/80 border border-slate-800 text-xs text-neutral-300 leading-relaxed font-sans">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[10px] uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lastResult.geminiReasoning ? 'Gemini AI Copilot Reasoning:' : 'Rule Engine Decision Summary:'}</span>
                </div>
                {lastResult.geminiReasoning ? (
                  <p>{lastResult.geminiReasoning}</p>
                ) : ruleEvaluationMatrix.some((r) => r.triggered) ? (
                  <p>
                    {ruleEvaluationMatrix
                      .filter((r) => r.triggered)
                      .map((r) => r.reason)
                      .join(' • ')}
                  </p>
                ) : (
                  <p>
                    All {ruleEvaluationMatrix.length} active fraud detection strategies passed cleanly for {currentCustomer.name} with 0 risk penalty.
                  </p>
                )}
              </div>
            </div>

            {/* Radial Score Gauge */}
            <div className="lg:col-span-4 bg-[#1c222e] border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] text-neutral-400 uppercase mb-1 font-bold">AGGREGATE RISK SCORE</span>
              <div className="relative w-44 h-24 flex items-end justify-center">
                <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
                  <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="#11141a" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 15 80 A 65 65 0 0 1 60 28" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
                  <path d="M 60 28 A 65 65 0 0 1 100 28" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
                  <path d="M 100 28 A 65 65 0 0 1 145 80" fill="none" stroke="#f43f5e" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
                </svg>
                <div className="absolute bottom-0 flex flex-col items-center">
                  <span
                    className={`text-3xl font-black font-mono ${
                      displayedScore < 30 ? 'text-emerald-400' : displayedScore < 70 ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {displayedScore}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">/ 100 PTS</span>
                </div>
              </div>

              <div className="text-[11px] font-mono mt-2 text-center">
                <span className="text-white font-bold">{engineScore} / 100</span>
                {rawScoreSum > 100 && (
                  <span className="text-amber-400 text-[10px] block">Raw: {rawScoreSum} pts (capped at 100)</span>
                )}
              </div>
              <div className="text-[9px] text-neutral-400 mt-1 text-center font-sans">
                &lt;30 ALLOW • 30–69 REVIEW • &ge;70 BLOCK
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[#1c222e] border border-slate-800 text-center space-y-2">
            <Activity className="w-8 h-8 text-neutral-500 mx-auto animate-pulse" />
            <div className="text-white font-bold text-sm">DECISION PIPELINE STANDBY</div>
            <p className="text-xs text-neutral-400 font-sans max-w-md mx-auto">
              Select a customer persona above and choose or customize a situation, then click &apos;SIMULATE TRANSACTION&apos; to run the real-time backend scoring engine.
            </p>
          </div>
        )}

        {/* REAL BACKEND RULE MATRIX BREAKDOWN */}
        {lastResult && (
          <div className="bg-[#1c222e] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>PRODUCTION RULE MATRIX BREAKDOWN ({ruleEvaluationMatrix.length} ACTIVE RULES EVALUATED):</span>
              </span>
              <span className="text-[10px] text-neutral-300 font-bold">
                {ruleEvaluationMatrix.filter((r) => r.triggered).length} of {ruleEvaluationMatrix.length} Rules Triggered
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {ruleEvaluationMatrix.map((rule) => (
                <div
                  key={rule.ruleId}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                        rule.triggered
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      }`}
                    >
                      {rule.triggered ? `+${rule.scoreContribution} PTS` : '+0 PTS'}
                    </span>
                    <div>
                      <div className="font-bold text-white">
                        {rule.ruleId}: {rule.ruleName}
                      </div>
                      <p className="text-[11px] text-neutral-300 font-sans mt-0.5">{rule.reason}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase shrink-0 self-start sm:self-auto px-2 py-0.5 rounded ${
                      rule.triggered
                        ? 'text-rose-300 bg-rose-950 border border-rose-600/50'
                        : 'text-emerald-300 bg-emerald-950 border border-emerald-600/50'
                    }`}
                  >
                    {rule.triggered ? '🔴 TRIGGERED' : '🟢 CLEARED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REAL 2-HOP GRAPH COLLUSION EVIDENCE (ONLY WHEN RULE_07 ACTUALLY TRIGGERED) */}
        {lastResult && syndicateGraph?.syndicateAnalysis?.syndicateDetected && (
          <div className="bg-[#1c222e] border border-cyan-500/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>2-HOP BFS GRAPH TRAVERSAL SYNDICATE EVIDENCE:</span>
              </span>
              <span className="text-[10px] text-rose-400 font-bold uppercase">
                {syndicateGraph.syndicateAnalysis.degreesOfSeparation}-HOP COLLUSION DETECTED (RULE_07)
              </span>
            </div>
            <div className="p-3 bg-[#151922] rounded-lg border border-slate-800 flex items-center justify-center gap-3 text-xs flex-wrap">
              <span className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-bold">
                User: {currentCustomer.id}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold">
                {syndicateGraph.syndicateAnalysis.sharedEntityType || 'Shared'}: {syndicateGraph.syndicateAnalysis.sharedEntityId}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-bold">
                Blocked Node: {syndicateGraph.syndicateAnalysis.connectedBlockedUserId}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* GLOBAL ACTIONS: SIMULATE, RESET & EXPORT */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectCustomer(selectedCustomerId)}
            className="px-4 py-2.5 rounded-lg bg-[#1c222e] hover:bg-slate-700 text-neutral-300 border border-slate-700/80 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET SITUATION</span>
          </button>
        </div>

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
