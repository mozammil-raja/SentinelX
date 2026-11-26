'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  api,
  CustomerProfile,
  TransactionResponse,
  RiskRecalculationResult,
} from '@/lib/api';
import {
  Database,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  return `${symbol} ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function riskBadgeClass(segment: string): string {
  switch (segment) {
    case 'LOW':
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
    case 'MEDIUM':
      return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
    case 'HIGH':
      return 'bg-orange-950/80 text-orange-400 border-orange-500/40';
    default:
      return 'bg-rose-950/80 text-rose-400 border-rose-500/40';
  }
}

export function TransactionLedger() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [recalcResults, setRecalcResults] = useState<RiskRecalculationResult[] | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'REVIEW' | 'BLOCKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [recalculating, setRecalculating] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custData, txData] = await Promise.all([
        api.customers.getAll(),
        api.transactions.getRecent(page, 50, selectedUserId === 'ALL' ? undefined : selectedUserId),
      ]);
      setCustomers(custData || []);
      setTransactions(txData || []);
    } catch (err) {
      console.error('Failed to load transaction ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      const results = await api.customers.recalculateAllRisk();
      setRecalcResults(results);
      await loadData();
    } catch (err) {
      console.error('Failed to recalculate risk tiers:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          tx.id.toLowerCase().includes(q) ||
          tx.userId.toLowerCase().includes(q) ||
          tx.merchantId.toLowerCase().includes(q) ||
          (tx.ipAddress || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  const primaryPersonas = customers.slice(0, 5);

  return (
    <div className="space-y-5 font-mono text-white">
      {/* Header + Recalculate All Button */}
      <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                  TRANSACTION_LEDGER // ADAPTIVE_USER_RISK_TIERING
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-bold">
                  POSTGRESQL AUDIT
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Every stored transaction (seeded + live simulated). Recalculate all 5 personas&apos; risk tiers from their last 10 transactions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg bg-[#151922] hover:bg-slate-700 border border-slate-700/80 text-neutral-200 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleRecalculateAll}
              disabled={recalculating}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md shadow-blue-900/40 disabled:opacity-50"
            >
              {recalculating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{recalculating ? 'RECALCULATING...' : 'RECALCULATE RISK (ALL 5 PERSONAS)'}</span>
            </button>
          </div>
        </div>

        {/* 5 Persona Adaptive Risk Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {primaryPersonas.map((c) => {
            const recalc = recalcResults?.find((r) => r.userId === c.id);
            const isSelected = selectedUserId === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(isSelected ? 'ALL' : c.id);
                  setPage(0);
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-[#151922] border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{c.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${riskBadgeClass(c.riskSegment)}`}>
                    {c.riskSegment}
                  </span>
                </div>

                <div className="text-[10px] text-neutral-400 flex justify-between">
                  <span>Stored Txns:</span>
                  <span className="text-cyan-300 font-bold">{c.historicalTxnCount ?? 0}</span>
                </div>

                {recalc && (
                  <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[10px]">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`px-1 rounded border text-[9px] font-bold ${riskBadgeClass(recalc.previousRiskSegment)}`}>
                        {recalc.previousRiskSegment}
                      </span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                      <span className={`px-1 rounded border text-[9px] font-bold ${riskBadgeClass(recalc.newRiskSegment)}`}>
                        {recalc.newRiskSegment}
                      </span>
                      {recalc.changed ? (
                        <span className="text-amber-400 font-bold text-[9px]">UPDATED</span>
                      ) : (
                        <span className="text-neutral-500 text-[9px]">UNCHANGED</span>
                      )}
                    </div>
                    <div className="text-[9px] text-neutral-400 font-sans leading-snug">
                      Last {recalc.recentWindowSize}: {recalc.recentApprovedCount} OK / {recalc.recentReviewCount} REV / {recalc.recentBlockedCount} BLK (avg {recalc.recentAverageScore})
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Recalculation Summary Banner */}
        {recalcResults && (
          <div className="p-3 rounded-lg bg-[#151922] border border-cyan-500/40 text-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Evaluated last 10 transactions per persona:{' '}
                {recalcResults.filter((r) => r.changed).length} tier change(s) saved to PostgreSQL (active immediately in RULE_06).
              </span>
            </div>
            <span className="text-[10px] text-neutral-400">
              Thresholds: &ge;4 BLK or &ge;65 avg = CRITICAL • &ge;2 BLK or &ge;35 avg = HIGH • &ge;1 flagged or &ge;15 avg = MEDIUM • else LOW
            </span>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-neutral-400 uppercase font-bold">Persona:</span>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setPage(0);
              }}
              className="bg-[#151922] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Customers</option>
              {primaryPersonas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.riskSegment})
                </option>
              ))}
            </select>

            <span className="text-neutral-400 uppercase font-bold ml-2">Status:</span>
            {(['ALL', 'APPROVED', 'REVIEW', 'BLOCKED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-[#151922] text-neutral-400 border-slate-800 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, merchant, IP..."
              className="w-full bg-[#151922] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto rounded-xl border border-slate-800 bg-[#151922]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#11141a] text-neutral-400 sticky top-0 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">STATUS</th>
                <th className="p-3">TXN ID</th>
                <th className="p-3">CUSTOMER</th>
                <th className="p-3">AMOUNT</th>
                <th className="p-3">MERCHANT</th>
                <th className="p-3">IP ADDRESS</th>
                <th className="p-3">DEVICE</th>
                <th className="p-3 text-right">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-500 font-sans">
                    No matching transactions found on page {page + 1}.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSimulated = !tx.id.startsWith('txn_hist_');
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            tx.status === 'APPROVED'
                              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                              : tx.status === 'REVIEW'
                              ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                              : 'bg-rose-950/80 border-rose-500/40 text-rose-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-300 font-bold">{tx.id}</span>
                          {isSimulated && (
                            <span className="text-[9px] px-1 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                              SIM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-white font-semibold">{tx.userId}</td>
                      <td className="p-3 whitespace-nowrap text-white font-bold">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="p-3 whitespace-nowrap text-neutral-300">{tx.merchantId}</td>
                      <td className="p-3 whitespace-nowrap text-neutral-300">{tx.ipAddress}</td>
                      <td className="p-3 whitespace-nowrap text-neutral-400 max-w-[160px] truncate">
                        {tx.deviceFingerprint || '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap text-right text-neutral-400 text-[11px]">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-neutral-400">
            Showing {filteredTransactions.length} transactions (Page {page + 1})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-[#151922] border border-slate-700 text-neutral-300 hover:text-white disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>PREV</span>
            </button>
            <button
              type="button"
              disabled={transactions.length < 50 || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-[#151922] border border-slate-700 text-neutral-300 hover:text-white disabled:opacity-40 flex items-center gap-1"
            >
              <span>NEXT</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
