'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, GraphNetworkResponse } from '@/lib/api';
import {
  Network,
  ShieldAlert,
  Smartphone,
  Globe,
  CreditCard,
  User as UserIcon,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export function GraphSyndicateVisualizer() {
  const [userId, setUserId] = useState('usr_sarah');
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
    <div className="space-y-4 font-mono">
      {/* Header & Global Stats */}
      <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
              <Network className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  GRAPH_INTELLIGENCE // SYNDICATE_FRAUD_RING_TRAVERSAL
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                2-Hop BFS bipartite graph traversal analyzing shared devices, IP subnets, and payment instruments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Search Account ID (e.g. usr_sarah)..."
                className="w-full bg-[#090C10] border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
            <button
              onClick={() => fetchGraphData(userId)}
              className="p-1.5 rounded border border-slate-800 bg-[#090C10] hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh graph"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Summary Mini-Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">TOTAL_ENTITIES</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-slate-100">{summary?.totalNodes ?? 0}</span>
              <Network className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">USER_NODES</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-blue-400">{summary?.totalUsers ?? 0}</span>
              <UserIcon className="w-3.5 h-3.5 text-blue-500/70" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">HARDWARE_FPS</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-slate-200">{summary?.totalDevices ?? 0}</span>
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">IP_SUBNETS</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-cyan-400">{summary?.totalIps ?? 0}</span>
              <Globe className="w-3.5 h-3.5 text-cyan-500/70" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#090C10] border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">SANCTIONED_NODES</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-red-400">{summary?.blockedUsersCount ?? 0}</span>
              <ShieldAlert className="w-3.5 h-3.5 text-red-500/70" />
            </div>
          </div>
        </div>
      </div>

      {/* Syndicate Detection Alert Banner */}
      {network?.syndicateAnalysis?.syndicateDetected ? (
        <div className="p-3.5 rounded bg-[#1A0B0B] border border-red-800/80 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-red-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>[CRITICAL_SYNDICATE_DETECTED] RULE_07 TRIGGERED (+75 PTS)</span>
          </div>
          <p className="text-slate-300 font-sans leading-relaxed">
            {network.syndicateAnalysis.explanation}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60">
              CONNECTED_FRAUDSTER: {network.syndicateAnalysis.connectedBlockedUserId}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#090C10] text-slate-300 border border-slate-800">
              SHARED_INFRASTRUCTURE: {network.syndicateAnalysis.sharedEntityId}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#090C10] text-slate-300 border border-slate-800">
              DEGREES_OF_SEPARATION: {network.syndicateAnalysis.degreesOfSeparation} HOPS
            </span>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded bg-[#0B1A14] border border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>GRAPH_TRAVERSAL_CLEAN: No 2-hop connections to known sanctioned entities detected.</span>
        </div>
      )}

      {/* Node-Link Network Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Node Explorer */}
        <div className="lg:col-span-2 bg-[#0E1219] border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-blue-400" />
              <span>CONNECTED_SUBGRAPH_NODES ({filteredNodes.length})</span>
            </h3>
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#090C10] p-0.5 rounded border border-slate-800 text-[10px]">
              {(['ALL', 'USER', 'DEVICE', 'IP', 'CARD'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    activeFilter === filter
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredNodes.map((node) => {
              const isBlocked = node.isBlocked;
              const isFocus = node.id.includes(userId);

              return (
                <div
                  key={node.id}
                  className={`p-2.5 rounded border flex items-center justify-between gap-2 transition-colors ${
                    isBlocked
                      ? 'bg-red-950/30 border-red-800/80 text-red-200'
                      : isFocus
                      ? 'bg-blue-950/30 border-blue-600/80 text-blue-200'
                      : 'bg-[#090C10] border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                      {node.type === 'USER' && <UserIcon className="w-3.5 h-3.5" />}
                      {node.type === 'DEVICE' && <Smartphone className="w-3.5 h-3.5" />}
                      {node.type === 'IP' && <Globe className="w-3.5 h-3.5" />}
                      {node.type === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{node.label}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{node.type} NODE</div>
                    </div>
                  </div>

                  {isBlocked ? (
                    <span className="px-1.5 py-0.2 rounded bg-red-950 text-[10px] font-bold text-red-300 border border-red-800/80 shrink-0">
                      BLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 shrink-0">
                      SCORE: {node.riskScore || 0}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Relationship Links Matrix */}
        <div className="bg-[#0E1219] border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="pb-1 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span>OBSERVED_EDGES ({network?.edges.length || 0})</span>
            </h3>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {network?.edges.map((edge, idx) => (
              <div
                key={`${edge.source}-${edge.target}-${idx}`}
                className="p-2 rounded bg-[#090C10] border border-slate-800 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                  <span className="text-blue-400 font-semibold">{edge.relationship}</span>
                  <span>WEIGHT: {edge.weight}</span>
                </div>
                <div className="text-slate-300 truncate text-[11px]">
                  <span className="text-slate-200">{edge.source}</span>
                  <span className="text-slate-600 mx-1.5">──►</span>
                  <span className="text-slate-400">{edge.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
