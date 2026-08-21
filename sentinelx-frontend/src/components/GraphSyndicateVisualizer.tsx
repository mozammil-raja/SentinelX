'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, GraphNetworkResponse } from '@/lib/api';
import {
  Share2,
  ShieldAlert,
  Smartphone,
  Globe,
  CreditCard,
  User as UserIcon,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Network,
} from 'lucide-react';

export function GraphSyndicateVisualizer() {
  const [userId, setUserId] = useState('usr_1001');
  const [network, setNetwork] = useState<GraphNetworkResponse | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'USER' | 'DEVICE' | 'IP' | 'CARD'>('ALL');

  const fetchGraphData = useCallback(async (targetUser: string) => {
    setLoading(true);
    try {
      const [netData, sumData] = await Promise.all([
        api.graph.getNetwork(targetUser),
        api.graph.getSummary(),
      ]);
      setNetwork(netData);
      setSummary(sumData);
    } catch (err) {
      console.error('Failed to load graph network:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const [netData, sumData] = await Promise.all([
          api.graph.getNetwork(userId),
          api.graph.getSummary(),
        ]);
        if (!ignore) {
          setNetwork(netData);
          setSummary(sumData);
        }
      } catch (err) {
        if (!ignore) console.error('Failed to load graph network:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [userId]);

  const filteredNodes = network?.nodes.filter((node) => {
    if (activeFilter === 'ALL') return true;
    return node.type === activeFilter;
  }) || [];

  return (
    <div className="space-y-5">
      {/* Header & Global Stats */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-pink-950/80 border border-pink-700/50 text-pink-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Graph Syndicate &amp; Fraud Ring Explorer
              </h2>
              <p className="text-xs text-slate-400">
                2-Hop BFS graph traversal analyzing shared devices, IPs, and payment cards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Search user (e.g. usr_1001)..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
            <button
              onClick={() => fetchGraphData(userId)}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh graph"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Summary Mini-Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Entities</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-slate-100">{summary?.totalNodes ?? 0}</span>
              <Network className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Users</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-blue-400">{summary?.totalUsers ?? 0}</span>
              <UserIcon className="w-4 h-4 text-blue-500/70" />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Devices</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-purple-400">{summary?.totalDevices ?? 0}</span>
              <Smartphone className="w-4 h-4 text-purple-500/70" />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">IP Nodes</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-cyan-400">{summary?.totalIps ?? 0}</span>
              <Globe className="w-4 h-4 text-cyan-500/70" />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Banned Nodes</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-red-400">{summary?.blockedUsersCount ?? 0}</span>
              <ShieldAlert className="w-4 h-4 text-red-500/70" />
            </div>
          </div>
        </div>
      </div>

      {/* Syndicate Detection Alert Banner */}
      {network?.syndicateAnalysis?.syndicateDetected ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span>Syndicate Fraud Ring Detected — RULE_07 Triggered (+75 pts)</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {network.syndicateAnalysis.explanation}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700/50">
              Connected Fraudster: {network.syndicateAnalysis.connectedBlockedUserId}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
              Shared Infrastructure: {network.syndicateAnalysis.sharedEntityId}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
              Degrees of Separation: {network.syndicateAnalysis.degreesOfSeparation} Hops
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Graph Analysis: No 2-hop connections to known blocked fraudsters found for this account.</span>
        </div>
      )}

      {/* Node-Link Network Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Node Explorer */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Network className="w-4 h-4 text-pink-400" />
              Connected Sub-Graph Nodes ({filteredNodes.length})
            </h3>
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
              {(['ALL', 'USER', 'DEVICE', 'IP', 'CARD'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    activeFilter === filter
                      ? 'bg-pink-900/80 text-pink-200 border border-pink-700/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {filteredNodes.map((node) => {
              const isBlocked = node.isBlocked;
              const isFocus = node.id.includes(userId);

              return (
                <div
                  key={node.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                    isBlocked
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : isFocus
                      ? 'bg-pink-950/30 border-pink-600/70 text-pink-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-md ${
                        node.type === 'USER'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800/50'
                          : node.type === 'DEVICE'
                          ? 'bg-purple-950 text-purple-400 border border-purple-800/50'
                          : node.type === 'IP'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {node.type === 'USER' && <UserIcon className="w-3.5 h-3.5" />}
                      {node.type === 'DEVICE' && <Smartphone className="w-3.5 h-3.5" />}
                      {node.type === 'IP' && <Globe className="w-3.5 h-3.5" />}
                      {node.type === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold truncate">{node.label}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{node.type.toLowerCase()} Node</div>
                    </div>
                  </div>

                  {isBlocked ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-900/80 border border-red-700 text-[10px] font-bold text-red-200 shrink-0">
                      BLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      Score: {node.riskScore || 0}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Relationship Links Matrix */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-400" />
            Observed Graph Edges ({network?.edges.length || 0})
          </h3>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {network?.edges.map((edge, idx) => (
              <div
                key={`${edge.source}-${edge.target}-${idx}`}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                  <span className="text-pink-400 font-semibold">{edge.relationship}</span>
                  <span>Weight: {edge.weight}</span>
                </div>
                <div className="text-slate-300 truncate text-[11px]">
                  <span className="text-blue-300">{edge.source}</span>
                  <span className="text-slate-500 mx-1.5">──►</span>
                  <span className="text-purple-300">{edge.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
